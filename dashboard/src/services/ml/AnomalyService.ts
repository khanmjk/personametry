
import dayjs from 'dayjs';
import { TimeEntry } from '@/models/personametry';

export interface Anomaly {
  date: string;
  type: 'Statistical' | 'Structural' | 'Behavioral';
  severity: 'Critical' | 'Warning' | 'Info';
  category: string; // e.g., 'Work', 'Sleep', 'Data Integrity'
  description: string;
  value: number;
  expected?: number;
  score?: number; // Z-Score or confidence
}

export interface DecompositionResult {
  dates: string[];
  observed: number[];
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export class AnomalyService {

  /**
   * Main entry point: Detect all types of anomalies
   */
  public detectAll(entries: TimeEntry[]): Anomaly[] {
      const structural = this.detectStructuralViolations(entries);
      const statistical = this.detectStatisticalAnomalies(entries);
      // Behavioral (Burnout) can be added here
      
      return [...structural, ...statistical].sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());
  }

  // ==========================================================
  // 1. Structural / Rule-Based Detection
  // ==========================================================

  private detectStructuralViolations(entries: TimeEntry[]): Anomaly[] {
      const anomalies: Anomaly[] = [];
      
      // Group by date to check total daily hours
      const dailyTotals: Record<string, number> = {};
      entries.forEach(e => {
          if (!dailyTotals[e.date]) dailyTotals[e.date] = 0;
          dailyTotals[e.date] += e.hours;
      });

      // Check Checks
      Object.entries(dailyTotals).forEach(([date, total]) => {
          // Rule 1: Impossible Day (> 24h)
          if (total > 24) {
              anomalies.push({
                  date,
                  type: 'Structural',
                  severity: 'Critical',
                  category: 'Data Integrity',
                  description: `Impossible Daily Total: ${total.toFixed(0)} hours reported`,
                  value: total,
                  expected: 24
              });
          }
          // Rule 2: Missing Day (< 4h) - Assumption: Active user logs at least sleep or work
          // Filter out very old dates or future dates if needed
          if (total < 4 && total > 0) {
              anomalies.push({
                  date,
                  type: 'Structural',
                  severity: 'Warning',
                  category: 'Data Integrity',
                  description: `Incomplete Day: Only ${total.toFixed(0)} hours reported`,
                  value: total,
                  expected: 24
              });
          }
      });

      // Rule 3: Weekend Work Violations
      entries.filter(e => e.typeOfDay === 'Weekend' && e.prioritisedPersona === 'P3 Professional').forEach(e => {
           if (e.hours > 4) {
               anomalies.push({
                   date: e.date,
                   type: 'Behavioral',
                   severity: 'Warning',
                   category: 'Work-Life Balance',
                   description: `High Weekend Work: ${e.hours.toFixed(1)}h on a ${dayjs(e.date).format('dddd')}`,
                   value: e.hours,
                   expected: 0
               });
           }
      });

      return anomalies;
  }

  // ==========================================================
  // 2. Statistical Detection (Decomposition)
  // ==========================================================

  private detectStatisticalAnomalies(entries: TimeEntry[]): Anomaly[] {
      const anomalies: Anomaly[] = [];
      const personas = ['P3 Professional', 'P0 Life Constraints (Sleep)']; // Focus on key metrics first

      personas.forEach(persona => {
          const { dates, values } = this.extractTimeSeries(entries, persona);
          
          if (values.length < 14) return; // Need at least 2 weeks for valid stats

          const decomp = this.stlDecomposition(values, 7); // Weekly seasonality
          const residualAnomalies = this.detectResidualOutliers(decomp.residual, dates, values, decomp.seasonal, decomp.trend, persona);
          
          anomalies.push(...residualAnomalies);
      });

      return anomalies;
  }

