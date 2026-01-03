# Personametry Anomaly Detection Design

## 1. Executive Summary

The Anomaly Detection system, "The Inspector", provides rigorous forensic analysis of historical data. Unlike simple outlier detection, this system employs **Time-Series Anomaly Detection** techniques to distinguish between _structural seasonality_ (e.g., weekends) and genuine _behavioral anomalies_.

## 2. Scientific Methodology

Simple statistical methods (like standard deviation) fail on human behavioral data because time-tracking data is:

1.  **Non-Stationary**: Trends change over time (e.g., job change, holidays).
2.  **Highly Seasonal**: Weekly cycles (Mon-Fri vs. Weekend) create multi-modal distributions.
3.  **Non-Normal**: Distributions are often skewed or zero-inflated.

To address this, we define a "PhD-Level" Hybrid Architecture:

### A. Decomposition-Based Detection (The "Unusual")

_Isolating the signal from the noise._

**Algorithm: STL Decomposition (Seasonal-Trend decomposition using Loess)**
We decompose the time series $Y_t$ into three components:
$$Y_t = S_t + T_t + R_t$$
Where:

- $S_t$: Seasonal Component (Weekly cycle)
- $T_t$: Trend Component (Long-term movement)
- $R_t$: Residual (Noise/Anomaly)

**Detection Logic**:

1.  Verify Seasonality: Confirm 7-day periodicity.
2.  Desiderata: Extract $R_t$ (the unexplained variance).
3.  **Robust Outlier Detection**: Apply **Modified Z-Score** (using Median Absolute Deviation - MAD) on the _Residuals_ $R_t$, not the raw data.
    - _Why?_ Standard Z-Score is sensitive to outliers. MAD is robust.
    - Threshold: $|Modified Z| > 3.5$ indicates a statistically significant anomaly relative to the _context_ of that day.

### B. Contextual Heuristics (The "Unhealthy")

_Domain-Specific Constraints._

- **Sequential Pattern Mining**:
  - **Burnout Sequence**: Sliding window search for $P(Sleep < 5h)$ over $k=3$ days.
  - **Neglect Sequence**: $P(Persona = 0)$ for $k>14$ days.
- **Structural Violations**:
  - Weekend Work Violation: Work > Threshold AND `DayOfWeek in [Sat, Sun]`.
  - Data Integrity: `TotalHours > 24` (Impossible) or `TotalHours < 4` (Missing/Incomplete).

## 3. UI/UX Concept: "The Inspector"

A forensic investigation interface.

### Layout

1.  **The Sidebar (Incident Log)**: A severe, log-based feed of detected anomalies.
    - _Example_: "CRITICAL (Statistical): Unexplained Spike in Work (+4σ)" - _Detected on residual_.
2.  **The Main View (Decomposition Plot)**:
    - **Top Chart**: Raw Time Series (Actuals).
    - **Middle Chart**: "Normal Behavior" (Trend + Seasonality).
    - **Bottom Chart**: **The Residuals** (The Anomalies). This visually explains _why_ a point is anomalous ("We expected 0h because it's Saturday, but you logged 8h").
3.  **Heatmap Mode**: "The Burnout Map" - Clustering of red tiles to show systemic issues.

## 4. Technical Architecture

- **Service**: `AnomalyService.ts`
  - `decompose(series: number[], period: number): STLResult`
  - `detectResidualAnomalies(residuals: number[]): Anomaly[]`
- **Performance**:
  - STL Decomposition is $O(N)$. Browser-capable for 10 years of daily data (~3650 points).
- **Integration**:
  - Feed cleaned data (Trend + Seasonality) back into standard ML forecasting to improve accuracy (Robust Regression).

## 5. Implementation Roadmap

1.  **Phase 1: The Mathematician**: Implement `SeasonalDecomposition` and `RobustZScore` in `AnomalyService`.
2.  **Phase 2: The Inspector**: Build the UI to visualize $Actual$ vs $Expected$ (Trend+Seasonal).
3.  **Phase 3: The Guardian**: Active alerting system.
