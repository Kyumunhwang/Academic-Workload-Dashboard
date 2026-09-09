'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { useGrade, VIEW_MODES } from '@/context/GradeContext';
import EventDetailModal from '@/components/EventDetailModal';
import { CheckCircle2, AlertCircle, RefreshCw, Calendar as CalendarIcon, List } from 'lucide-react';

const LOCAL_STORAGE_CACHE_KEY = 'academic_calendar_cache_v1';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

/**
 * WorkloadAnalyzer Utility:
 * Aggregates events by date (YYYY-MM-DD).
 */
export function getWorkloadMap(eventsList, viewMode = VIEW_MODES.SINGLE) {
  const map = {};

  if (!Array.isArray(eventsList)) return map;

  eventsList.forEach((ev) => {
    let dateKey = ev.date;
    if (!dateKey && ev.start instanceof Date) {
      dateKey = format(ev.start, 'yyyy-MM-dd');
    }
    if (!dateKey) return;

    if (!map[dateKey]) {
      map[dateKey] = {
        count: 0,
        isOverloaded: false,
        overloadedGrades: [],
        byGrade: {},
        items: [],
      };
    }

    const dayObj = map[dateKey];
    dayObj.items.push(ev);
    dayObj.count += 1;

    const grade = ev.resource?.grade || 'General';
    dayObj.byGrade[grade] = (dayObj.byGrade[grade] || 0) + 1;

    if (viewMode === VIEW_MODES.ALL) {
      const overloaded = Object.entries(dayObj.byGrade)
        .filter(([_, count]) => count >= 3)
        .map(([g]) => g);
      dayObj.overloadedGrades = overloaded;
      dayObj.isOverloaded = overloaded.length > 0;
    } else {
      if (dayObj.count >= 3) {
        dayObj.isOverloaded = true;
      }
    }
  });

  return map;
}

