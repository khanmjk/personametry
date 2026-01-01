# Personametry Dashboard MVP - Implementation Plan

**Project:** Personametry Dashboard v1.0  
**Focus:** Dashboard visualization shell with separation of concerns  
**Tech Stack:** React + Ant Design Pro + @ant-design/charts  
**Date:** December 31, 2024

---

## Goal

Build the **dashboard view shell** for Personametry using Ant Design Pro, with dummy data/placeholders. The architecture must enforce strict **separation of concerns** between:

1. **View Layer** - React components using Ant Design Pro
2. **Business Logic Layer** - Services for data transformation and calculations
3. **Data Model Layer** - Domain entities and data contracts (to be connected later)

---

## Dashboard Components Identified

Based on comprehensive analysis of blog posts, QuickSight dashboards, and **6 Google Slides presentations** (2022-2024 RAGE scorecards and Personametry reviews), the MVP requires:

### Visual Reference Screenshots

```carousel
![RAGE Scorecard with RAG Heatmap](/Users/khanmjk/.gemini/antigravity/brain/64a80f29-9d80-4c94-a92e-d11d2d3f32d1/google_slides_1_slide_4_dashboard_1767171306404.png)
<!-- slide -->
![Work-Life Harmony Pie Chart](/Users/khanmjk/.gemini/antigravity/brain/64a80f29-9d80-4c94-a92e-d11d2d3f32d1/pres1_slide8_harmony_1767172071187.png)
<!-- slide -->
![YoY Change Bar Chart](/Users/khanmjk/.gemini/antigravity/brain/64a80f29-9d80-4c94-a92e-d11d2d3f32d1/pres2_slide7_yoy_change_1767172296444.png)
<!-- slide -->
![Multi-Year Stacked Bars](/Users/khanmjk/.gemini/antigravity/brain/64a80f29-9d80-4c94-a92e-d11d2d3f32d1/personametry_stacked_bar_chart_1767171824145.png)
<!-- slide -->
![Monthly Heatmap](/Users/khanmjk/.gemini/antigravity/brain/64a80f29-9d80-4c94-a92e-d11d2d3f32d1/personametry_heatmap_1_1767171800713.png)
```

---

### 1. Overview Dashboard

| Component                    | Chart Type      | Purpose                                 | Source       |
| ---------------------------- | --------------- | --------------------------------------- | ------------ |
| **Work-Life Harmony Pie**    | Pie/Donut       | Top-level Work vs Life distribution     | 2022 Review  |
| **Persona Distribution Pie** | Pie Chart       | P0-P6 percentage breakdown              | 2023 ChatGPT |
| **KPI Summary Cards**        | Statistic Cards | Total hours, top persona, balance ratio | All reviews  |
| **Status Badges**            | RAG Badges      | "GOOD!" / "NOT SO GOOD!" indicators     | 2022 Review  |

### 2. RAGE Scorecard View

| Component                   | Chart Type       | Purpose                        | Source          |
| --------------------------- | ---------------- | ------------------------------ | --------------- |
| **Persona Priority Matrix** | Table            | Rank personas by importance    | 2023 RAGE       |
| **RAG Status Heatmap**      | Heatmap Grid     | Monthly RAG status (2017-2024) | 2023 RAGE       |
| **Goal Drill-Down Cards**   | Expandable Cards | Per-persona aspirations/goals  | RAGE Scorecards |

### 3. Trend Analysis

| Component                     | Chart Type            | Purpose                           | Source       |
| ----------------------------- | --------------------- | --------------------------------- | ------------ |
| **Monthly Hours Trend**       | Multi-series Line     | Hours per persona/month           | 2024 Review  |
| **Multi-Year Bar Comparison** | Grouped Bar           | 2019-2024 side-by-side bars       | 2024 Review  |
| **Work Hours Heatmap**        | Traffic Light Heatmap | Monthly intensity (Green→Red)     | 2023 ChatGPT |
| **Work Hours Histogram**      | Histogram             | Daily start/end time distribution | 2024 Review  |

