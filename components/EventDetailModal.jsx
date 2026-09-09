'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, BookOpen, AlertTriangle, Trash2, Check, Loader2 } from 'lucide-react';

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
}) {
  const [formData, setFormData] = useState({
    date: '',
    grade: '',
    subject: '',
    type: 'Homework',
    description: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (event) {
      const resource = event.resource || {};
      setFormData({
        date: resource.date || event.date || '',
        grade: resource.grade || '',
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await onUpdate({
        id: resource.id,
        rowIndex: resource.rowIndex,
        sheetTitle: resource.sheetTitle,
        sheetNumericId: resource.sheetNumericId,
        ...formData,
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
              {showConfirmDelete ? 'Confirm Deletion' : 'Edit Academic Schedule'}
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

        {/* Content Body */}
        {showConfirmDelete ? (
          /* Delete Confirmation View */
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
          /* Edit Form View */
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

              {/* Grade */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Grade</label>
                <input
                  type="text"
                  required
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  placeholder="e.g. Grade 6"
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="e.g. Math, Science"
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
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
