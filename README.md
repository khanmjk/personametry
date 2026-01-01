*Personametry is a personal time tracking analytics dashboard that turns Harvest/QuickSight exports into persona-based life insights (Work, Life, Sleep) and visualizes them with a React + Ant Design Pro UI.*

**Repository Layout**

The app lives in dashboard/ (React/TypeScript, Ant Design Pro scaffolding plus custom pages).
The data pipeline lives in data/etl/ (Python scripts that normalize and export JSON).
Supporting product context is in docs/ (vision, data architecture, spec), which aligns with the code but is not runtime logic.

**Data Pipeline (ETL)**

- **quicksight_to_json.py** reads QuickSight XLSX exports, adds date fields, and writes a JSON bundle with metadata + entries.
- **harvest_to_json.py** replicates the QuickSight transformation logic directly from raw Harvest XLSX, mapping tasks to normalized tasks, personas, MetaWorkLife, and social context heuristics.
- **verify_p3.py** is a quick audit script for P3 Professional entries and end-time coverage.
Outputs are JSON files like timeentries.json and timeentries_harvest.json, which are mirrored into timeentries.json and timeentries_harvest.json for the frontend to fetch.

**Domain Model and Core Service**
- **personametry.ts** defines the canonical types (TimeEntry, PersonaSummary, YearlyComparison, PeriodSummary) plus enums and color palettes for personas and Work/Life/Sleep.
- **personametryService.ts** is the analytics layer: it loads and caches JSON, filters by year/persona, groups by month/week, and calculates YoY deltas and period summaries.
The service also includes two specialized analytics modules: work patterns (late days, workload streaks, heatmap) and individual self-investment analysis (activity breakdown, weekly RAG scoring, fitness streaks).

**UI Structure and Pages**
- Routes are wired in routes.ts to dedicated analytics pages (overview, trends, scorecard, gains/losses, sleep, work, individual, personas, all-time).
- Executive overview: index.tsx shows KPIs, persona pie (excluding sleep), monthly bars, wheel-of-life radar, and YoY cards.
- Trends and comparisons: index.tsx plus YearlyStackedBar.tsx show work-life balance and grouped/stacked persona charts.
- RAGE scorecard: index.tsx applies per-persona goals and RAG status in a scorecard table.
- Deep-dive pages: index.tsx (diverging YoY), index.tsx (P0 sleep), index.tsx (P3 patterns), index.tsx (P2 + P1 self-investment), index.tsx (persona drill-down with PersonaDetailCharts.tsx).
- The app uses a mock user and streamlined layout in app.tsx to keep the UI in "executive dashboard" mode.

**Notable Behavioral Logic**
- The overview and all-time views explicitly exclude sleep (P0) from certain headline metrics to keep focus on discretionary time.
- Work pattern analysis uses end-time thresholds (late >= 19:00, late streak >= 21:00, workload >= 10h/day) and contiguous-day streak detection.
- Individual analysis merges P2 Individual with P1 Muslim entries to score weekly self-care using a RAG threshold (green/amber/red by hours per week).
