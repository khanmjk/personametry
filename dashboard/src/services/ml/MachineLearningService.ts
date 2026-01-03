
import { TimeEntry } from '@/models/personametry';
import { HoltWintersService, ForecastResult } from './HoltWintersService';
import { OptimizationService, OptimizationConfig, OptimizedProfile } from './OptimizationService';
import { ReadinessService } from './ReadinessService';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

export interface MLResult {
  persona: string;
  forecastNextYear: ForecastResult;
  historyPreviousYear: number[]; 
}

// Dynamic Year Helpers
const getCurrentYear = () => dayjs().year();
const getPreviousYear = () => dayjs().year() - 1;

export interface RecommendationResult {
    forecasts: Record<string, ForecastResult>;
    optimizedProfile: OptimizedProfile;
    readinessScore: number;
}

export class MachineLearningService {
  private forecaster: HoltWintersService;
  private optimizer: OptimizationService;
  private readinessEngine: ReadinessService;

  constructor() {
    this.forecaster = new HoltWintersService(0.2, 0.1, 0.1, 12); 
    this.optimizer = new OptimizationService();
    this.readinessEngine = new ReadinessService();
  }

  /**
   * Generates complete recommendation package: Forecasts + Optimized Plan
   */
  /**
   * Phase 1: Heavy Computation (Run once on mount)
   * Calculates 2026 Forecasts and Readiness from History
   */
  public prepareBaselines(entries: TimeEntry[]): { forecasts: Record<string, ForecastResult>; historyPreviousYear: Record<string, number>; readinessScore: number; previousYear: number; currentYear: number } {
      const previousYear = getPreviousYear();
      const currentYear = getCurrentYear();
      const forecasts: Record<string, ForecastResult> = {};
      // Corrected strings to match actual data
      const relevantPersonas = ['P0 Life Constraints (Sleep)', 'P1 Muslim', 'P2 Individual', 'P3 Professional', 'P5 Family', 'P6 Friend Social'];
      const p4Husband = 'P4 Husband';
      if (!relevantPersonas.includes(p4Husband)) relevantPersonas.push(p4Husband); // Ensure P4 is included


      // 1. Forecast for every persona
      relevantPersonas.forEach(p => {
          const { history } = this.extractMonthlyTimeSeries(entries, p);
          forecasts[p] = this.forecaster.forecast(history, 12);
      });

      // P4 Husband specific check - if missing, ensure zero forecast
      if (!forecasts['P4 Husband']) {
           forecasts['P4 Husband'] = { 
               forecast: new Array(12).fill(0), 
               confidenceUpper: [], confidenceLower: [], model: { alpha:0, beta:0, gamma:0 }
           };
      }


      // 2. Calculate Previous Year Baselines (Actual History) for Comparison
      const historyPreviousYear: Record<string, number> = {};
      relevantPersonas.forEach(p => {
          const { history, labels } = this.extractMonthlyTimeSeries(entries, p);
          const yearlySlice = this.extractYearlySlice(history, labels, previousYear);
          // Average the previous year monthly data
          const sum = yearlySlice.reduce((a, b) => a + b, 0);
          historyPreviousYear[p] = yearlySlice.length > 0 ? sum / yearlySlice.length : 0;
      });

      // --- Sabbatical Logic (P3 Professional) ---
      // If previous year Work average is < 120h/mo (Sabbatical), use 4-year average for Forecast
      const p3Work = 'P3 Professional';
      const p3AvgPrevYear = historyPreviousYear[p3Work] || 0;
      
      if (p3AvgPrevYear < 120 && forecasts[p3Work]) {
          const { history, labels } = this.extractMonthlyTimeSeries(entries, p3Work);
          
          // Calculate 4-Year Average (years before previous year)
          // This smooths out any anomalies in the immediate prior years
          const years = [previousYear - 4, previousYear - 3, previousYear - 2, previousYear - 1];
          let totalSum = 0;
          let totalCount = 0;

          years.forEach(year => {
              const slice = this.extractYearlySlice(history, labels, year);
              totalSum += slice.reduce((a, b) => a + b, 0);
              totalCount += slice.length;
          });

          const fourYearAvg = totalCount > 0 ? totalSum / totalCount : 0;

          // Overwrite the Forecast with this constant BAU baseline
          forecasts[p3Work] = {
              ...forecasts[p3Work],
              forecast: new Array(12).fill(fourYearAvg),
              // Flatten confidence intervals since it's a fixed baseline request
              confidenceUpper: new Array(12).fill(fourYearAvg * 1.05),
              confidenceLower: new Array(12).fill(fourYearAvg * 0.95),
          };
      }
      // ------------------------------------------

      // 3. Calculate Readiness Score
      const last30Days = entries.filter(e => dayjs(e.date).isAfter(dayjs().subtract(30, 'day')));
      const readinessScore = this.readinessEngine.calculateReadiness(last30Days);

      return { forecasts, historyPreviousYear, readinessScore, previousYear, currentYear };
  }

  /**
   * Phase 2: Light Computation (Run on Slider Drag)
   * Solves the specific optimization constraints
   */
  public optimizeProfile(
      forecasts: Record<string, ForecastResult>, 
      readinessScore: number, 
      config: Omit<OptimizationConfig, 'readinessScore'>
  ): OptimizedProfile {
      return this.optimizer.solve(forecasts, {
          ...config,
          readinessScore
      });
  }

  /**
   * @deprecated Use prepareBaselines + optimizeProfile for better performance
   */
  public generateRecommendations(entries: TimeEntry[], config: Omit<OptimizationConfig, 'readinessScore'>): RecommendationResult {
      const { forecasts, readinessScore } = this.prepareBaselines(entries);
      const optimizedProfile = this.optimizeProfile(forecasts, readinessScore, config);

      return {
          forecasts,
          optimizedProfile,
          readinessScore
      };
  }

  /**
   * Generates single persona forecast (Used for UI detailed charts)
   */
  public generateForecast(entries: TimeEntry[], persona: string): MLResult {
    const previousYear = getPreviousYear();
    const { history, labels } = this.extractMonthlyTimeSeries(entries, persona);
    const result = this.forecaster.forecast(history, 12);
    const historyPreviousYear = this.extractYearlySlice(history, labels, previousYear);

    return {
      persona,
      forecastNextYear: result,
      historyPreviousYear
    };
  }

  private extractMonthlyTimeSeries(entries: TimeEntry[], persona: string) {
    const previousYear = getPreviousYear();
    const relevantEntries = entries.filter(e => e.prioritisedPersona === persona);
    let current = dayjs('2015-01-01');
    const end = dayjs(`${previousYear}-12-31`); // Dynamic: end at previous year
    
    const history: number[] = [];
    const labels: string[] = [];

    while (current.isBefore(end) || current.isSame(end, 'month')) {
      const monthStart = current.startOf('month');
      const monthEnd = current.endOf('month');
      const monthKey = current.format('YYYY-MM');

      const totalHours = relevantEntries
        .filter(e => {
            const date = dayjs(e.date);
            return date.isAfter(monthStart.subtract(1, 'second')) && date.isBefore(monthEnd.add(1, 'second'));
        })
        .reduce((sum, e) => sum + e.hours, 0);

      history.push(totalHours);
      labels.push(monthKey);

      current = current.add(1, 'month');
    }

    return { history, labels };
  }

  private extractYearlySlice(history: number[], labels: string[], year: number): number[] {
      const indices = labels
        .map((label, index) => label.startsWith(year.toString()) ? index : -1)
        .filter(index => index !== -1);
      
      return indices.map(i => history[i]);
  }
}