### 4. Year-over-Year Comparison

| Component               | Chart Type    | Purpose                        | Source       |
| ----------------------- | ------------- | ------------------------------ | ------------ |
| **YoY Summary Table**   | ProTable      | Hours, Delta, % Change columns | All reviews  |
| **Change Bar Chart**    | Diverging Bar | Gains (Blue) vs Losses (Red)   | 2024 YoY     |
| **Stacked Persona Bar** | Stacked Bar   | Annual composition by persona  | 2023 ChatGPT |

### 5. Persona Deep Dive

| Component                    | Chart Type        | Purpose                       | Source      |
| ---------------------------- | ----------------- | ----------------------------- | ----------- |
| **Stats for Nerds Table**    | Dense Table       | Raw data: tasks × years       | 2022 Review |
| **Persona Trend Sparklines** | Sparkline + Delta | Trend with direction          | 2024 Review |
| **Monthly vs Annual Dual**   | Side-by-side Bars | Monthly detail + yearly total | 2024 Review |

---

### Color Palette (from presentations)

| Persona                     | Color       | Hex       |
| --------------------------- | ----------- | --------- |
| P0 Life Constraints (Sleep) | Blue        | `#4A90D9` |
| P1 Muslim                   | Orange      | `#E8913A` |
| P2 Individual               | Green       | `#5CB85C` |
| P3 Professional             | Red/Coral   | `#D9534F` |
| P4 Husband                  | Purple      | `#9B59B6` |
| P5 Family                   | Brown/Amber | `#C4883A` |
| P6 Friend Social            | Pink        | `#E57373` |

### Semantic Colors

| Status           | Color           | Usage                         |
| ---------------- | --------------- | ----------------------------- |
| Improvement/Good | Green           | Positive YoY trends           |
| Warning/Neutral  | Amber           | Constraints, attention needed |
| Decline/Concern  | Red             | Negative trends               |
| RAG Status       | Red/Amber/Green | RAGE scorecard                |

---

## Proposed Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         VIEW LAYER                              │
│  (React + Ant Design Pro + @ant-design/charts)                 │
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│  │ DashboardPage│ │PersonaPage  │ │ TrendsPage  │              │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘              │
│         │               │               │                      │
│  ┌──────┴───────────────┴───────────────┴──────┐              │
│  │              Dashboard Components            │              │
│  │  WheelOfLife | KPICards | TrendChart | etc. │              │
│  └──────────────────────┬──────────────────────┘              │
└─────────────────────────┼──────────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────────┐
│                    SERVICE LAYER                                │
│  (Business Logic - Calculations, Transformations)              │
│                                                                │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────┐ │
│  │PersonaService   │ │ AnalyticsService │ │ComparisonService│ │
│  │- getByPeriod()  │ │- calcTrends()    │ │- yearOverYear() │ │
│  │- aggregate()    │ │- calcBalance()   │ │- deltaHours()   │ │
│  └────────┬────────┘ └────────┬─────────┘ └────────┬────────┘ │
└───────────┼───────────────────┼────────────────────┼───────────┘
            │                   │                    │
┌───────────┼───────────────────┼────────────────────┼───────────┐
│           └───────────────────┴────────────────────┘           │
│                         DATA LAYER                              │
│  (Domain Models + Data Contracts)                              │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ TimeEntry | Persona | PersonaTier | MetaWorkLife         │ │
│  │ PeriodSummary | YearlyComparison | Benchmark             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ DataProvider (Abstract) → MockDataProvider (MVP)         │ │
│  │                        → QuickSightDataProvider (Future) │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Model (Domain Entities)

