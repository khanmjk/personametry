# Personametry Data Architecture

> Based on analysis of seed files: Harvest (2015-2022), QuickSight (2018-2024)

---

## Data Sources

| Source     | File                             | Rows   | Date Range         | Purpose                |
| ---------- | -------------------------------- | ------ | ------------------ | ---------------------- |
| Harvest    | `harvest_time_report_*.xlsx`     | 23,255 | 2015-07 to 2022-07 | Raw time entries       |
| QuickSight | `personametry_quicksight_*.xlsx` | 26,498 | 2018-04 to 2024-09 | Transformed & enriched |
| QuickSight | `Personametry2024Extract.xlsx`   | 26,498 | Same as above      | Duplicate of above     |

---

## Schema: Harvest Raw (21 columns)

| Column       | Type     | Description                         |
| ------------ | -------- | ----------------------------------- |
| `Date`       | datetime | Entry date                          |
| `Client`     | string   | Always "Muhammad Khan (My Life)"    |
| `Project`    | string   | Always "RAGE Model Tracking"        |
| `Task`       | string   | Raw task name (needs normalization) |
| `Notes`      | string   | Free-text notes                     |
| `Hours`      | float    | Duration in hours                   |
| `Started At` | string   | Start time (often empty)            |
| `Ended At`   | string   | End time (often empty)              |

_Other columns (billable, invoiced, etc.) not used._

---

## Schema: QuickSight Transformed (22 columns)

| Column                   | Type     | Description        | Values                               |
| ------------------------ | -------- | ------------------ | ------------------------------------ |
| `Date`                   | datetime | Entry date         | -                                    |
| `Task`                   | string   | Original task name | -                                    |
| `Hours`                  | float    | Duration           | -                                    |
| `Started At`             | string   | Start time (HH:MM) | -                                    |
| `Ended At`               | string   | End time (HH:MM)   | -                                    |
| `Notes`                  | string   | Free-text notes    | -                                    |
| **`NormalisedTask`**     | string   | Standardized task  | 9 unique values                      |
| **`MetaWorkLife`**       | string   | Top-level category | `Work`, `Life`, `Sleep-Life`         |
| **`PrioritisedPersona`** | string   | Persona (P0-P6)    | 7 unique values                      |
| **`PersonaTier2`**       | string   | Simplified tier    | 6 unique values                      |
| `txDay`                  | string   | Day of week        | `_01 Monday`..`_07 Sunday`           |
| `txMonth`                | string   | Month name         | `Jan`..`Dec`                         |
| `txMonthNum`             | int      | Month number       | 1-12                                 |
| `txWeekNum`              | int      | Week number        | 1-52                                 |
| `txTypeofDay`            | string   | Day type           | `Weekday`, `Weekend`                 |
| `socialContext`          | string   | Social category    | `Professional-*`, `Personal-*`, `NA` |
| `socialEntity`           | string   | Person/group       | Various friend names                 |
| `txMeTimeBreakdown`      | string   | Me-time detail     | `Health/Fitness`, `Learning`, etc.   |
| `commuteContext`         | string   | Commute indicator  | `commuting`, `working`, `NA`         |

---

## Domain Model (TypeScript)

```typescript
// Core enums derived from actual data
export enum MetaWorkLife {
  WORK = "Work",
  LIFE = "Life",
  SLEEP_LIFE = "Sleep-Life",
}

export enum PrioritisedPersona {
  P0_LIFE_CONSTRAINTS = "P0 Life Constraints (Sleep)",
  P1_MUSLIM = "P1 Muslim",
  P2_INDIVIDUAL = "P2 Individual",
  P3_PROFESSIONAL = "P3 Professional",
  P4_HUSBAND = "P4 Husband",
  P5_FAMILY = "P5 Family",
  P6_FRIEND_SOCIAL = "P6 Friend Social",
}

export enum PersonaTier2 {
  REST_SLEEP = "Rest/Sleep",
  ME_TIME = "Me Time",
  WORK_TIME = "Work Time",
  FAMILY_TIME = "Family Time",
  HUSBAND_WIFE = "Husband/Wife",
  SOCIAL = "Social",
}

export enum NormalisedTask {
  REST_SLEEP = "[Individual] Rest n Sleep",
  SPIRITUALITY = "[Individual] Spirituality",
  ME_TIME = "[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)",
  HEALTH_FITNESS = "[Individual] Health, Fitness & Wellbeing",
  KNOWLEDGE = "[Individual] Knowledge-Base - Books/Video/Podcasts",
  WORK = "[Professional] Service Provider - Work/Job",
  FAMILY = "[Family-Man] Family Time (#Father #Brother #Son #Relatives)",
  HUSBAND = "[Husband] Marital/Wife #Husband",
  SOCIAL = "[Friend] Social",
}

// Time entry record
export interface TimeEntry {
  date: Date;
  task: string;
  normalisedTask: NormalisedTask;
  hours: number;
  startedAt?: string;
  endedAt?: string;
  metaWorkLife: MetaWorkLife;
  prioritisedPersona: PrioritisedPersona;
  personaTier2: PersonaTier2;
  notes?: string;
  socialContext?: string;
  socialEntity?: string;
  meTimeBreakdown?: string;
  commuteContext?: string;
  // Computed fields
  year: number;
  month: number;
  weekNum: number;
  dayOfWeek: string;
  typeOfDay: "Weekday" | "Weekend";
}
```

