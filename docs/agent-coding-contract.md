# Personametry Dashboard - Agent Coding Contract

**Version:** 1.0  
**Last Updated:** December 31, 2024  
**Purpose:** Define architecture rules, coding standards, and guidelines for AI agents working on this codebase.

---

## 1. Project Overview

**Personametry** is a personal telemetry dashboard that visualizes 7+ years of time-tracking data across life personas (P0-P6). The system uses React + Ant Design Pro for visualization with a Python ETL pipeline for data processing.

### Tech Stack

| Layer            | Technology                            |
| ---------------- | ------------------------------------- |
| Frontend         | React 19, TypeScript 5, UmiJS 4       |
| UI Framework     | Ant Design Pro v6, @ant-design/charts |
| Data Pipeline    | Python 3.x, pandas                    |
| Data Format      | JSON (processed from XLSX)            |
| State Management | React Context + Hooks                 |

---

## 2. Architecture Rules

### 2.1 Separation of Concerns (MANDATORY)

```
┌─────────────────────────────────────────────────────────┐
│                    VIEW LAYER                           │
│  /src/pages/*           React components (UI only)      │
│  /src/components/*      Reusable chart/card components  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                         │
│  /src/services/*        Business logic, calculations    │
│                         Data filtering, aggregation     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    MODEL LAYER                          │
│  /src/models/*          TypeScript interfaces, enums    │
│                         Domain constants (colors, etc.) │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│  /public/data/*.json    Processed JSON files           │
│  /data/etl/*.py         Python ETL scripts             │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Global Scope Rules

| Rule                   | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| **NO `window.X`**      | Do NOT assign or read from `window` except in entry points |
| **Singleton Services** | Service layer classes must be singletons                   |
| **No Inline HTML**     | Do not embed HTML strings in JS/TS files                   |
| **View Isolation**     | A View/Page must NEVER update another View/Page directly   |

### 2.3 Defensive Coding

- **Internal Trust**: Do NOT use defensive checks for internal source files
- **External Distrust**: DO use defensive checks for third-party libraries/APIs

---

## 3. Domain Model

### 3.1 Personas (Priority Order)

| ID  | Name                     | Short        | Color     | MetaWorkLife |
| --- | ------------------------ | ------------ | --------- | ------------ |
| P0  | Life Constraints (Sleep) | Sleep        | `#3B7DD8` | Sleep-Life   |
| P1  | Muslim                   | Muslim       | `#E8913A` | Life         |
| P2  | Individual               | Individual   | `#28A745` | Life         |
| P3  | Professional             | Professional | `#DC3545` | Work         |
| P4  | Husband                  | Husband      | `#8E44AD` | Life         |
| P5  | Family                   | Family       | `#F39C12` | Life         |
| P6  | Friend Social            | Social       | `#E91E63` | Life         |

### 3.2 Year Colors (for multi-year charts)

| Year | Color      | Hex       |
| ---- | ---------- | --------- |
| 2016 | Gray       | `#6C757D` |
| 2017 | Cyan       | `#17A2B8` |
| 2018 | Light Blue | `#87CEEB` |
| 2019 | Dark Navy  | `#1A237E` |
| 2020 | Orange     | `#FF9800` |
| 2021 | Black      | `#212121` |
| 2022 | Royal Blue | `#3B7DD8` |
| 2023 | Green      | `#28A745` |
| 2024 | Red        | `#DC3545` |

### 3.3 Status Colors (RAG)

| Status       | Color     | Usage                   |
| ------------ | --------- | ----------------------- |
| Success/Good | `#28A745` | On track, positive YoY  |
| Warning      | `#FFC107` | Needs attention         |
| Error/Bad    | `#DC3545` | Off track, negative YoY |

---

## 4. File Structure

```
personametry/
├── dashboard/                    # React application
│   ├── config/
│   │   ├── routes.ts            # Page routing
│   │   └── defaultSettings.ts   # Theme/branding config
│   ├── src/
│   │   ├── components/charts/   # Reusable chart components
│   │   ├── models/              # TypeScript domain models
│   │   ├── pages/               # Page components
│   │   └── services/            # Business logic services
│   └── public/data/             # JSON data files
├── data/
│   ├── etl/                     # Python ETL scripts
│   │   ├── harvest_to_json.py   # Harvest → JSON
│   │   └── quicksight_to_json.py # QuickSight → JSON
│   └── processed/               # Generated JSON files
├── docs/
│   ├── journals/worklog.md      # Development log
│   ├── data-architecture.md     # Data schema documentation
│   └── vision-plan.md           # Product roadmap
└── seedfiles/                   # Raw XLSX source files
```

---

## 5. Chart Guidelines

### 5.1 Executive Standards

| Element         | Requirement                                         |
| --------------- | --------------------------------------------------- |
| **Legends**     | Always visible, position: right or bottom           |
| **Data Labels** | Show values on bars/points when space permits       |
| **Colors**      | Use `PERSONA_COLORS` or `YEAR_COLORS` from models   |
| **Tooltips**    | Show formatted values with units (e.g., "1.2k hrs") |
| **Titles**      | Use `<Title level={5}>` for card headers            |

### 5.2 Card Styling

