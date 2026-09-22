'use client';

import React, { createContext, useContext, useState } from 'react';

export const AVAILABLE_GRADES = [
  { label: 'Grade 6 (M6)', value: 'Grade 6', short: 'M6' },
  { label: 'Grade 7 (M7)', value: 'Grade 7', short: 'M7' },
  { label: 'Grade 8 (M8)', value: 'Grade 8', short: 'M8' },
  { label: 'Grade 9 (H9)', value: 'Grade 9', short: 'H9' },
  { label: 'Grade 10 (H10)', value: 'Grade 10', short: 'H10' },
  { label: 'Grade 11 (H11)', value: 'Grade 11', short: 'H11' },
  { label: 'Grade 12 (H12)', value: 'Grade 12', short: 'H12' },
];

export const VIEW_MODES = {
  SINGLE: 'single',
  ALL: 'all',
};

export const GradeContext = createContext({
  viewMode: VIEW_MODES.SINGLE,
  setViewMode: () => {},
  selectedGrade: 'Grade 6',
  setSelectedGrade: () => {},
  availableGrades: AVAILABLE_GRADES,
});

export function GradeProvider({ children }) {
  // Default mode is strictly Single-Class Mode as requested
  const [viewMode, setViewMode] = useState(VIEW_MODES.SINGLE);
  const [selectedGrade, setSelectedGrade] = useState('Grade 6');

  const selectGradeAndMode = (gradeValue) => {
    if (gradeValue === 'ALL') {
      setViewMode(VIEW_MODES.ALL);
    } else {
      setViewMode(VIEW_MODES.SINGLE);
      setSelectedGrade(gradeValue);
    }
  };

  const value = {
    viewMode,
    setViewMode,
    selectedGrade,
    setSelectedGrade,
    selectGradeAndMode,
    availableGrades: AVAILABLE_GRADES,
  };

  return (
    <GradeContext.Provider value={value}>
      {children}
    </GradeContext.Provider>
  );
}

export function useGrade() {
  const context = useContext(GradeContext);
  if (!context) {
    throw new Error('useGrade must be used within a GradeProvider');
  }
  return context;
}
