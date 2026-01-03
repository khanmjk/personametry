# Machine Learning Feature Walkthrough

**Feature**: Personametry Automator (v2.0)
**URL**: `/machine-learning`

---

## 1. Overview

The Machine Learning page moves Personametry from _Descriptive Analytics_ (what happened) to _Prescriptive Analytics_ (what should happen).
It uses a **Train/Test/Predict** engine to generate a mathematically optimized 2026 Life Profile.

## 2. Key Components

### A. The Forecast ("The Oracle")

- **Engine**: Holt-Winters Triple Exponential Smoothing.
- **What it does**: predicts your "Natural Baseline" for 2026 based on 10 years of history.
- **Seasonality**: It knows you work less in December and more in March.

### B. The Lab ("Control Center")

This is where you set your constraints. The AI solves for the optimal schedule in real-time.

- **Work Cap**: Hard limit on professional hours (default: 160h/mo).
- **Readiness Switch**: If enabled, the system checks your recent Sleep/Burnout score. If you are burned out, it _automatically_ lowers your goals.

### C. The Recommendation ("The Blueprint")

- **Visual**: Radar Chart.
- **Grey Area**: Your "Business as Usual" forecast.
- **Green Area**: The "Optimized" plan.
- **Stats**: Shows exactly how many hours of "Me Time" passed to you by optimizing.

## 3. How to verify

1.  Navigate to `/machine-learning`.
2.  Observe the "Readiness Score" at the top (calculated from your last 30 days).
3.  Move the "Work Cap" slider to 120h.
4.  Watch the Radar Chart instantly expand the "Me Time" and "Family" sectors.

---

**Technical Validation**:
Run `npx tsx verify_ml.ts` to see the backend logic processing synthetic scenarios.

### v2.2 Priorities Update (The "Husband & Health" Update)

- **Husband Focus (P4)**: New dedicated optimization for increasing quality time as a husband.
- **Health & Self**: Repurposed "Me Time" to explicitly prioritize your health and personal growth (Individual).
- **Social**: Removed from active optimization to focus on core priorities (Family, Husband, Health).
- **Realism**: Moved Sleep and Contract constraints to a dedicated "Realism Shortcuts" section.

![Machine Learning Page v2.2](/Users/khanmjk/.gemini/antigravity/brain/535a493a-e5a7-4837-8556-51e17842021b/ml_page_v2_2_verified_1767419121425.png)
_Figure 2: v2.2 Interface with Husband Focus and reorganized controls._
