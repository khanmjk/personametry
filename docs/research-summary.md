# Personametry Research Summary

_Compiled: December 31, 2024_  
_Source: Blog posts (2015-2025) and Product Specification Document_

---

## Executive Summary

**Personametry** is a personal analytics platform concept that Muhammad Khan has been developing conceptually since 2015 and has been actively _using_ for over 10 years through manual tracking with Harvest and visualization through QuickSight/AI tools.

### The Vision

> "Your own personal dashboard of life. A complete personal assistant to help achieve a well-balanced life. A personal life coach in your pocket."

### Current State

- **Data Collection:** 10 years of hourly time tracking data
- **Analysis Tools:** Evolved from QuickSight to ChatGPT/Claude/Gemini
- **Proven Value:** Consistent year-over-year tracking has enabled intentional life changes

---

## 10 Years of Insights (2015-2024)

### 2024 Key Metrics (from latest blog post)

| Persona           | Hours  | Trend           |
| ----------------- | ------ | --------------- |
| Professional Work | 825.54 | ↑ 50.3% vs 2023 |
| Family Time       | 488.14 | ↑ 19.4% vs 2023 |
| Sleep             | 857.69 | ↓ 5.1% vs 2023  |
| Muslim Practices  | 418.30 | ↓ 16.5% vs 2023 |
| Individual Time   | 207.58 | ↓ 38.9% vs 2023 |
| Husband Time      | 80.00  | ↓ 40% vs 2023   |

### Typical Year Breakdown (2023 example)

- **Rest and Sleep:** 2,856 hours
- **Professional Work:** 2,051 hours
- **Family Time:** 1,399 hours
- **Spirituality:** 1,106 hours
- **Personal Time:** 468 hours
- **Marital/Wife:** 452 hours
- **Learning:** 203 hours
- **Health & Fitness:** 145 hours
- **Social:** 117 hours

---

## AI Integration Experiments (2023-2024)

### ChatGPT + Noteable (July 2023)

Successfully used ChatGPT with data analysis plugins to answer 33+ detailed questions including:

1. Stats tables showing hours logged per task by year
2. Bar graphs of MetaWorkLife time distribution
3. Dashboard scorecards for each persona (5-year view)
4. Work-life balance pie charts
5. Year-over-year comparison tables with up/down indicators
6. Waterfall charts showing persona contribution changes
7. Heat maps of work hours (168 hours/month benchmark)
8. Sleep analysis
9. Health & fitness tracking
10. Social context analysis

### Tools Evaluated

| Tool       | Purpose    | Notes                                    |
| ---------- | ---------- | ---------------------------------------- |
| Harvest    | Time input | Primary data source                      |
| QuickSight | Dashboards | Initial visualization platform           |
| ChatGPT    | Analysis   | Natural language queries                 |
| Noteable   | Notebooks  | Python-powered analysis                  |
| Claude     | Analysis   | Alternative AI                           |
| Gemini     | Analysis   | Alternative AI                           |
| NotebookLM | Documents  | Context understanding                    |
| Deepnote   | Notebooks  | Alternative to Noteable (after shutdown) |

### Lessons Learned from AI Analysis

1. Tools are powerful but still early days
2. CSV works better than XLS for data loading
3. Coaxing on dataset nature produces better insights
4. No code editing needed - immediate empowerment
5. Don't trust every output - AI gets math wrong sometimes
6. Amazing results from simple, clear prompting
7. "Flow state" experience when learning

---

## Framework Summary

### The RAGE Model

```
┌─────────────────────────────────────────────────────────────┐
│                        RAGE MODEL                           │
├─────────────┬───────────────────────────────────────────────┤
│  Reality    │ Current situation - brutal honesty            │
├─────────────┼───────────────────────────────────────────────┤
│ Aspirations │ Ultimate wishes - "As a [X], I want [Y]..."   │
├─────────────┼───────────────────────────────────────────────┤
│   Goals     │ Roadmap entries - measurable milestones       │
├─────────────┼───────────────────────────────────────────────┤
│Expectations │ Commitment level - confidence percentage      │
└─────────────┴───────────────────────────────────────────────┘
```

### Persona Hierarchy

```
                    WORK-LIFE INTEGRATION
                           │
           ┌───────────────┴───────────────┐
           │                               │
      LIFE STREAMS                    WORK STREAMS
           │                               │
    ┌──────┴──────┐                       │
    │             │                       │
 P0 Life      Personal               Professional
Constraints   Personas                Personas
    │             │                       │
    │      ┌──────┼──────┐               │
    ▼      ▼      ▼      ▼               ▼
  Sleep  Muslim  Individual            P3 Work
         (P1)    (P2)                     │
                   │               ┌──────┼──────┐
            ┌──────┼──────┐        ▼      ▼      ▼
            ▼      ▼      ▼     Main   Colleague Entrepreneur
         Health Learning Hobbies  Job
                   │
           ┌───────┴───────┐
           ▼               ▼
      P4 Husband    P5 Family-Man
                          │
                   ┌──────┴──────┐
                   ▼             ▼
              P6 Friend       Extended
               Social          Family
```

---

## Key Analytics Questions Answered

### Work Analysis

- Am I overworking? (Benchmark: 168 hours/month)
- Which year did I work most/least?
- Average daily work hours by year
- Weekend work frequency
- Work start/end time patterns
- Extra hours worked (income opportunity cost)