  /**
   * Simplified STL Decomposition (Seasonal-Trend decomposition using Loess concepts)
   * 1. Extract Trend (Moving Average)
   * 2. Detrend
   * 3. Extract Seasonality (Average of detrended values per day-of-week)
   * 4. Calculate Residual
   */
  public stlDecomposition(series: number[], period: number = 7): DecompositionResult {
      const n = series.length;
      
      // 1. Trend: Centered Moving Average (Window = period)
      // Simple moving average for robustness
      const trend = new Array(n).fill(0);
      const halfWindow = Math.floor(period / 2);
      
      for (let i = 0; i < n; i++) {
          let sum = 0;
          let count = 0;
          for (let j = i - halfWindow; j <= i + halfWindow; j++) {
              if (j >= 0 && j < n) {
                  sum += series[j];
                  count++;
              }
          }
          trend[i] = sum / count;
      }

      // 2. Detrend (Series - Trend)
      const detrended = series.map((val, i) => val - trend[i]);

      // 3. Seasonality: Average detrended value for each index in period (0..6)
      const seasonalPattern = new Array(period).fill(0);
      const seasonalCounts = new Array(period).fill(0);
      
      detrended.forEach((val, i) => {
          const seasonIdx = i % period;
          seasonalPattern[seasonIdx] += val;
          seasonalCounts[seasonIdx]++;
      });
      
      // Average and normalize seasonality (sum should be close to 0)
      for (let i = 0; i < period; i++) {
         if (seasonalCounts[i] > 0) seasonalPattern[i] /= seasonalCounts[i];
      }
      
      const seasonal = series.map((_, i) => seasonalPattern[i % period]);

      // 4. Residual: Series - Trend - Seasonal
      const residual = series.map((val, i) => val - trend[i] - seasonal[i]);

      return {
          dates: [], // Populated by caller context if needed, mostly internal math here
          observed: series,
          trend,
          seasonal,
          residual
      };
  }

  /**
   * Robust Outlier Detection using MAD (Median Absolute Deviation)
   * Z-Score = 0.6745 * (x - median) / MAD
   * Threshold: > 3.5 is a strong outlier
   */
  private detectResidualOutliers(residuals: number[], dates: string[], observed: number[], seasonal: number[], trend: number[], persona: string): Anomaly[] {
      const anomalies: Anomaly[] = [];
      
      // Calculate Median
      const sortedRes = [...residuals].sort((a, b) => a - b);
      const median = sortedRes[Math.floor(sortedRes.length / 2)];
      
      // Calculate MAD (Median Absolute Deviation)
      const absDevs = residuals.map(r => Math.abs(r - median)).sort((a, b) => a - b);
      const mad = absDevs[Math.floor(absDevs.length / 2)];
      
      // Handle perfect data (mad = 0)
      if (mad === 0) return []; 

      const modifiedZScores = residuals.map(r => 0.6745 * (r - median) / mad);

      modifiedZScores.forEach((z, i) => {
          if (Math.abs(z) > 3.5) {
              const expected = trend[i] + seasonal[i];
              // Filter out small deviations that are statistically significant but practically irrelevant
              // e.g. Expected 0.1h, Observed 0.5h -> Huge Z-score, but ignore.
              if (Math.abs(observed[i] - expected) < 1.0) return;

              anomalies.push({
                  date: dates[i],
                  type: 'Statistical',
                  severity: Math.abs(z) > 6 ? 'Critical' : 'Warning',
                  category: persona,
                  description: `Unusual ${persona}: ${observed[i].toFixed(1)}h (Expected ~${expected.toFixed(1)}h)`,
                  value: observed[i],
                  expected: expected,
                  score: z
              });
          }
      });

      return anomalies;
  }

  // --- Helpers ---

  private extractTimeSeries(entries: TimeEntry[], persona: string) {
      // Sort by date absolute
      const relevant = entries.filter(e => e.prioritisedPersona === persona).sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());
      
      // We need a dense time series (fill missing days with 0)
      if (relevant.length === 0) return { dates: [], values: [] };

      const start = dayjs(relevant[0].date);
      const end = dayjs(relevant[relevant.length - 1].date);
      const dates: string[] = [];
      const values: number[] = [];

      let current = start;
      const entryMap = new Map(relevant.map(e => [e.date, e.hours]));

      // Limit to last 365 days for performance if needed, but browser can handle 5-10k points easily
      // Let's do last 2 years for good seasonality
      
      while (current.isBefore(end) || current.isSame(end, 'day')) {
          const dateStr = current.format('YYYY-MM-DD');
          dates.push(dateStr);
          values.push(entryMap.get(dateStr) || 0);
          current = current.add(1, 'day');
      }

      return { dates, values };
  }
}
