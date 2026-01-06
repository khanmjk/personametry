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
  WeeklyTrend,
  PeriodSummary,
} from '@/models/personametry';
import { MetaWorkLife, PERSONA_COLORS, PERSONA_SHORT_NAMES } from '@/models/personametry';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

// ============================================
// DATA SOURCES - A/B Testing Support
// ============================================

export type DataSource = 'quicksight' | 'harvest';

const DATA_SOURCE_PATHS: Record<DataSource, string> = {
  quicksight: 'data/timeentries.json',
  harvest: 'data/timeentries_harvest.json',
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
  const response = await fetch(path, { cache: 'no-store' });
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
  return Array.from(monthlyData.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

// ============================================
// DAILY / WEEKLY AGGREGATIONS
// ============================================

export interface DailySummary {
  date: string;
  totalHours: number;
  byPersona: Record<string, number>; // hours per persona
}

/**
 * Group entries by day (for stacked bar charts)
 */
export function groupByDay(entries: TimeEntry[]): DailySummary[] {
  const dailyMap = new Map<string, DailySummary>();
  
  for (const entry of entries) {
    const date = entry.date;
    const existing = dailyMap.get(date) || { date, totalHours: 0, byPersona: {} };
    
    existing.totalHours += entry.hours;
    const persona = getPersonaShortName(entry.prioritisedPersona);
    existing.byPersona[persona] = (existing.byPersona[persona] || 0) + entry.hours;
    
    dailyMap.set(date, existing);
  }
  
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generic grouping by period (Day, Week, Month) with Persona Breakdown
 * Used for Stacked Bar Charts
 */
export function groupEntriesByPeriod(
  entries: TimeEntry[], 
  period: 'day' | 'week' | 'month'
): DailySummary[] { // Reusing DailySummary interface as it has the right shape { date, totalHours, byPersona }
  const map = new Map<string, DailySummary>();

  for (const entry of entries) {
    let key = '';
    let sortDate = ''; // ISO-like string for sorting

    const d = dayjs(entry.date);

    if (period === 'day') {
      key = entry.date; // YYYY-MM-DD
      sortDate = key;
    } else if (period === 'week') {
      const year = d.isoWeekYear();
      const week = d.isoWeek();
      key = `W${week} (${year})`; // Display Label
      sortDate = `${year}-W${week.toString().padStart(2, '0')}`; // Sort Key
    } else if (period === 'month') {
      key = d.format('MMM YYYY');
      sortDate = d.format('YYYY-MM');
    }

    // Use sortDate as map key to ensure unique buckets even if display label is same (unlikely but safe)
    // Actually, we need to return 'date' field as the display label for the chart x-axis OR keep separate.
    // Let's use the 'date' field for the X-AXIS Label.
    
    // We'll map by SORT KEY first to aggregate correctly across years if needed (though usually we filter by year first)
    const uniqueKey = sortDate; 

    const existing = map.get(uniqueKey) || { 
      date: key, // This will be the X-Axis Label
      totalHours: 0, 
      byPersona: {} 
    };

    existing.totalHours += entry.hours;
    const persona = getPersonaShortName(entry.prioritisedPersona);
    existing.byPersona[persona] = (existing.byPersona[persona] || 0) + entry.hours;

    map.set(uniqueKey, existing);
  }

  // Sort by the map keys (which are ISO-formatted)
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, summary]) => summary);
}

/**
 * Get entries for the last N days (relative to today or last entry date)
 */
export function getLastNDays(entries: TimeEntry[], days: number = 30): TimeEntry[] {
  if (entries.length === 0) return [];
  
  // Determine reference date: Use today, but fallback to last entry if data is historical
  // Actuallly, "Overvew" usually implies "Current context".
  // Let's use Real Today.
  const today = dayjs();
  const cutoff = today.subtract(days, 'day').format('YYYY-MM-DD');
  
  return entries.filter(e => e.date >= cutoff);
}

/**
 * Group entries by week within a year
 */