```typescript
// Core Entities
interface TimeEntry {
  id: string;
  date: Date;
  startedAt: string;
  endedAt: string;
  hours: number;
  normalizedTask: string;
  personaTier2: PersonaTier;
  metaWorkLife: MetaWorkLife;
  socialContext?: string;
  socialEntity?: string;
  notes?: string;
}

enum MetaWorkLife {
  WORK = "Work",
  LIFE = "Life",
  SLEEP_LIFE = "Sleep-Life",
}

enum PersonaTier {
  P0_LIFE_CONSTRAINTS = "P0 Life Constraints",
  P1_MUSLIM = "P1 Muslim",
  P2_INDIVIDUAL = "P2 Individual",
  P3_PROFESSIONAL = "P3 Professional",
  P4_HUSBAND = "P4 Husband",
  P5_FAMILY = "P5 Family",
  P6_FRIEND_SOCIAL = "P6 Friend Social",
}

// Aggregated Entities
interface PersonaSummary {
  persona: PersonaTier;
  metaWorkLife: MetaWorkLife;
  totalHours: number;
  percentageOfTotal: number;
  tasks: TaskSummary[];
}

interface YearlyComparison {
  persona: PersonaTier;
  currentYearHours: number;
  previousYearHours: number;
  deltaHours: number;
  percentageChange: number;
}

interface PeriodSummary {
  period: string; // e.g., "2024-Q1", "2024-01"
  startDate: Date;
  endDate: Date;
  totalHours: number;
  byPersona: PersonaSummary[];
  workLifeRatio: number;
}
```

---

## Project Structure

```
personametry/
├── docs/
│   ├── product-specification.md
│   ├── research-summary.md
│   ├── coding-agent-contract.md   # Development rules
│   └── journals/
│       └── worklog.md             # [NEW] Development timeline
├── data/                          # [NEW] Data pipeline
│   ├── imports/                   # Raw XLSX files from Harvest/QuickSight
│   │   └── .gitkeep
│   ├── processed/                 # Cleaned JSON/CSV for dashboard
│   │   └── .gitkeep
│   └── etl/                       # Python ETL scripts (future)
│       └── harvest_parser.py
├── src/
│   ├── components/
│   │   ├── charts/
│   │   ├── cards/
│   │   └── tables/
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── Scorecard/             # RAGE Scorecard view
│   │   ├── Personas/
│   │   └── Trends/
│   ├── services/                  # Business logic
│   ├── models/                    # TypeScript types
│   ├── data/                      # Data providers
│   │   ├── providers/
│   │   │   ├── DataProvider.ts
│   │   │   └── MockDataProvider.ts
│   │   └── mock/
│   ├── utils/
│   └── config/
├── package.json
├── tsconfig.json
└── README.md
```