---

## Hours Summary (2018-2024)

| Year | Hours | Comment                           |
| ---- | ----- | --------------------------------- |
| 2018 | 8,820 | ~8,760 hrs/year expected (24×365) |
| 2019 | 8,761 | ✓ Full year                       |
| 2020 | 8,769 | ✓ Full year                       |
| 2021 | 8,711 | ✓ Full year                       |
| 2022 | 8,715 | ✓ Full year                       |
| 2023 | 8,797 | ✓ Full year                       |
| 2024 | 8,771 | ✓ Full year                       |
| 2025 | 8,737 | ✓ Full year                       |

**Total tracked: ~87,000+ hours across 10 years (2016-2025)**

---

## Hours by Persona (All Time)

| Persona                     | Hours  | %     |
| --------------------------- | ------ | ----- |
| P0 Life Constraints (Sleep) | 20,760 | 33.8% |
| P3 Professional             | 14,091 | 23.0% |
| P5 Family                   | 13,531 | 22.1% |
| P2 Individual               | 5,288  | 8.6%  |
| P1 Muslim                   | 4,776  | 7.8%  |
| P4 Husband                  | 2,184  | 3.6%  |
| P6 Friend Social            | 716    | 1.2%  |

---

## Hybrid ETL Pipeline Architecture

The system uses a **Hybrid Pipeline** that supports both automated API syncing and manual file uploads without data conflicts.

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID DATA DATA FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PATH A: Automated API Sync (Daily / Manual Trigger)           │
│   ───────────────────────────────────────────────────           │
│   • Source: Harvest API v2                                      │
│   • Script: data/etl/harvest_api_sync.py                        │
│   • Logic:  Incremental Fetch + 7-Day Lookback + Deduplication  │
│   • Output: data/processed/timeentries_harvest.json             │
│   • Commit: Auto-commits changes to git                         │
│                                                                 │
│   PATH B: Manual Legacy Upload (Fallback)                       │
│   ───────────────────────────────────────                       │
│   • Source: seedfiles/harvest_time_report.xlsx                  │
│   • Script: data/etl/harvest_to_json.py                         │
│   • Logic:  Full File Parse (Overwrites API data if triggered)  │
│   • Trigger: ONLY runs if Excel file changes                    │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT & SERVING                         │
│   (Bridge between Data Layer and Presentation Layer)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   PRODUCTION (GitHub Pages)                                     │
│   ──────────────────────────                                    │
│   • Workflow: .github/workflows/deploy.yml                      │
│   • Action: Copies data/processed/*.json → dist/data/           │
│                                                                 │
│   LOCAL DEV (npm run dev)                                       │
│   ───────────────────────                                       │
│   • Workflow: .agent/workflows/restart-dev.md                   │
│   • Action: Copies data/processed/*.json → public/data/         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1.  **Separation of Concerns**:

    - `data/processed/`: The **Database** (Source of Truth). Stored in Git.
    - `dashboard/public/`: The **Web Server Asset**. Served to the browser.
    - **Why?** Web servers (like `serve` or `npm run dev`) cannot access files outside their root for security. The pipeline "bridges" this gap by copying the file.

2.  **Conflict Prevention**:

    - The `deploy.yml` workflow uses strict **Path Filters**.
    - Automated Sync runs (modifying `harvest_api_sync.py`) do **NOT** trigger Path B (Legacy ETL).
    - This prevents the legacy script from blindly overwriting fresh API data with stale Excel data.

3.  **Retroactive Data Handling**:
    - The API Sync script uses a **7-Day Lookback Window**.
    - It fetches data from `[Last Sync Date] - 7 Days`.
    - This captures "forgot to log" entries from the past week without exceeding API rate limits.

---

## File Locations

```
personametry/
├── .github/workflows/
│   ├── harvest_sync.yml            # Automated API Sync Workflow
│   └── deploy.yml                  # Build & Deploy (Handles Data Copy)
├── seedfiles/
│   └── harvest_time_report.xlsx    # Legacy manual source
├── data/
│   ├── etl/
│   │   ├── harvest_api_sync.py     # Main Automation Script
│   │   └── harvest_to_json.py      # Legacy ETL Script
│   └── processed/
│       └── timeentries_harvest.json # The SINGLE Source of Truth
└── dashboard/
    └── public/
        └── data/                   # Web Server copy (gitignored or build artifact)
```