export function groupByWeek(entries: TimeEntry[]): WeeklyTrend[] {
  const weeklyData = new Map<string, WeeklyTrend>();
  
  for (const entry of entries) {
    const date = dayjs(entry.date);
    const week = date.isoWeek();
    
    // Handle end-of-year edge cases where ISO week might belong to next/prev year
    // For simplicity in this visualization, we assume entry.year unless week is 1/52 incongruence.
    // Actually, dayjs.isoWeekYear() is safer.
    const year = date.isoWeekYear(); 
    
    const key = `${year}-W${week.toString().padStart(2, '0')}`;
    const existing = weeklyData.get(key);
    
    if (existing) {
      existing.hours += entry.hours;
    } else {
      // Find start of week (Monday)
      const startDate = date.startOf('isoWeek').format('YYYY-MM-DD');
      
      weeklyData.set(key, {
        year,
        week,
        hours: entry.hours,
        startDate
      });
    }
  }
  
  return Array.from(weeklyData.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
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
// ============================================
// WORK PATTERN ANALYSIS (P3 PROFESSIONAL)
// ============================================

export interface Streak {
  length: number;
  startDate: string;
  endDate: string;
  type: 'HighWorkload' | 'LateEnd' | 'Challenging'; // >10h, >21:00, or Both
}

export interface LateDayMetric {
  dayOfWeek: string;
  weekNum: number;
  count: number;
  year: number;
}

export interface WorkPatternAnalysis {
  workIntensityHeatmap: { year: number; month: number; hours: number }[];
  lateDayFrequency: {
    byDayOfWeek: { day: string; count: number }[];
    byWeek: { week: number; count: number }[];
  };
  workloadStreaks: {
    highWorkload: Streak[];
    lateEnd: Streak[];
    challenging: Streak[];
  };
  stats: {
    totalLateDays: number;
    maxStreakLength: number;
    avgDailyHours: number;
    avgWeeklyHours: number;
    avgMonthlyHours: number;
  };
}

/**
 * Parse HH:MM time string to decimal hour (e.g. "21:30" -> 21.5)
 */
function parseTime(timeStr?: string): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours + minutes / 60;
}

/**
 * Calculate Work Patterns for P3 Professional
 * Filters specifically for P3 and expects endedAt data.
 */
export function calculateWorkPatterns(entries: TimeEntry[], year?: number): WorkPatternAnalysis {
  // 1. Filter for P3 Professional
  let p3Entries = entries.filter((e) => e.prioritisedPersona === 'P3 Professional');
  if (year) {
    p3Entries = p3Entries.filter((e) => e.year === year);
  }

  // 2. Aggregate Daily Data
  // Map: Date -> { hours, endHour }
  const dailyMap = new Map<string, { date: string; hours: number; endHour: number | null; dayOfWeek: string; weekNum: number; month: number; year: number }>();

  for (const entry of p3Entries) {
    const existing = dailyMap.get(entry.date) || { 
      date: entry.date, 
      hours: 0, 
      endHour: null,
      dayOfWeek: entry.dayOfWeek,
      weekNum: entry.weekNum,
      month: entry.monthNum,
      year: entry.year
    };

    existing.hours += entry.hours;
    
    // Track latest end time for the day
    const entryEnd = parseTime(entry.endedAt);
    if (entryEnd !== null) {
      if (existing.endHour === null || entryEnd > existing.endHour) {
        existing.endHour = entryEnd;
      }
    }

    dailyMap.set(entry.date, existing);
  }

  const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 3. Heatmap Data (Monthly Sums)
  // Format: { year, month, hours }
  const heatmapMap = new Map<string, { year: number; month: number; hours: number }>();
  for (const day of dailyData) {
    const key = `${day.year}-${day.month}`;
    const existing = heatmapMap.get(key) || { year: day.year, month: day.month, hours: 0 };
    existing.hours += day.hours;
    heatmapMap.set(key, existing);
  }
  const workIntensityHeatmap = Array.from(heatmapMap.values());

  // 4. Late Day Analysis (> 19:00 / 7 PM)
  const LATE_THRESHOLD = 19.0;
  const lateDays = dailyData.filter(d => d.endHour !== null && d.endHour >= LATE_THRESHOLD);

  const lateByDay = new Map<string, number>();
  const lateByWeek = new Map<string, { week: number; count: number }>(); // Key: Year-Week

  for (const day of lateDays) {
    // Day of Week
    lateByDay.set(day.dayOfWeek, (lateByDay.get(day.dayOfWeek) || 0) + 1);

    // Week Number (Accumulate count per week)
    const weekKey = `${day.year}-${day.weekNum}`;
    const existingWeek = lateByWeek.get(weekKey) || { week: day.weekNum, count: 0 };
    existingWeek.count++;
    lateByWeek.set(weekKey, existingWeek);
  }

  // Ensure all days of week are present (even if 0)
  const ORDERED_DAYS = ['_01 Monday', '_02 Tuesday', '_03 Wednesday', '_04 Thursday', '_05 Friday', '_06 Saturday', '_07 Sunday'];
  const lateDayFrequency = {
    byDayOfWeek: ORDERED_DAYS.map(day => ({
      day: day.replace(/_\d\d\s/, ''), // Remove prefix for display
      count: lateByDay.get(day) || 0
    })),
    byWeek: Array.from(lateByWeek.values())
  };

  // 5. Streak Analysis
  // High Workload (> 10h), Late End (> 21:00 / 9 PM)
  const HIGH_WORK_THRESHOLD = 10.0;
  const LATE_END_STREAK_THRESHOLD = 21.0;

  const streaks = {
    highWorkload: [] as Streak[],
    lateEnd: [] as Streak[],
    challenging: [] as Streak[]
  };

  let currentHighWorkStreak = 0;
  let currentLateEndStreak = 0;
  
  // Sort simply by date (assuming consecutive days are contiguous in array? No, need to check date gaps)
  // For simplicity, we iterate and check if next day is next calendar day. 
  // Actually, standard streak logic usually allows weekends gaps? Or strict consecutive?
  // Let's assume STRICT consecutive calendar days for now.

  const calculateStreaks = (condition: (d: typeof dailyData[0]) => boolean): Streak[] => {
    const foundStreaks: Streak[] = [];
    let currentStreak: typeof dailyData = [];

    for (let i = 0; i < dailyData.length; i++) {
      const day = dailyData[i];
      if (condition(day)) {
        // Check if contiguous with previous
        if (currentStreak.length > 0) {
          const prevDay = currentStreak[currentStreak.length - 1];
          const diff = dayjs(day.date).diff(dayjs(prevDay.date), 'day');
          if (diff === 1) {
            currentStreak.push(day);
          } else {
            // Gap found, verify streak
            if (currentStreak.length >= 2) {
              foundStreaks.push({
                length: currentStreak.length,
                startDate: currentStreak[0].date,
                endDate: currentStreak[currentStreak.length - 1].date,
                type: 'HighWorkload' // Placeholder type
              });
            }
            currentStreak = [day];
          }
        } else {
          currentStreak = [day];
        }
      } else {
        // Condition fail, close streak
        if (currentStreak.length >= 2) {
          foundStreaks.push({
            length: currentStreak.length,
            startDate: currentStreak[0].date,
            endDate: currentStreak[currentStreak.length - 1].date,
            type: 'HighWorkload'
          });
        }
        currentStreak = [];
      }
    }
    // Final check
    if (currentStreak.length >= 2) {
      foundStreaks.push({
        length: currentStreak.length,
        startDate: currentStreak[0].date,
        endDate: currentStreak[currentStreak.length - 1].date,
        type: 'HighWorkload'
      });
    }
    return foundStreaks;
  };

  streaks.highWorkload = calculateStreaks(d => d.hours >= HIGH_WORK_THRESHOLD)
    .map(s => ({ ...s, type: 'HighWorkload' as const }));
    
  streaks.lateEnd = calculateStreaks(d => d.endHour !== null && d.endHour >= LATE_END_STREAK_THRESHOLD)
    .map(s => ({ ...s, type: 'LateEnd' as const }));

  // 6. Calculate Averages (Weekly / Monthly)
  // Based on ACTIVE periods (weeks/months with at least one entry) to match Daily avg logic
  const activeWeeks = new Set(p3Entries.map(e => `${e.year}-${e.weekNum}`)).size;
  const activeMonths = new Set(p3Entries.map(e => `${e.year}-${e.monthNum}`)).size;
  
  const totalHours = sumHours(p3Entries);

  return {
    workIntensityHeatmap,
    lateDayFrequency,
    workloadStreaks: streaks,
    stats: {
      totalLateDays: lateDays.length,
      maxStreakLength: Math.max(
        ...streaks.highWorkload.map(s => s.length), 
        ...streaks.lateEnd.map(s => s.length), 
      0),
      avgDailyHours: dailyData.length > 0 ? totalHours / dailyData.length : 0,
      avgWeeklyHours: activeWeeks > 0 ? totalHours / activeWeeks : 0,
      avgMonthlyHours: activeMonths > 0 ? totalHours / activeMonths : 0,
    }
  };
}

// ============================================
// INDIVIDUAL PERSONA ANALYSIS (P2 + Spiritual)
// ============================================

// Activity category mapping for Individual persona
const INDIVIDUAL_ACTIVITY_CATEGORIES: Record<string, string> = {
  '[Individual] Health, Fitness & Wellbeing': 'Health & Fitness',
  '[Individual] Knowledge-Base - Books/Video/Podcasts': 'Learning',
  '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)': 'Hobbies & Creative',
  '[Individual] Spirituality': 'Spiritual',
};

// RAG thresholds for self-care (hours per week)
const SELF_CARE_THRESHOLDS = {
  green: 10,  // >10h/week = thriving
  amber: 5,   // 5-10h/week = maintenance
  // <5h/week = red (neglecting self)
};

export interface ActivityBreakdown {
  category: string;
  hours: number;
  percentage: number;
  color: string;
}

export interface WeeklyScore {
  week: string;
  year: number;
  weekNum: number;
  hours: number;
  ragStatus: 'green' | 'amber' | 'red';
}

export interface FitnessStreak {
  startDate: string;
  endDate: string;
  length: number;
}

export interface IndividualAnalysis {
  totalHours: number;
  avgWeeklyHours: number;
  activityBreakdown: ActivityBreakdown[];
  monthlyTrend: { month: string; hours: number }[];
  weeklyScores: WeeklyScore[];
  fitnessStreaks: FitnessStreak[];
  fitnessConsistencyPct: number;
  stats: {
    bestFitnessStreak: number;
    weeksWithGoodStreak: number;
    totalWeeks: number;
  };
}

const ACTIVITY_COLORS: Record<string, string> = {
  'Health & Fitness': '#52c41a',
  'Learning': '#1890ff',
  'Hobbies & Creative': '#722ed1',
  'Spiritual': '#faad14',
  'Social': '#eb2f96',
};

/**
 * Calculate Individual persona patterns and self-care metrics
 * Includes P2 Individual + P1 Muslim (Spiritual) entries
 */
export function calculateIndividualPatterns(
  entries: TimeEntry[],
  year?: number
): IndividualAnalysis {
  // Filter for Individual persona (P2) + Spiritual (P1 Muslim)
  // Filter for Individual persona (P2) + Spiritual (P1 Muslim) + Social (P4)
  const INDIVIDUAL_PERSONA = 'P2 Individual';
  const SPIRITUAL_PERSONA = 'P1 Muslim';
  const SOCIAL_PERSONA = 'P6 Friend Social';
  
  let individualEntries = entries.filter(
    e => e.prioritisedPersona === INDIVIDUAL_PERSONA || 
         e.prioritisedPersona === SPIRITUAL_PERSONA ||
         e.prioritisedPersona === SOCIAL_PERSONA
  );
  
  if (year) {
    individualEntries = filterByYear(individualEntries, year);
  }

  // Total hours
  const totalHours = sumHours(individualEntries);

  // Activity breakdown by category
  const categoryHours: Record<string, number> = {};
  for (const entry of individualEntries) {
    let category = INDIVIDUAL_ACTIVITY_CATEGORIES[entry.normalisedTask];
    if (entry.prioritisedPersona === 'P6 Friend Social') {
      category = 'Social';
    }
    category = category || 'Other';
    categoryHours[category] = (categoryHours[category] || 0) + entry.hours;
  }

  const activityBreakdown: ActivityBreakdown[] = Object.entries(categoryHours)
    .map(([category, hours]) => ({
      category,
      hours,
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      color: ACTIVITY_COLORS[category] || '#999',
    }))
    .sort((a, b) => b.hours - a.hours);

  // Monthly trend
  const monthlyMap: Record<string, number> = {};
  for (const entry of individualEntries) {
    const monthKey = dayjs(entry.date).format('YYYY-MM');
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + entry.hours;
  }
  const monthlyTrend = Object.entries(monthlyMap)
    .map(([month, hours]) => ({ month, hours: Math.round(hours) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Weekly scores with RAG classification
  const weeklyMap: Record<string, { hours: number; year: number; weekNum: number }> = {};
  for (const entry of individualEntries) {
    const d = dayjs(entry.date);
    const weekKey = `${d.isoWeekYear()}-W${d.isoWeek().toString().padStart(2, '0')}`;
    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { hours: 0, year: d.isoWeekYear(), weekNum: d.isoWeek() };
    }
    weeklyMap[weekKey].hours += entry.hours;
  }

  const weeklyScores: WeeklyScore[] = Object.entries(weeklyMap)
    .map(([week, data]) => {
      let ragStatus: 'green' | 'amber' | 'red';
      if (data.hours >= SELF_CARE_THRESHOLDS.green) {
        ragStatus = 'green';
      } else if (data.hours >= SELF_CARE_THRESHOLDS.amber) {
        ragStatus = 'amber';
      } else {
        ragStatus = 'red';
      }
      return {
        week,
        year: data.year,
        weekNum: data.weekNum,
        hours: Math.round(data.hours * 10) / 10,
        ragStatus,
      };
    })
    .sort((a, b) => a.week.localeCompare(b.week));

  const avgWeeklyHours = weeklyScores.length > 0 
    ? weeklyScores.reduce((sum, w) => sum + w.hours, 0) / weeklyScores.length 
    : 0;

  // Fitness streaks (3+ consecutive days with Health & Fitness activity)
  const HEALTH_TASK = '[Individual] Health, Fitness & Wellbeing';
  const fitnessEntries = individualEntries.filter(e => e.normalisedTask === HEALTH_TASK);
  
  const fitnessDays = new Set(fitnessEntries.map(e => e.date));
  const sortedFitnessDays = [...fitnessDays].sort();
  
  const fitnessStreaks: FitnessStreak[] = [];
  let streakStart = '';
  let streakLength = 0;
  
  for (let i = 0; i < sortedFitnessDays.length; i++) {
    const current = sortedFitnessDays[i];
    const prev = i > 0 ? sortedFitnessDays[i - 1] : null;
    
    if (prev && dayjs(current).diff(dayjs(prev), 'day') === 1) {
      streakLength++;
    } else {
      // Save previous streak if >= 3 days
      if (streakLength >= 3) {
        fitnessStreaks.push({
          startDate: streakStart,
          endDate: sortedFitnessDays[i - 1],
          length: streakLength,
        });
      }
      streakStart = current;
      streakLength = 1;
    }
  }
  // Final streak
  if (streakLength >= 3 && sortedFitnessDays.length > 0) {
    fitnessStreaks.push({
      startDate: streakStart,
      endDate: sortedFitnessDays[sortedFitnessDays.length - 1],
      length: streakLength,
    });
  }

  // Calculate fitness consistency (% of weeks with at least one 3+ day streak)
  const weeksWithGoodStreak = new Set<string>();
  for (const streak of fitnessStreaks) {
    const startWeek = dayjs(streak.startDate).format('YYYY-[W]WW');
    weeksWithGoodStreak.add(startWeek);
  }
  const fitnessConsistencyPct = weeklyScores.length > 0 
    ? Math.round((weeksWithGoodStreak.size / weeklyScores.length) * 100) 
    : 0;

  return {
    totalHours,
    avgWeeklyHours: Math.round(avgWeeklyHours * 10) / 10,
    activityBreakdown,
    monthlyTrend,
    weeklyScores,
    fitnessStreaks,
    fitnessConsistencyPct,
    stats: {
      bestFitnessStreak: fitnessStreaks.length > 0 
        ? Math.max(...fitnessStreaks.map(s => s.length)) 
        : 0,
      weeksWithGoodStreak: weeksWithGoodStreak.size,
      totalWeeks: weeklyScores.length,
    },
  };
}