```typescript
const CARD_STYLE = {
  borderRadius: 8,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

### 5.3 Multi-Colored Grouped Bar Charts

**CRITICAL RULE**: When creating **grouped** bar/column charts (`isGroup: true`):
1. You MUST set `colorField` matches the grouping field (e.g. `seriesField="year"` → `colorField="year"`).
2. Without `colorField`, the library treats the series as a single continuous group and defaults to one color (blue).
3. Do NOT rely on callbacks for colors in grouped charts; use an explicit array of hex strings if possible.

### 5.4 Pie Chart Standardization

**Visual Standard**:
1.  **Shape**: Use **Full Pie Charts** (`innerRadius: 0`). Avoid Ring/Donut charts unless explicitly requested for "Gauge" style metrics.
2.  **Legend**: Do **NOT** use the default chart legend.
    - Use a **Split Layout** (`Row > Col 12 + Col 12`).
    - **Left Col**: Clean Pie Chart (no labels, no legend).
    - **Right Col**: Custom Legend Table showing `Color | Name | % | Value`.
3.  **Consistency**: This ensures all Pie visualizations provide detailed data (Hours + %) at a glance without hovering.


```

### 5.5 G2 v5 Tooltip API (CRITICAL)

**MANDATORY**: The @ant-design/charts v2.x library uses **G2Plot v5** internally. The v4 tooltip API is **deprecated and silently ignored**.

| API Version            | Pattern                                                                  | Status     |
| ---------------------- | ------------------------------------------------------------------------ | ---------- |
| **G2 v4 (DEPRECATED)** | `tooltip={{ formatter: (datum) => ({ name, value }) }}`                  | ❌ IGNORED |
| **G2 v5 (REQUIRED)**   | `tooltip={{ title: (d) => d.field, items: [(d) => ({ name, value })] }}` | ✅ WORKS   |

**Correct Pattern (All Chart Types)**:

```tsx
tooltip={{
  title: (datum) => datum.xField,  // Title shown at top of tooltip
  items: [(datum) => ({
    name: 'Label',
    value: `${datum.yField.toLocaleString()} hrs`,
  })],
}}
```

**Common Symptoms of Using Deprecated API**:

- Tooltip shows correct title but **empty value**
- Tooltip shows field name twice (e.g., "2018 → 2018")
- `customContent` function is **completely ignored**
- `formatter` callback is never invoked

**Rules**:

1. ALWAYS use `title` + `items` callbacks for tooltip configuration
2. NEVER use `formatter` - it is deprecated in G2 v5
3. NEVER use `customContent` - it is unreliable in this version
4. This pattern applies to ALL chart types: Pie, Line, Column, Bar, etc.

### 5.6 Data Source Standardization

**MANDATORY**: All pages that load data MUST follow this pattern:

```typescript
import { loadTimeEntries, getDataSource } from "@/services/personametryService";

useEffect(() => {
  async function fetchData() {
    const source = getDataSource(); // REQUIRED: Explicit call
    const data = await loadTimeEntries(source);
    // ... use data.entries
  }
  fetchData();
}, []);
```

**Rules:**

1. ALWAYS import `getDataSource` from `personametryService`.
2. ALWAYS call `getDataSource()` at the start of data fetching.
3. ALWAYS pass the source explicitly to `loadTimeEntries()`.
4. DO NOT rely on implicit defaults (e.g., `getAllEntries()` without source).

**Rationale:** Ensures all pages respect the user's data source selection from the Dashboard ETL dropdown.

---

## 6. Data Sources

### 6.1 A/B Testing Support

The dashboard supports switching between data sources:

| Source      | JSON File                  | Date Range |
| ----------- | -------------------------- | ---------- |
| Harvest ETL | `timeentries_harvest.json` | 2016-2022  |
| QuickSight  | `timeentries.json`         | 2018-2024  |

### 6.2 ETL Pipeline

```
Source XLSX → Python ETL → JSON → React Dashboard
```

All QuickSight transformation logic is replicated in `harvest_to_json.py`.

---

## 7. Branding Rules

### 7.1 DO

- Use "Personametry" as the app title
- Use teal primary color (`#0D7377`)
- Use clean, shadow-bordered cards
- Use professional sans-serif typography

### 7.2 DO NOT

- Show "Ant Design Pro" anywhere
- Display Chinese text or comments
- Add watermarks or user name backgrounds
- Include OpenAPI dev links

---

## 8. Testing Checklist

Before committing changes:

1. [ ] Dev server starts without errors (`npm run dev`)
2. [ ] All 4 pages load: Dashboard, Trends, Personas, Scorecard
3. [ ] Charts render with visible legends
4. [ ] Data source switching works (Harvest ↔ QuickSight)
5. [ ] No console errors in browser
6. [ ] No Chinese text visible
7. [ ] No watermarks or branding issues

---

## 9. Future Roadmap (Reference)

- [ ] Dark mode theming
- [ ] Historical RAG heatmaps
- [ ] AI-Insights assistant (RAG architecture)
- [ ] Export to PDF/Image
- [ ] Mobile responsive refinements

---

## 10. Contact & Context

For session continuity, refer to:

- `/docs/journals/worklog.md` - Development history
- `/docs/data-architecture.md` - Data schema details
- `/docs/vision-plan.md` - Product vision and roadmap

---

## 11. Deployment & Hosting

### 11.1 GitHub Pages Compatibility (CRITICAL)

The application is deployed to GitHub Pages via GitHub Actions. Agents must adhere to the following rules to ensure compatibility with subdirectory hosting (e.g., `khanmjk.github.io/personametry/`).

| Requirement            | Rule                                                                            | Rationale                                                                                            |
| :--------------------- | :------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------- |
| **Relative Paths**     | ALWAYS use relative paths for assets/data (e.g., `logo.png`, `data/file.json`). | Absolute paths (`/logo.png`) resolve to the domain root, breaking in subdirectories.                 |
| **Hash Routing**       | Use `history: { type: 'hash' }` in `config.ts`.                                 | GitHub Pages is a static host and does not support browser history API routing.                      |
| **No "public" prefix** | Do not include `/public/` in runtime paths.                                     | The build process flattens `public/` into the root. Use `data/foo.json`, not `public/data/foo.json`. |
