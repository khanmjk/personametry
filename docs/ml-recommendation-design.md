# Machine Learning Design Document: Personametry Automator

**Version:** 2.0 (Updated based on Independent Review)
**Author:** Lead Software Architect
**Date:** 2026-01-03
**Status:** DRAFT

---

## 1. Executive Summary

The **Personametry Automator** is a client-side "Automated Self" engine. It moves beyond simple tracking to provide **prescriptive guidance**. By analyzing 10 years of high-fidelity data, it generates a mathematically optimized "Life Profile" for 2026.

**Key Difference v2.0**: The system prioritizes "Behavioral Feasibility" over "Mathematical Perfection". It uses Holt-Winters for seasonality and Goal Programming for soft constraints.

---

## 2. Architectural Pillars

### 2.1. Privacy-First (Client-Side Intelligence)

All computation happens in the browser. No data leaves the device.

- **Tech Stack**: TypeScript + Web Workers (for non-blocking optimization).
- **Future**: WebAssembly (Wasm) if matrix operations exceed 100ms.

### 2.2. The "Train/Test/Predict" Loop

1.  **Training (2015-2024)**: Learn the user's "Natural Baseline" and Seasonality.
2.  **Validation (2025)**: Backtest the model against 2025 reality to generate a "Confidence Score".
3.  **Prediction (2026)**: Generate the detailed forward-looking plan.

---

## 3. The Temporal Engine (Forecasting)

**Champion Model: Holt-Winters (Triple Exponential Smoothing)**
We reject Deep Learning (RNN/LSTM) due to "Small Data" (only ~3,650 daily points). Holt-Winters captures the three essential components of human time:

- **Level ($L_t$)**: The baseline average hours.
- **Trend ($T_t$)**: Is the persona growing or shrinking? (e.g., Career is ramp-up).
- **Seasonality ($S_t$)**: Recurring patterns (e.g., Ramsey/Ramadan, December Slump).

$$ \hat{y}_{t+h|t} = L_t + hT_t + S_{t+h-m} $$

---

## 4. The Optimization Engine (Goal Programming)

Life is flexible, so we reject rigid Linear Programming. We use **Goal Programming** with Soft Constraints.

$$ \text{Minimize } Z = \sum (w_i^- d_i^- + w_i^+ d_i^+) $$

Where $d_i$ are deviations from the goal (under or over).

### Constraints

1.  **Hard (The "Musts")**:
    - $\sum Hours \le 24$ (Time Physics)
    - $Work \le Cap$ (Burnout Shield)
2.  **Soft (The "Wants")**:
    - Minimize deviation from "Family Target" ($Goal_{family}$)
    - Minimize "Context Switching" (Penalty for jagged schedules)

---

## 5. Behavioral Intelligence (The "Human" Factor)

We integrate the **Fogg Behavior Model**: $Behavior = Motivation \cdot Ability \cdot Prompt$.

### 5.1. The "Readiness Score"

Similar to an Oura Ring, the system calculates a daily/weekly Readiness Score.

- _Calculation_: Weighted average of Sleep Quality (Last 7 Days) + Burnout Streak (Work Intensity) + recent "Me Time".
- _Effect_: If Readiness is LOW, the Optimizer relaxes 2026 targets (e.g., reduces Work goal, increases Sleep goal).

---

## 6. UX/XAI: Explainable AI

The "Machine Learning" page (`/machine-learning`) tells a story.

### Section A: The Forecast ("Cone of Probability")

- **Visual**: Line chart extending into 2026.
- **Feature**: Shaded area showing the 80% and 95% Confidence Intervals.
- **Meaning**: "We are 95% sure your natural Work execution will fall between 42h and 48h/week."

### Section B: The Optimization Lab

- **Controls**: Sliders for "Readiness" (Motivation) and "Priorities".
- **Instant Feedback**: Adjusting a slider re-runs the Goal Programming solver in <50ms.

### Section C: The Recommendation (Radar)

- Overlay of "2025 Actual" vs "2026 Optimized".
- **Delta Text**: "This plan requires +15% Focus on Family, which usually happens in December. We suggest spreading it out."

---

## 7. Implementation Roadmap

### Phase 1: The Engine (Weeks 1-2)

- Build `HoltWintersService.ts` for forecasting.
- Build `OptimizationService.ts` (Simple Gradient Descent or Greedy Heuristic for MVP).

### Phase 2: The UI (Weeks 3-4)

- Build `/machine-learning` page.
- Implement "Cone of Probability" Chart using `@ant-design/charts` Area chart.

### Phase 3: The Behavioral Layer (Month 2+)

- Implement "Readiness Score" logic.
- Refine forecast with seasonality detection (Ramadan detection).

---