### Data Pipeline (Future)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐
│   Harvest   │ --> │ XLSX Export  │ --> │  ETL Script  │ --> │ Dashboard │
│  (Manual)   │     │  (data/      │     │  (Python)    │     │  (React)  │
│             │     │   imports/)  │     │              │     │           │
└─────────────┘     └──────────────┘     └──────────────┘     └───────────┘
```

> **Note:** QuickSight step can be eliminated once Python ETL replicates its cleanup logic.

---

## Implementation Phases

### Phase 1: Project Setup (Est. 2-3 hours)

- [ ] Initialize Ant Design Pro project with `create-umi` or template
- [ ] Configure TypeScript
- [ ] Set up project structure
- [ ] Create `coding-agent-contract.md` with development rules
- [ ] Install dependencies: `@ant-design/charts`, `@ant-design/pro-components`

### Phase 2: Data Layer + ETL (Est. 2-3 hours)

- [ ] Create Python ETL script to convert QuickSight XLSX → JSON
- [ ] Define domain models (TypeScript interfaces) based on actual schema
- [ ] Create `DataProvider` abstract interface
- [ ] Implement `JsonDataProvider` to load real data
- [ ] Output to `/data/processed/timeentries.json`

> **Note:** Using real QuickSight export data (26,498 rows, 2018-2024) instead of mock data.

### Phase 3: Service Layer (Est. 2-3 hours)

- [ ] Implement `PersonaService` (aggregation, filtering)
- [ ] Implement `AnalyticsService` (trends, balance calculations)
- [ ] Implement `ComparisonService` (YoY, delta calculations)
- [ ] Unit tests for service functions

### Phase 4: Chart Components (Est. 4-5 hours)

- [ ] `WheelOfLife` - Radar chart for persona distribution
- [ ] `PersonaPieChart` - Donut chart for time allocation
- [ ] `TrendLineChart` - Multi-series line for monthly trends
- [ ] `YoYBarChart` - Grouped bar for year comparison
- [ ] `WorkHeatmap` - Weekly work pattern heatmap

### Phase 5: Card & Table Components (Est. 2-3 hours)

- [ ] `KPICard` - Statistic cards with trend indicators
- [ ] `PersonaCard` - Individual persona summary with sparkline
- [ ] `BalanceGauge` - Work-life balance indicator
- [ ] `PersonaTable` - ProTable with hierarchical data

### Phase 6: Dashboard Pages (Est. 3-4 hours)

- [ ] Main Dashboard layout with ProLayout
- [ ] Period selector (Year/Quarter/Month)
- [ ] Responsive grid layout
- [ ] Page navigation with sidebar

### Phase 6b: Deep Dive Pages (New Request)

### Phase 6b: Deep Dive Pages (New Request)

- [ ] **Gains/Losses Page**: Comparative view of time reallocation.
  - **Visualization**: Diverging Column Chart (Waterfall-style) showing YoY delta.
  - **Logic**: Positive (Blue) vs Negative (Red) change from previous year.
  - **Controls**: Year selector (compares Selected Year vs Selected Year - 1).
- [ ] **Work Metrics Page**: Deep dive into professional persona (trends, intensity, projects)
- [ ] **Individual Page**: Dedicated analytics for P2 Individual (self-improvement, hobbies)

### Phase 7: Polish & Documentation (Est. 2 hours)

- [ ] Theme customization (colors matching personas)
- [ ] Loading states and empty states
- [ ] README with setup instructions
- [ ] Update `coding-agent-contract.md`

---

## Key Technical Decisions

### 1. State Management

**Decision:** React Context + Hooks (no Redux)  
**Rationale:** For MVP dashboard shell, local state is sufficient. Data is read-only and doesn't require complex state synchronization.

### 2. Chart Library

**Decision:** `@ant-design/charts`  
**Rationale:** Native integration with Ant Design Pro, TypeScript support, comprehensive chart types including radar, pie, line, bar, and heatmap.

### 3. Data Provider Pattern

**Decision:** Abstract `DataProvider` interface with concrete implementations  
**Rationale:** Allows MockDataProvider for MVP and future swap to QuickSightDataProvider without changing components.

### 4. Period Selection

**Decision:** Full historical range (earliest date → latest date) with flexible comparisons  
**Capabilities:**

- Arbitrary date range selection
- Quick presets: Year, Quadrimester, Quarter, Month
- YoY, MoM, and custom comparison pairs
- Benchmark periods for goal tracking

---

## Sample Data Structure

For the MockDataProvider, we'll create data matching 2022-2024 patterns:

```typescript
const mockPersonaSummary: PeriodSummary = {
  period: '2024',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  totalHours: 8760, // 365 days × 24 hours
  workLifeRatio: 0.24, // ~24% work
  byPersona: [
    {
      persona: PersonaTier.P3_PROFESSIONAL,
      metaWorkLife: MetaWorkLife.WORK,
      totalHours: 2100,
      percentageOfTotal: 24,
      tasks: [...]
    },
    // ... other personas
  ]
};
```

---

## Confirmed Decisions

| Topic                      | Decision                                                    |
| -------------------------- | ----------------------------------------------------------- |
| **Ant Design Pro Version** | Latest v6 (UmiJS 4-based)                                   |
| **Dashboard Scope**        | Multiple pages: Dashboard, RAGE Scorecard, Personas, Trends |
| **Dark Mode**              | Start with dark mode; leverage Ant Design's built-in themes |
| **Period Selection**       | Full historical range with flexible comparison scenarios    |
| **Worklog**                | Track development in `docs/journals/worklog.md`             |

---

## Verification Plan

### Automated Tests

```bash
npm run test          # Unit tests for services
npm run test:e2e      # Playwright tests for dashboard rendering
npm run lint          # ESLint + TypeScript checks
```

### Manual Verification

- [ ] Dashboard renders with all chart components
- [ ] Period selector changes data across all charts
- [ ] Responsive layout works on tablet/mobile
- [ ] No console errors
- [ ] Chart interactions (tooltips, hover states)

---

## Dependencies

```json
{
  "@ant-design/pro-components": "^2.x",
  "@ant-design/charts": "^2.x",
  "antd": "^5.x",
  "react": "^18.x",
  "typescript": "^5.x",
  "umi": "^4.x"
}
```

---

## Next Steps After MVP

### Phase 8: Python ETL Pipeline

- Extract data from Harvest/QuickSight XLSX exports
- Normalize and validate against schema
- Output to `data/processed/` as JSON

### Phase 9: Real Data Integration

- Replace MockDataProvider with FileDataProvider
- Hot-reload on data file changes
- Historical data validation

### Phase 10: AI-Insights Assistant 🤖

> **Vision:** A conversational AI assistant that answers natural language questions about your personal telemetry data.

#### Architecture (RAG-Enabled)

```
┌────────────────────────────────────────────────────────────────┐
│                     AI-INSIGHTS ASSISTANT                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐    ┌──────────────────┐                 │
│  │  User Question   │───▶│  Query Parser    │                 │
│  │  "Am I sleeping  │    │  (Intent + Time  │                 │
│  │   enough?"       │    │   extraction)    │                 │
│  └──────────────────┘    └────────┬─────────┘                 │
│                                   │                            │
│                    ┌──────────────▼──────────────┐            │
│                    │      RAG Pipeline           │            │
│                    │  ┌─────────────────────┐   │            │
│                    │  │ Data Context Builder│   │            │
│                    │  │ - Relevant metrics  │   │            │
│                    │  │ - Historical trends │   │            │
│                    │  │ - Persona summaries │   │            │
│                    │  └─────────────────────┘   │            │
│                    └──────────────┬──────────────┘            │
│                                   │                            │
│                    ┌──────────────▼──────────────┐            │
│                    │      LLM Generation         │            │
│                    │  (GPT-4 / Claude / Gemini)  │            │
│                    └──────────────┬──────────────┘            │
│                                   │                            │
│                    ┌──────────────▼──────────────┐            │
│                    │   Insight Response + Charts │            │
│                    └─────────────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

#### AI Data Access Layer

```typescript
interface AIContextProvider {
  // Get relevant data for AI prompts
  getPersonaSummary(period: DateRange): PersonaSummary[];
  getRecentTrends(persona: PersonaTier): TrendData;
  getComparisons(periods: DateRange[]): Comparison[];

  // Pre-built context snippets
  buildContextForQuestion(question: string): string;

  // Vector embeddings for semantic search (future)
  searchSimilarInsights(query: string): InsightResult[];
}
```

#### Example Questions AI Can Answer

- "Am I overworking this month compared to last year?"
- "Which persona has seen the most improvement in 2024?"
- "What does my work-life balance look like?"
- "How has my spirituality time trended over the last 3 years?"
- "Give me a summary of my 2024 as if I'm explaining to my wife"

### Phase 11: Export/Share

- PDF/image export of dashboards
- Shareable report links
- Scheduled email summaries
