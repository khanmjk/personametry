/**
 * Year Context - Global Year Selection State
 * -------------------------------------------
 * Provides application-wide year selection with localStorage persistence.
 * Supports both specific years and "ALL" for all-time views.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type YearSelection = number | 'ALL';

interface YearContextType {
  selectedYear: YearSelection;
  setSelectedYear: (year: YearSelection) => void;
  availableYears: number[];
  setAvailableYears: (years: number[]) => void;
  isAllTime: boolean;
}

const STORAGE_KEY = 'personametry_selected_year';

const YearContext = createContext<YearContextType | undefined>(undefined);

interface YearProviderProps {
  children: ReactNode;
}

export const YearProvider: React.FC<YearProviderProps> = ({ children }) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYearState] = useState<YearSelection>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ALL') return 'ALL';
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return new Date().getFullYear(); // Default to current year
  });

  // Persist to localStorage on change
  const setSelectedYear = (year: YearSelection) => {
    setSelectedYearState(year);
    localStorage.setItem(STORAGE_KEY, year.toString());
  };

  // Computed property for convenience
  const isAllTime = selectedYear === 'ALL';

  // Ensure selected year is valid when available years change
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear !== 'ALL') {
      if (!availableYears.includes(selectedYear as number)) {
        // Default to most recent year if current selection is invalid
        setSelectedYear(availableYears[0]);
      }
    }
  }, [availableYears, selectedYear]);

  return (
    <YearContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        availableYears,
        setAvailableYears,
        isAllTime,
      }}
    >
      {children}
    </YearContext.Provider>
  );
};

export const useYear = (): YearContextType => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
};

export default YearContext;