export default function CalendarBoard() {
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  // View state: 'month' (default for desktop) or 'agenda' (default for mobile)
  const [currentView, setCurrentView] = useState('month');

  // Modal State for Edit/Delete
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Subscribe to global grade and mode state from GradeContext
  const { selectedGrade, viewMode } = useGrade();

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  /**
   * SWR Fetch Handler:
   * Revalidates data in background while instantly serving cached data to UI
   */
  const fetchCalendarData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      } else {
        setIsBackgroundSyncing(true);
      }
      setError(null);

      const response = await fetch('/api/calendar');
      if (!response.ok) {
        throw new Error(`Failed to fetch events (HTTP ${response.status})`);
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setEvents(result.data);
        try {
          localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(result.data));
        } catch (e) {
          // ignore storage quota issues
        }
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('[CalendarBoard Fetch Error]:', err);
      if (!isBackground) {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
      setIsBackgroundSyncing(false);
    }
  }, []);

  // Initial Stale-While-Revalidate bootstrap & Mobile Auto-detection
  useEffect(() => {
    setMounted(true);

    // Auto-detect mobile screen on load to default to touch-friendly Agenda View
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setCurrentView('agenda');
    }

    let hasLocalCache = false;
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEvents(parsed);
          hasLocalCache = true;
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    fetchCalendarData(hasLocalCache);
  }, [fetchCalendarData]);

  // Handle Event Selection to open modal
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // Handle Event Update
  const handleUpdateEvent = useCallback(
    async (updatedData) => {
      const response = await fetch('/api/calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to update event.');
      }

      showNotification('success', 'Event successfully updated and synced with Google Sheets.');
      await fetchCalendarData(true);
    },
    [fetchCalendarData, showNotification]
  );

  // Handle Event Deletion
  const handleDeleteEvent = useCallback(
    async (deleteData) => {
      const response = await fetch('/api/calendar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteData),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to delete event.');
      }

      showNotification('success', 'Event permanently deleted and row removed from Google Sheets.');
      await fetchCalendarData(true);
    },
    [fetchCalendarData, showNotification]
  );

  // Filter events matching active mode (Single-Class vs All-Classes)
  const filteredEvents = useMemo(() => {
    const list =
      viewMode === VIEW_MODES.ALL
        ? events
        : events.filter((item) => item.grade === selectedGrade);

    return list.map((item) => {
      const [year, month, day] = item.date.split('-').map(Number);
      const startDate = new Date(year, month - 1, day, 9, 0);
      const endDate = new Date(year, month - 1, day, 17, 0);

      const gradePrefix =
        viewMode === VIEW_MODES.ALL
          ? `[${item.grade?.replace('Grade ', 'G') || item.rawGrade || 'All'}] `
          : '';

      return {
        id: item.id,
        title: `${gradePrefix}[${item.subject}] ${item.description || item.type}`,
        date: item.date,
        start: startDate,
        end: endDate,
        allDay: true,
        resource: item,
      };
    });
  }, [events, selectedGrade, viewMode]);

  // Compute workload map for currently filtered events
  const workloadMap = useMemo(() => {
    return getWorkloadMap(filteredEvents, viewMode);
  }, [filteredEvents, viewMode]);

  // Count total overloaded days
  const overloadedDaysCount = useMemo(() => {
    return Object.values(workloadMap).filter((info) => info.isOverloaded).length;
  }, [workloadMap]);

  // Dynamic styling based on event type
  const eventPropGetter = useCallback((event) => {
    const type = event.resource?.type;

    switch (type) {
      case 'Homework':
        return {
          className: '!bg-blue-100 !text-blue-800 !border-blue-300 font-medium hover:!bg-blue-200 cursor-pointer transition-colors',
          style: {
            backgroundColor: '#dbeafe',
            color: '#1e40af',
            borderColor: '#93c5fd',
          },
        };
      case 'Project':
        return {
          className: '!bg-green-100 !text-green-800 !border-green-300 font-medium hover:!bg-green-200 cursor-pointer transition-colors',
          style: {
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderColor: '#86efac',
          },
        };
      case 'Exam':
        return {
          className: '!bg-red-100 !text-red-800 !border-red-300 font-medium hover:!bg-red-200 cursor-pointer transition-colors',
          style: {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderColor: '#fca5a5',
          },
        };
      default:
        return {
          className: '!bg-slate-100 !text-slate-800 !border-slate-300 cursor-pointer',
        };
    }
  }, []);

  // Highlight overloaded days in red
  const dayPropGetter = useCallback(
    (date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayWorkload = workloadMap[dateKey];

      if (dayWorkload?.isOverloaded) {
        return {
          className: 'day-overloaded !bg-red-50/80 border-2 !border-red-400 transition-colors',
          style: {
            backgroundColor: '#fef2f2',
            borderColor: '#ef4444',
            borderWidth: '2px',
          },
        };
      }

      return {};
    },
    [workloadMap]
  );

  // Custom Date Header to display warning badge on overloaded days
  const CustomDateHeader = useCallback(
    ({ label, date }) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayWorkload = workloadMap[dateKey];
      const isOverloaded = dayWorkload?.isOverloaded;

      let alertText = `Overload (${dayWorkload?.count})`;
      if (viewMode === VIEW_MODES.ALL && dayWorkload?.overloadedGrades?.length) {
        alertText = `Overload (${dayWorkload.overloadedGrades.map((g) => g.replace('Grade ', 'G')).join(', ')})`;
      }

      return (
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="font-semibold text-xs text-slate-700">{label}</span>
          {isOverloaded && (
            <span
              title={`Overload Alert: ${dayWorkload.count} items scheduled on this day`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-300 shadow-sm animate-pulse"
            >
              <span>⚠️</span>
              <span>{alertText}</span>
            </span>
          )}
        </div>
      );
    },
    [workloadMap, viewMode]
  );

  if (!mounted) {
    return (
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center min-h-[500px]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm font-medium text-slate-600">Initializing Calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 mb-4 rounded-xl text-xs font-semibold flex items-center space-x-2 border transition-all animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
              : 'bg-red-50 text-red-800 border-red-200 shadow-sm'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Legend, Workload Summary & View Toggle Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-3 sm:mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-xs">
          {/* Color Codes Legend */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="font-semibold text-slate-500">Legend:</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-700 font-medium">Homework</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-slate-700 font-medium">Project</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="text-slate-700 font-medium">Exam</span>
            </div>
            <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">
                ⚠️ Overload
              </span>
              <span className="text-slate-700 font-medium hidden sm:inline">3+ Items/Day</span>
            </div>
          </div>

          {/* Active Filter Metrics & View Toggle */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 text-slate-500 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            {/* View Switcher Toggle Button */}
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentView('month')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  currentView === 'month'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('agenda')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  currentView === 'agenda'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Agenda (List)</span>
              </button>
            </div>

            {/* Background Sync Indicator */}
            {isBackgroundSyncing && (
              <span className="inline-flex items-center space-x-1 text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                <span className="hidden sm:inline">Syncing live data...</span>
              </span>
            )}

            <div className="flex items-center space-x-2 text-[11px] sm:text-xs">
              <span>
                Total: <strong className="text-slate-800">{filteredEvents.length}</strong>
              </span>
              <span>•</span>
              <span>
                Overload:{' '}
                <strong className={overloadedDaysCount > 0 ? 'text-red-600 font-bold' : 'text-slate-800'}>
                  {overloadedDaysCount}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Initial Blocking Loader (Only shown if local cache is completely empty) */}
      {loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm font-medium text-slate-600">Syncing calendar data from Google Sheets...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start space-x-2">
          <span className="font-bold">Error:</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 sm:p-4 min-h-[520px] h-[640px] sm:h-[750px]">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          view={currentView}
          onView={(newView) => setCurrentView(newView)}
          views={['month', 'agenda']}
          date={currentDate}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
          components={{
            month: {
              dateHeader: CustomDateHeader,
            },
          }}
          popup
          tooltipAccessor={(event) =>
            `Click to edit/delete: [${event.resource?.grade || 'All'} - ${event.resource?.subject}] ${event.resource?.type} - ${event.resource?.description || 'No details'}`
          }
          className="h-full font-sans"
        />
      </div>

      {/* Event Edit / Delete Modal */}
      <EventDetailModal
        isOpen={isModalOpen}
        event={selectedEvent}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
