'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, BookOpen, AlertTriangle, Trash2, Check, Loader2, GraduationCap } from 'lucide-react';
import { AVAILABLE_GRADES } from '@/context/GradeContext';
import { parseGrades, formatGradeShort } from '@/lib/gradeUtils';

const TASK_TYPES = [
  { value: 'Homework', label: 'Homework (Blue)', colorClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Project', label: 'Project (Green)', colorClass: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'Exam', label: 'Exam (Red)', colorClass: 'bg-red-50 text-red-700 border-red-200' },
];

export default function EventDetailModal({
  isOpen,
  event,
  onClose,
  onUpdate,
  onDelete,
  readOnly = false,
}) {
  const [formData, setFormData] = useState({
    date: '',
    grade: '',
    subject: '',
    type: 'Homework',
    description: '',
  });
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (event) {
      const resource = event.resource || {};
      let initialGrades = [];
      if (Array.isArray(resource.grades) && resource.grades.length > 0) {
        initialGrades = [...resource.grades];
      } else if (resource.grade) {
        initialGrades = parseGrades(resource.grade);
      } else if (event.grade) {
        initialGrades = parseGrades(event.grade);
      }

      setSelectedGrades(initialGrades);
      setFormData({
        date: resource.date || event.date || '',
        grade: initialGrades.join(', '),
        subject: resource.subject || '',
        type: resource.type || 'Homework',
        description: resource.description || '',
      });
      setShowConfirmDelete(false);
      setErrorMsg(null);
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const resource = event.resource || {};

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleGrade = (gradeVal) => {
    setSelectedGrades((prev) => {
      const exists = prev.includes(gradeVal);
      const next = exists ? prev.filter((g) => g !== gradeVal) : [...prev, gradeVal];
      // Sort numerically by grade number
      next.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
      setFormData((prevForm) => ({ ...prevForm, grade: next.join(', ') }));
      return next;
    });
  };

  const handleSelectAllGrades = () => {
    const all = AVAILABLE_GRADES.map((g) => g.value);
    setSelectedGrades(all);
    setFormData((prev) => ({ ...prev, grade: all.join(', ') }));
  };

  const handleClearAllGrades = () => {
    setSelectedGrades([]);
    setFormData((prev) => ({ ...prev, grade: '' }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (selectedGrades.length === 0) {
      setErrorMsg('Please select at least one target grade.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onUpdate({
        id: resource.id,
        rowIndex: resource.rowIndex,
        sheetTitle: resource.sheetTitle,
        sheetNumericId: resource.sheetNumericId,
        ...formData,
        grade: selectedGrades.join(', '),
      });
      onClose();
    } catch (err) {
      console.error('[EventDetailModal Save Error]:', err);
      setErrorMsg(err.message || 'Failed to update event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setErrorMsg(null);
      await onDelete({
        id: resource.id,
        rowIndex: resource.rowIndex,
        sheetTitle: resource.sheetTitle,
        sheetNumericId: resource.sheetNumericId,
      });
      onClose();
    } catch (err) {
      console.error('[EventDetailModal Delete Error]:', err);
      setErrorMsg(err.message || 'Failed to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                formData.type === 'Exam'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : formData.type === 'Project'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-blue-100 text-blue-700 border-blue-200'
              }`}
            >
              {formData.type}
            </span>
            <h3 className="text-base font-bold text-slate-800">
              {readOnly ? 'Academic Task Details' : showConfirmDelete ? 'Confirm Deletion' : 'Edit Academic Schedule'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Body: Read-Only View vs Teacher Edit/Delete View */}
        {readOnly ? (
          /* Student Read-Only View */
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              {/* Subject */}
              <div className="flex items-start space-x-3">
                <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</span>
                  <p className="text-base font-bold text-slate-900">{formData.subject || 'General'}</p>
                </div>
              </div>

              {/* Scheduled Date */}
              <div className="flex items-start space-x-3 pt-2 border-t border-slate-200/60">
                <CalendarIcon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due / Scheduled Date</span>
                  <p className="text-sm font-semibold text-slate-800">{formData.date}</p>
                </div>
              </div>

              {/* Target Grades */}
              <div className="flex items-start space-x-3 pt-2 border-t border-slate-200/60">
                <GraduationCap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Grades</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedGrades.length > 0 ? (
                      selectedGrades.map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold"
                        >
                          {formatGradeShort(g)} ({g})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-600 font-medium">{formData.grade || 'All Grades'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Assignment Scope & Details
              </span>
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl min-h-[90px] text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {formData.description || 'No detailed instructions provided.'}
              </div>
            </div>

            {/* Read-Only Modal Action */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : showConfirmDelete ? (
          /* Delete Confirmation View (Teacher Only) */
          <div className="p-6 space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50/70 border border-red-200 rounded-xl text-slate-700">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-red-900">Are you sure you want to delete this event?</p>
                <p className="text-xs text-red-700 mt-1">
                  This action will permanently delete the row from Google Sheets.
                </p>
                <div className="mt-3 p-2.5 bg-white/80 rounded-lg text-xs border border-red-100 space-y-1">
                  <div>
                    <strong>Date:</strong> {formData.date}
                  </div>
                  <div>
                    <strong>Grades:</strong> {formData.grade || selectedGrades.join(', ')}
                  </div>
                  <div>
                    <strong>Subject:</strong> {formData.subject}
                  </div>
                  <div>
                    <strong>Type:</strong> {formData.type}
                  </div>
                  {formData.description && (
                    <div>
                      <strong>Description:</strong> {formData.description}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting from Sheets...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form View (Teacher Only) */
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Task Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Task Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Subject */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="e.g. Math, Science, Spanish (Elective)"
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Multi-Grade Pill Checkbox Selector */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Target Grades <span className="text-slate-400 font-normal">(Select multiple for Leveled / Elective classes)</span>
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllGrades}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllGrades}
                      className="text-slate-500 hover:text-slate-700 hover:underline font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Pill Checkboxes Container */}
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
                  {AVAILABLE_GRADES.map((g) => {
                    const isChecked = selectedGrades.includes(g.value);
                    return (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => handleToggleGrade(g.value)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all ${
                          isChecked
                            ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-bold ${
                            isChecked ? 'bg-blue-800 text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </span>
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
                {selectedGrades.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Selected: <span className="font-semibold text-slate-700">{selectedGrades.join(', ')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Details</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter assignment requirements or scope..."
                className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Metadata Footer */}
            {resource.rowIndex && (
              <div className="text-[11px] text-slate-400">
                Connected Sheet Row: #{resource.rowIndex} ({resource.sheetTitle || 'Sheet1'})
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={isSaving || isDeleting}
                className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isDeleting}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
