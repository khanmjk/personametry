# Machine Learning Implementation Plan

**Goal**: Implement the "Personametry Automator" (v2.0) to provide 2026 time allocation recommendations.

## Phase 1: The Temporal Engine (Foundation)

- [ ] **Create `MachineLearningService`**: Initialize the service skeleton.
- [ ] **Implement `HoltWinters` Class**:
  - Triple Exponential Smoothing logic: Level ($L_t$), Trend ($T_t$), Seasonality ($S_t$).
  - `forecast(history: number[], horizon: number): ForecastResult`
  - Confidence Interval calculation (Standard Error).
- [ ] **Data Transformation**:
  - Build `extractTimeSeries(persona: string)` helper to convert raw JSON entries into weekly/monthly time blocks.
  - Handle missing data points (imputation).

## Phase 2: The Optimization Engine (Logic)

- [ ] **Implement `GoalProgrammingSolver`**:
  - Define `Config` interface: Hard/Soft constraints.
  - Implement `solve(forecast: ForecastResult, config: Config): Targets`.
  - Logic: Greedy heuristic or Gradient Descent to minimize deviation from goals.
- [ ] **Implement Behavioral Layer**:
  - `calculateReadiness(history: TimeEntry[])`: Returns 0.0 - 1.0 score.
  - Integration: Solver adjusts constraints based on Readiness.

## Phase 3: User Interface (Visualization)

- [ ] **Create Page**: `/machine-learning`
- [ ] **Section A: The Oracle (Forecast)**:
  - Area Chart showing historical trend -> 2026 Forecast cone.
- [ ] **Section B: The Lab (Controls)**:
  - Sliders for Readiness, Work Priority, etc.
- [ ] **Section C: The Blueprint (Result)**:
  - Radar Chart comparing 2025 Actual vs 2026 Recommended.
- [ ] **Route Configuration**: Add to sidebar with `RobotOutlined` icon.

## Phase 4: Integration & Polish

- [ ] **Validation View**: "2025 Backtest" toggle to prove model accuracy.
- [ ] **Optimization**: Ensure Web Worker usage if calculation exceeds 50ms.
- [ ] **Unit Tests**: Verify Holt-Winters against known CSV datasets.
