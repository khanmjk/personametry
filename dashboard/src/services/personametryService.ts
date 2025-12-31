/**
 * Personametry Data Service
 * -------------------------
 * Business logic for aggregating and transforming time entry data.
 */

import type {
  TimeEntry,
  TimeEntriesData,
  PersonaSummary,
  YearlyComparison,
  MonthlyTrend,
  PeriodSummary,
} from '@/models/personametry';
import { MetaWorkLife, PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';

// ============================================
// DATA SOURCES - A/B Testing Support
// ============================================

export type DataSource = 'quicksight' | 'harvest';

const DATA_SOURCE_PATHS: Record<DataSource, string> = {
  quicksight: '/data/timeentries.json',
  harvest: '/data/timeentries_harvest.json',
};

let cachedData: Record<DataSource, TimeEntriesData | null> = {
  quicksight: null,
  harvest: null,
};

let currentDataSource: DataSource = 'harvest'; // Default to Harvest (bypasses QuickSight)

/**
 * Set the active data source
 */
export function setDataSource(source: DataSource): void {
  currentDataSource = source;
}

/**
 * Get the current data source
 */
export function getDataSource(): DataSource {
  return currentDataSource;
}

/**
 * Load time entries from specified data source
 */
export async function loadTimeEntries(source?: DataSource): Promise<TimeEntriesData> {
  const dataSource = source ?? currentDataSource;
  
  if (cachedData[dataSource]) {
    return cachedData[dataSource]!;
  }
  
  const path = DATA_SOURCE_PATHS[dataSource];
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load time entries from ${dataSource}: ${response.statusText}`);
  }
  
  cachedData[dataSource] = await response.json();
  return cachedData[dataSource]!;
}

/**
 * Clear cached data (useful when switching sources)
 */
export function clearCache(): void {
  cachedData = { quicksight: null, harvest: null };
}

/**
 * Get all time entries
 */
export async function getAllEntries(source?: DataSource): Promise<TimeEntry[]> {
  const data = await loadTimeEntries(source);
  return data.entries;
}

// ============================================
// FILTERING
// ============================================

/**
 * Filter entries by date range
 */
export function filterByDateRange(
  entries: TimeEntry[],
  startDate: string,
  endDate: string
): TimeEntry[] {
  return entries.filter(
    (entry) => entry.date >= startDate && entry.date <= endDate
  );
}

/**
 * Filter entries by year
 */
export function filterByYear(entries: TimeEntry[], year: number): TimeEntry[] {
  return entries.filter((entry) => entry.year === year);
}

/**
 * Filter entries by persona
 */
export function filterByPersona(entries: TimeEntry[], persona: string): TimeEntry[] {
  return entries.filter((entry) => entry.prioritisedPersona === persona);
}

/**
 * Filter entries by MetaWorkLife
 */
export function filterByMetaWorkLife(
  entries: TimeEntry[],
  metaWorkLife: MetaWorkLife
): TimeEntry[] {
  return entries.filter((entry) => entry.metaWorkLife === metaWorkLife);
}

// ============================================
// AGGREGATION
// ============================================

/**
 * Sum hours from entries
 */
export function sumHours(entries: TimeEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.hours, 0);
}

/**
 * Group entries by persona and calculate summaries
 */
export function groupByPersona(entries: TimeEntry[]): PersonaSummary[] {
  const totalHours = sumHours(entries);
  const grouped = new Map<string, { hours: number; count: number; metaWorkLife: MetaWorkLife }>();
  
  for (const entry of entries) {
    const persona = entry.prioritisedPersona;
    const existing = grouped.get(persona) || { hours: 0, count: 0, metaWorkLife: entry.metaWorkLife as MetaWorkLife };
    existing.hours += entry.hours;
    existing.count += 1;
    grouped.set(persona, existing);
  }
  
  const summaries: PersonaSummary[] = [];
  for (const [persona, data] of grouped.entries()) {
    summaries.push({
      persona,
      metaWorkLife: data.metaWorkLife,
      totalHours: Math.round(data.hours * 100) / 100,
      percentageOfTotal: totalHours > 0 ? Math.round((data.hours / totalHours) * 1000) / 10 : 0,
      entryCount: data.count,
    });
  }
  
  // Sort by hours descending
  return summaries.sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * Group entries by year and calculate totals
 */
export function groupByYear(entries: TimeEntry[]): Map<number, number> {
  const yearlyHours = new Map<number, number>();
  
  for (const entry of entries) {
    const current = yearlyHours.get(entry.year) || 0;
    yearlyHours.set(entry.year, current + entry.hours);
  }
  
  return yearlyHours;
}

/**
 * Group entries by month within a year
 */
export function groupByMonth(entries: TimeEntry[]): MonthlyTrend[] {
  const monthlyData = new Map<string, MonthlyTrend>();
  
  for (const entry of entries) {
    const key = `${entry.year}-${entry.month.toString().padStart(2, '0')}`;
    const existing = monthlyData.get(key);
    
    if (existing) {
      existing.hours += entry.hours;
    } else {
      monthlyData.set(key, {
        year: entry.year,
        month: entry.month,
        monthName: entry.monthName,
        hours: entry.hours,
      });
    }
  }
  
  return Array.from(monthlyData.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

// ============================================
// COMPARISONS
// ============================================

/**
 * Calculate year-over-year comparison for all personas
 */
export function calculateYoYComparison(
  entries: TimeEntry[],
  currentYear: number,
  previousYear: number
): YearlyComparison[] {
  const currentEntries = filterByYear(entries, currentYear);
  const previousEntries = filterByYear(entries, previousYear);
  
  const currentByPersona = groupByPersona(currentEntries);
  const previousByPersona = groupByPersona(previousEntries);
  
  const previousMap = new Map(previousByPersona.map((p) => [p.persona, p.totalHours]));
  
  return currentByPersona.map((current) => {
    const prevHours = previousMap.get(current.persona) || 0;
    const delta = current.totalHours - prevHours;
    const percentChange = prevHours > 0 ? (delta / prevHours) * 100 : 0;
    
    return {
      persona: current.persona,
      currentYearHours: current.totalHours,
      previousYearHours: prevHours,
      deltaHours: Math.round(delta * 100) / 100,
      percentageChange: Math.round(percentChange * 10) / 10,
    };
  });
}

/**
 * Calculate work-life balance ratio
 */
export function calculateWorkLifeRatio(entries: TimeEntry[]): number {
  const workHours = sumHours(filterByMetaWorkLife(entries, MetaWorkLife.WORK));
  const totalHours = sumHours(entries);
  return totalHours > 0 ? workHours / totalHours : 0;
}

// ============================================
// PERIOD SUMMARIES
// ============================================

/**
 * Generate a complete period summary
 */
export function generatePeriodSummary(
  entries: TimeEntry[],
  period: string,
  startDate: string,
  endDate: string
): PeriodSummary {
  const filteredEntries = filterByDateRange(entries, startDate, endDate);
  
  const workHours = sumHours(filterByMetaWorkLife(filteredEntries, MetaWorkLife.WORK));
  const lifeHours = sumHours(filterByMetaWorkLife(filteredEntries, MetaWorkLife.LIFE));
  const sleepHours = sumHours(filterByMetaWorkLife(filteredEntries, MetaWorkLife.SLEEP_LIFE));
  const totalHours = workHours + lifeHours + sleepHours;
  
  return {
    period,
    startDate,
    endDate,
    totalHours: Math.round(totalHours * 100) / 100,
    workHours: Math.round(workHours * 100) / 100,
    lifeHours: Math.round(lifeHours * 100) / 100,
    sleepHours: Math.round(sleepHours * 100) / 100,
    workLifeRatio: calculateWorkLifeRatio(filteredEntries),
    byPersona: groupByPersona(filteredEntries),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get available years from data
 */
export function getAvailableYears(entries: TimeEntry[]): number[] {
  const years = new Set(entries.map((e) => e.year));
  return Array.from(years).sort((a, b) => b - a); // Descending
}

/**
 * Get persona display name
 */
export function getPersonaShortName(persona: string): string {
  return PERSONA_SHORT_NAMES[persona] || persona;
}

/**
 * Get persona color
 */
export function getPersonaColor(persona: string): string {
  return PERSONA_COLORS[persona] || '#888888';
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k`;
  }
  return hours.toFixed(1);
}
