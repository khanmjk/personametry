/**
 * Personametry Domain Models
 * --------------------------
 * TypeScript interfaces derived from QuickSight data schema.
 */

// ============================================
// ENUMS - Core categorization values
// ============================================

export enum MetaWorkLife {
  WORK = 'Work',
  LIFE = 'Life',
  SLEEP_LIFE = 'Sleep-Life',
}

export enum PrioritisedPersona {
  P0_LIFE_CONSTRAINTS = 'P0 Life Constraints (Sleep)',
  P1_MUSLIM = 'P1 Muslim',
  P2_INDIVIDUAL = 'P2 Individual',
  P3_PROFESSIONAL = 'P3 Professional',
  P4_HUSBAND = 'P4 Husband',
  P5_FAMILY = 'P5 Family',
  P6_FRIEND_SOCIAL = 'P6 Friend Social',
}

export enum PersonaTier2 {
  REST_SLEEP = 'Rest/Sleep',
  ME_TIME = 'Me Time',
  WORK_TIME = 'Work Time',
  FAMILY_TIME = 'Family Time',
  HUSBAND_WIFE = 'Husband/Wife',
  SOCIAL = 'Social',
}

export enum NormalisedTask {
  REST_SLEEP = '[Individual] Rest n Sleep',
  SPIRITUALITY = '[Individual] Spirituality',
  ME_TIME = '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
  HEALTH_FITNESS = '[Individual] Health, Fitness & Wellbeing',
  KNOWLEDGE = '[Individual] Knowledge-Base - Books/Video/Podcasts',
  WORK = '[Professional] Service Provider - Work/Job',
  FAMILY = '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
  HUSBAND = '[Husband] Marital/Wife #Husband',
  SOCIAL = '[Friend] Social',
}

// ============================================
// INTERFACES - Data structures
// ============================================

/**
 * Raw time entry from JSON data source
 */
export interface TimeEntry {
  date: string; // ISO date format: YYYY-MM-DD
  year: number;
  month: number;
  day: number;
  dayOfWeek: string; // e.g., "_01 Monday"
  monthName: string; // e.g., "Jan"
  monthNum: number;
  weekNum: number;
  typeOfDay: 'Weekday' | 'Weekend';
  task: string;
  normalisedTask: string;
  metaWorkLife: MetaWorkLife;
  prioritisedPersona: string;
  personaTier2: string;
  hours: number;
  startedAt?: string;
  endedAt?: string;
  notes?: string;
  notesClean?: string;
  socialContext?: string;
  socialEntity?: string;
  meTimeBreakdown?: string;
  commuteContext?: string;
}

/**
 * Aggregated summary for a persona
 */
export interface PersonaSummary {
  persona: string;
  metaWorkLife: MetaWorkLife;
  totalHours: number;
  percentageOfTotal: number;
  entryCount: number;
}

/**
 * Year-over-year comparison data
 */
export interface YearlyComparison {
  persona: string;
  currentYearHours: number;
  previousYearHours: number;
  deltaHours: number;
  percentageChange: number;
}

/**
 * Weekly trend data point
 */
export interface WeeklyTrend {
  year: number;
  week: number;
  hours: number;
  startDate: string; // ISO date of start of week
}

/**
 * Monthly trend data point
 */
export interface MonthlyTrend {
  year: number;
  month: number;
  monthName: string;
  hours: number;
  persona?: string;
}

/**
 * Period summary with aggregated data
 */
export interface PeriodSummary {
  period: string; // e.g., "2024", "2024-Q1", "2024-01"
  startDate: string;
  endDate: string;
  totalHours: number;
  workHours: number;
  lifeHours: number;
  sleepHours: number;
  workLifeRatio: number;
  byPersona: PersonaSummary[];
}

/**
 * Data source metadata
 */
export interface DataMetadata {
  generatedAt: string;
  recordCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  source: string;
}

/**
 * Complete data file structure
 */
export interface TimeEntriesData {
  metadata: DataMetadata;
  entries: TimeEntry[];
}

// ============================================
// CONSTANTS - Persona configuration
// ============================================

export const PERSONA_COLORS: Record<string, string> = {
  'P0 Life Constraints (Sleep)': '#3B7DD8', // Royal Blue
  'P1 Muslim': '#E8913A',                    // Warm Orange
  'P2 Individual': '#28A745',                // Forest Green
  'P3 Professional': '#DC3545',              // Crimson Red
  'P4 Husband': '#8E44AD',                   // Rich Purple
  'P5 Family': '#F39C12',                    // Golden Amber
  'P6 Friend Social': '#E91E63',             // Pink
};

export const PERSONA_SHORT_NAMES: Record<string, string> = {
  'P0 Life Constraints (Sleep)': 'Sleep',
  'P1 Muslim': 'Muslim',
  'P2 Individual': 'Individual',
  'P3 Professional': 'Professional',
  'P4 Husband': 'Husband',
  'P5 Family': 'Family',
  'P6 Friend Social': 'Social',
};

export const META_WORK_LIFE_COLORS: Record<MetaWorkLife, string> = {
  [MetaWorkLife.WORK]: '#DC3545',     // Crimson Red
  [MetaWorkLife.LIFE]: '#28A745',     // Forest Green
  [MetaWorkLife.SLEEP_LIFE]: '#3B7DD8', // Royal Blue
};

// Multi-year color palette (from executive slides)
export const YEAR_COLORS: Record<number, string> = {
  2016: '#6C757D', // Gray
  2017: '#17A2B8', // Cyan
  2018: '#87CEEB', // Light Blue
  2019: '#1A237E', // Dark Navy
  2020: '#FF9800', // Vibrant Orange
  2021: '#212121', // Solid Black
  2022: '#3B7DD8', // Royal Blue
  2023: '#28A745', // Forest Green
  2024: '#DC3545', // Crimson Red
};

// Status colors for RAG indicators
export const STATUS_COLORS = {
  success: '#28A745',  // Green
  warning: '#FFC107',  // Amber
  error: '#DC3545',    // Red
  neutral: '#6C757D',  // Gray
};

