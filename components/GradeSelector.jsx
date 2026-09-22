'use client';

import React from 'react';
import { useGrade, VIEW_MODES } from '@/context/GradeContext';
import { Layers, RefreshCw, ExternalLink, GraduationCap } from 'lucide-react';

export default function GradeSelector({ variant = 'teacher' }) {
  const {
    viewMode,
    setViewMode,
    selectedGrade,
    setSelectedGrade,
    selectGradeAndMode,
    availableGrades,
  } = useGrade();

  const isStudent = variant === 'student';

  return (
    <header className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Dashboard Title & School Logo */}
          <div>
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <img
                src="/lis-logo.png"
                alt="Lighthouse International School Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain flex-shrink-0 rounded-full shadow-sm border border-slate-100"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {isStudent ? 'Student Academic Calendar' : 'Academic Workload Dashboard'}
                  </h1>
                  {isStudent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                      <GraduationCap className="w-3 h-3" />
                      <span>Student View</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {isStudent ? (
                viewMode === VIEW_MODES.SINGLE ? (
                  <span>Showing assignments, projects, and exam schedules for <strong className="text-blue-700">{selectedGrade}</strong></span>
                ) : (
                  <span>Showing combined schedule for all grades</span>
                )
              ) : (
                viewMode === VIEW_MODES.SINGLE ? (
                  `Focused view for ${selectedGrade} with daily overload detection (3+ assignments/day)`
                ) : (
                  <span className="inline-flex items-center gap-1.5 flex-wrap">
                    <span>Submit task entries via Google Form:</span>
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSdJQLxb6N4uMpu28B4Tc3iiyh0dMQZq1Lo_5nB0LV7aR-sc1g/viewform?usp=header"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 hover:underline gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition text-xs"
                      title="Open Google Form for new entries"
                    >
                      <span>Google Form Submission Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </span>
                )
              )}
            </p>
          </div>

          {/* Controls: Grade Selector Dropdown & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg border border-slate-200 flex-1 sm:flex-initial">
              <label htmlFor="grade-select" className="text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                Grade:
              </label>
              <select
                id="grade-select"
                value={viewMode === VIEW_MODES.ALL ? 'ALL' : selectedGrade}
                onChange={(e) => selectGradeAndMode(e.target.value)}
                className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs sm:text-sm font-semibold text-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer flex-1 sm:flex-initial"
              >
                <option value="ALL" className="text-indigo-700 font-bold">
                  ★ All Classes (Combined View)
                </option>
                <optgroup label="Individual Grades">
                  {availableGrades.map((grade) => (
                    <option key={grade.value} value={grade.value} className="text-slate-800">
                      {grade.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Student View Link (Teachers Only) */}
            {!isStudent && (
              <a
                href="/student"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-2 border border-blue-200 shadow-sm text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                title="Open Student Calendar view in new tab"
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Student View</span>
                <ExternalLink className="w-3 h-3 text-blue-400" />
              </a>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition"
              title="Refresh calendar data"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Grade Quick Pill Buttons */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium mr-1.5 whitespace-nowrap">Quick Select:</span>
          
          {/* All Classes Quick Button */}
          <button
            type="button"
            onClick={() => setViewMode(VIEW_MODES.ALL)}
            className={`px-3 py-1 rounded-md font-semibold transition-all whitespace-nowrap inline-flex items-center space-x-1 ${
              viewMode === VIEW_MODES.ALL
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>All Classes</span>
          </button>

          {/* Individual Grade Buttons (Showing M6-M8, H9-H12 short codes) */}
          {availableGrades.map((grade) => {
            const isSelected = viewMode === VIEW_MODES.SINGLE && grade.value === selectedGrade;
            return (
              <button
                key={grade.value}
                onClick={() => {
                  setViewMode(VIEW_MODES.SINGLE);
                  setSelectedGrade(grade.value);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {grade.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
