# Personametry Vision Plan

**Your Personal Dashboard of Life, Powered by AI**

---

## The Vision

Personametry is a **personal analytics platform** that transforms how you understand and optimize your life through:

1. **Time-as-Currency Tracking** - Every hour accounted for across all life personas
2. **Multi-Dimensional Self-Awareness** - Work-life integration, not just balance
3. **AI-Powered Coaching** - Natural language insights about YOUR data

> "If time is our most valuable resource, do we not owe it to ourselves to account for it?"

---

## The Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                      PERSONAMETRY                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│    PERSONAS     │   RAGE MODEL    │    TIME ANALYTICS       │
│                 │                 │                         │
│  Who you are:   │  Your roadmap:  │  Where time goes:       │
│  - Muslim       │  - Reality      │  - Hours by persona     │
│  - Individual   │  - Aspirations  │  - YoY trends           │
│  - Professional │  - Goals        │  - Work-life ratio      │
│  - Husband      │  - Expectations │  - Pattern detection    │
│  - Family-Man   │                 │                         │
│  - Friend       │                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

---

## Product Evolution Roadmap

### v1.0 - Dashboard Shell (Completed 2024)

- React + Ant Design Pro dashboard
- Mock data visualization
- Separation of concerns architecture

### v1.1 - Real Data Integration (Live 2025/2026)

- **Harvest API Sync** (Automated Daily ETL)
- **Personametry Dashboard** replaces QuickSight
- Historical data spanning 2016-2026
- Full 10+ year dataset (87,000+ hours)

### v1.2 - AI-Insights Assistant 🤖

> **The ultimate goal: A truly personalized AI that knows YOU**

```
┌────────────────────────────────────────────────────────────┐
│                  AI-INSIGHTS ASSISTANT                      │
│                                                             │
│  "Am I overworking?"                                        │
│  ───────────────────────────────────────────────            │
│                                                             │
│  Based on your data from the last 6 months:                 │
│                                                             │
│  📊 You averaged 195 hours/month of work (vs 168 target)   │
│  📈 That's 16% above your benchmark                         │
│  📉 Your husband-time dropped 40% compared to last year    │
│                                                             │
│  💡 Recommendation: Consider blocking Fridays for family   │
│                                                             │
│  [Show Trend Chart]  [Compare Periods]  [Set Goal]         │
└────────────────────────────────────────────────────────────┘
```

#### RAG Architecture

- **Retrieval:** Pull relevant metrics, trends, and historical context
- **Augmentation:** Build persona-aware prompts with your actual data
- **Generation:** LLM produces insights tailored to YOUR life patterns

#### Example Questions

- "Am I sleeping enough this month?"
- "Which persona improved most in 2024?"
- "Summarize my year as if explaining to my wife"
- "How has my spirituality changed since COVID?"
- "Am I on track for my reading goal?"

### v2.0 - Goal Tracking & Coaching

- RAGE framework fully integrated (Use Cases 1-6)
- Goal setting with progress tracking
- Habit streaks and accountability
- Connect with mentors/coaches

### v3.0 - Social & Sharing

- Share specific life streams with family
- Anonymous benchmarking community
- Enterprise version for teams

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        VIEW LAYER                             │
│           React + Ant Design Pro + @ant-design/charts        │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                      SERVICE LAYER                            │
│    PersonaService | AnalyticsService | ComparisonService     │
│                    | AIContextProvider |                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                       DATA LAYER                              │
│          DataProvider (Abstract) → Concrete Providers        │
│          MockDataProvider | FileDataProvider | APIProvider   │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────┐
│                    ETL PIPELINE                               │
│          Harvest API → Python Syncer → JSON/Database         │
└──────────────────────────────────────────────────────────────┘
```

---

## AI Data Access Layer

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

---

## Why This Matters

After **10 years of manual tracking**, Personametry represents the culmination of a personal journey from:

- **Spreadsheets → Harvest** (2015-2018)
- **Harvest → QuickSight** (2018-2022)
- **QuickSight → ChatGPT** (2023)
- **ChatGPT → Personametry App** (2024-2025)

The goal has always been the same:

> **Intentional living through self-awareness, powered by data and AI.**

---

## References

- [Product Specification](./product-specification.md)
- [Research Summary](./research-summary.md)
- [Implementation Plan](../brain/*/implementation_plan.md)
- [Blog Posts](https://khanmjk-outlet.blogspot.com/search/label/personametry)