### Life Balance Analysis

- Work-life balance score
- Persona time distribution pie chart
- Year-over-year trend indicators
- Heat map of hours by persona
- Watershed years for positive change

### Specific Persona Analysis

- Spirituality trends over time
- Family time quality
- Social engagement patterns
- "Real me time" (individual - sleep)
- Husband role investment
- Health & fitness commitment

---

## Product MVP Scope

### Essential Features (Use Cases 1-6)

1. **Persona Setup** - Define personal and work roles
2. **Aspiration Mapping** - Long-term wishlists per persona
3. **Priority Ranking** - Surface conflicts, make tradeoffs
4. **Goal Setting** - Break aspirations into measurable chunks
5. **Expectations** - Set commitments and habits
6. **Time Tracking** - Import/log hours by persona

### Dashboard Elements

- Wheel of Life visualization
- Persona scorecard over time
- Year-over-year comparison tables
- Work-life balance indicators
- Trend charts and heat maps
- KPI alerts and recommendations

### AI/ML Features (Phase 2)

- Natural language querying of personal data
- Automated insights and recommendations
- Anomaly detection (overworking alerts)
- "Who Am I" summary generation
- Pattern recognition and coaching

---

## Technical Considerations

### Data Schema (from Harvest exports)

```
{
  "Date": "2024-01-15",
  "NormalisedTask": "[Individual] Health, Fitness & Wellbeing",
  "PersonaTier2": "P2 Individual",
  "MetaWorkLife": "Life",
  "StartedAt": "06:00",
  "EndedAt": "07:30",
  "Hours": 1.5,
  "SocialContext": "Solo",
  "SocialEntity": null,
  "Notes": "Morning gym session"
}
```

### Key Metrics & Benchmarks

| Metric             | Benchmark | Source                |
| ------------------ | --------- | --------------------- |
| Monthly work hours | 168 hours | Consultant standard   |
| Weekly work target | 40 hours  | Standard work week    |
| Daily sleep target | 7-8 hours | Health recommendation |
| Weekly exercise    | 5+ hours  | Personal goal         |
| Annual books read  | 24 books  | Personal goal         |

---

## Sources

### Primary Documents

- [Product Specification (Google Doc)](https://docs.google.com/document/d/1imYJ4_KSc3SK7ecD0UCQ0YCoKtSiR9uGSj0sC8Jjlqo/)
- [Blog: Personametry Label](https://khanmjk-outlet.blogspot.com/search/label/personametry)

### Key Blog Posts

- [2025: Where did my time go in 2024?](https://khanmjk-outlet.blogspot.com/2025/01/where-did-my-time-go-in-2024-sharing-my.html)
- [2024: First Quadrimester Analysis](https://khanmjk-outlet.blogspot.com/2024/05/24-personametry-first-quadrimester-jan.html)
- [2023: Personametry + ChatGPT](https://khanmjk-outlet.blogspot.com/2023/07/personametry-chatgpt-personametryai.html)
- [2023: 2022 Work/Life Balance Update](https://khanmjk-outlet.blogspot.com/2023/01/2022-personametry-tracking-worklife.html)
- [2022: Diving Deeper with Analytics](https://khanmjk-outlet.blogspot.com/2022/01/diving-deeper-with-personal-analytics.html)
- [2016: RAGE Model](https://khanmjk-outlet.blogspot.com/2016/02/my-rage-model-for-personal-development.html)
- [2015: Personal Metrics - The Next Big Thing?](https://khanmjk-outlet.blogspot.com/2015/10/personal-metrics-leading-to-self-aware.html)

---

## Technical Feasibility: Harvest API Analysis

### Research Objective

Determine if a simpler "Current Month" API endpoint exists to replace or augment the "7-Day Lookback" incremental sync strategy.

### API Options Evaluated

| Endpoint                      | Description                | Pros                                                                              | Cons                                                                                 |
| :---------------------------- | :------------------------- | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **`v2/time_entries`**         | Granular time entry list   | Contains ALL fields (Notes, Start/End, Task IDs). Supports `from`/`to` filtering. | Requires pagination for large ranges.                                                |
| **`v2/reports/time/clients`** | Aggregated hours by client | Simple summary. Fast.                                                             | **Lacks Details**: No Notes, No Start/End times. Useless for Persona classification. |
| **`v2/user_assignments`**     | Project assignment list    | Good for project metadata.                                                        | Does not contain time entries or hours logged.                                       |

### Strategy Comparison

#### Option A: Incremental Sync (Current)

- **Logic**: Fetch `[Last Sync] - 7 Days`.
- **Pros**: Constant API cost (always ~1 page). Scalable indefinitely.
- **Cons**: Requires local state (JSON file) to know "Last Sync".

#### Option B: "Current Month" Fetch

- **Logic**: Fetch `from=YYYY-MM-01` to `to=YYYY-MM-DD`.
- **Pros**: Stateless (doesn't care about last sync). Self-correcting for the whole month.
- **Cons**: API cost grows linearly. On Jan 31st, we fetch 31 days (multiple pages) every time.

### Recommendation

**Stick with Option A (v2/time_entries + Incremental)** for automation efficiency. However, for "Analysis Mode" or debugging, Option B is fully supported by the API and can be manually triggered by simple URL checks.
