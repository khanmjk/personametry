
/**
 * Holt-Winters Triple Exponential Smoothing Implementation
 * 
 * Used for forecasting time series data with trend and seasonality.
 * 
 * Components:
 * - Level (Lt): The baseline value
 * - Trend (Tt): The slope/growth rate
 * - Seasonality (St): The repeating pattern (e.g. monthly indices)
 * 
 * Formula:
 * Y(t+h) = Lt + h*Tt + S(t+h-m)
 */

export interface ForecastResult {
  forecast: number[];     // Predicted values
  confidenceUpper: number[]; // 95% Confidence Interval Upper
  confidenceLower: number[]; // 95% Confidence Interval Lower
  model: {
    alpha: number; // Smoothing factor for Level
    beta: number;  // Smoothing factor for Trend
    gamma: number; // Smoothing factor for Seasonality
  };
}

export class HoltWintersService {
  private alpha: number;
  private beta: number;
  private gamma: number;
  private period: number; // Seasonality period (e.g., 12 for months, 52 for weeks)
  private m: number; // Season length

  constructor(
    alpha: number = 0.2, // Level smoothing
    beta: number = 0.1,  // Trend smoothing
    gamma: number = 0.1, // Seasonality smoothing
    period: number = 12  // Default to monthly seasonality
  ) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
    this.period = period;
    this.m = period;
  }

  /**
   * Forecast future values based on historical data
   * @param history Array of historical numerical values
   * @param horizon Number of steps to forecast into the future
   */
  public forecast(history: number[], horizon: number): ForecastResult {
    // Need at least 2 full seasons to initialize
    if (history.length < 2 * this.m) {
      console.warn("HoltWinters: Insufficient history for seasonality. Falling back to simple average.");
      return this.simpleForecast(history, horizon);
    }

    // 1. Initialize Level, Trend, and Seasonality
    let { level, trend, seasonality } = this.initialize(history);
    
    // Store fitted values for error calculation (Standard Error)
    const fitted: number[] = [];
    const residuals: number[] = [];

    // 2. Train over history (Smoothing)
    // We start from the end of the first season as we used it for initialization
    for (let i = 0; i < history.length; i++) {
        const val = history[i];
        
        // Retrieve seasonal index from last cycle
        // If i < m, use initial seasonality. If i >= m, use seasonality from last cycle.
        const lastSeasonIndex = i % this.m; 
        const s_last = seasonality[lastSeasonIndex];

        // Calculate fitted value (prediction for current step)
        const fit = level + trend + s_last;
        fitted.push(fit);
        residuals.push(val - fit);

        // Update Level
        const lastLevel = level;
        // Lt = alpha * (Yt - S(t-m)) + (1-alpha) * (Lt-1 + Tt-1)
        level = this.alpha * (val - s_last) + (1 - this.alpha) * (lastLevel + trend);

        // Update Trend
        // Tt = beta * (Lt - Lt-1) + (1-beta) * Tt-1
        trend = this.beta * (level - lastLevel) + (1 - this.beta) * trend;

        // Update Seasonality
        // St = gamma * (Yt - Lt) + (1-gamma) * S(t-m)
        seasonality[lastSeasonIndex] = this.gamma * (val - level) + (1 - this.gamma) * s_last;
    }

    // 3. Forecast Future
    const forecast: number[] = [];
    for (let h = 1; h <= horizon; h++) {
        // Y(t+h) = Lt + h*Tt + S(t+h-m)
        // Note: Seasonality index cycles
        const seasonIndex = (history.length + h - 1) % this.m;
        const value = level + (h * trend) + seasonality[seasonIndex];
        forecast.push(Math.max(0, value)); // Clamp to 0 (can't have negative hours)
    }

    // 4. Calculate Confidence Intervals
    // Using Standard Error of the residuals
    const mse = residuals.reduce((sum, r) => sum + r*r, 0) / residuals.length;
    const stdErr = Math.sqrt(mse);
    // 95% Confidence (z = 1.96)
    // Forecast variance grows with time horizon (simplified assumption: linear growth of uncertainty)
    const confidenceUpper = forecast.map((f, i) => f + (1.96 * stdErr * Math.sqrt(i + 1)));
    const confidenceLower = forecast.map((f, i) => Math.max(0, f - (1.96 * stdErr * Math.sqrt(i + 1))));

    return {
      forecast,
      confidenceUpper,
      confidenceLower,
      model: { alpha: this.alpha, beta: this.beta, gamma: this.gamma }
    };
  }

  // Initializers based on standard Holt-Winters heuristic
  private initialize(history: number[]) {
    // Initial Level = Average of first season
    let level = 0;
    for (let i = 0; i < this.m; i++) {
        level += history[i];
    }
    level /= this.m;

    // Initial Trend = Average slope over first two seasons
    let trend = 0;
    for (let i = 0; i < this.m; i++) {
        trend += (history[i + this.m] - history[i]) / this.m;
    }
    trend /= this.m;

    // Initial Seasonality Indices
    // S_i = Y_i - Level (Simplified additive)
    const seasonality = new Array(this.m).fill(0);
    for (let i = 0; i < this.m; i++) {
        seasonality[i] = history[i] - level;
    }

    return { level, trend, seasonality };
  }

  private simpleForecast(history: number[], horizon: number): ForecastResult {
      const avg = history.reduce((a,b) => a+b, 0) / history.length;
      const forecast = new Array(horizon).fill(avg);
      return {
          forecast,
          confidenceUpper: forecast.map(f => f * 1.1),
          confidenceLower: forecast.map(f => f * 0.9),
          model: { alpha: 0, beta: 0, gamma: 0 }
      };
  }
}
