# Personametry

![Version](https://img.shields.io/badge/release-v1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

**Personametry** is a personal time tracking analytics dashboard that transforms raw time-tracking data (Harvest) into deep, persona-based life insights. It's designed to answer the question: _"How am I actually spending my life?"_

Built with **React**, **Ant Design Pro**, and **Python**.

## 🚀 Features (V1.0.0)

### 📊 Executive Dashboard

A high-level view of your life's balance.

- **Wheel of Life**: Radial chart visualizing time allocation across key life areas (Work, Sleep, Family, Health).
- **Core KPIs**: Tracking daily averages against goals for Productivity and Self-Investment.
- **Monthly Trends**: Year-over-year comparison bars to spot seasonal changes.

### 🌙 Sleep & Life Constraints

Deep analytics for your most critical biological constraint.

- **Sleep Health Heatmap**: A "year-at-a-glance" view of daily sleep quality (Red/Amber/Green).
- **Schedule Analysis**: Calculates your generic "Bedtime" and "Wake Up" times using circular averaging.
- **Siesta Tracking**: Insights into nap patterns, split by Weekday vs Weekend.

### 💼 Work Patterns

Insights into professional habits.

- **Deep Work Analysis**: Heatmaps of intense work periods.
- **Burnout Detection**: Tracking "Late Days" and long work streaks.
- **Gains & Losses**: Waterfall charts showing year-over-year changes in professional time investment.

### 🧘 Individual & Self-Investment

- **RAG Scoring**: Weekly "Red-Amber-Green" scoring for personal goals (Reading, Fitness, Learning).
- **Streak Tracking**: Gamification of positive habits.

---

## 🛠️ Technology Stack

### Frontend (Dashboard)

- **Framework**: React 19, TypeScript
- **UI System**: Ant Design Pro (v6), Ant Design Charts (G2Plot)
- **Build Tool**: UmiJS / Webpack

### Data Pipeline (ETL)

- **Language**: Python 3.x
- **Source**: Harvest Time Tracking (via API/XLSX)
- **Process**:
  1.  `harvest_to_json.py`: Normalizes raw entries, maps tasks to "Personas" (P1, P2, P3), and applies social context heuristics.
  2.  JSON bundles (`timeentries.json`) serve as the static database for the frontend.

---

## 🏁 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Python 3.x (for data refresh)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/khanmjk/personametry.git
    cd personametry
    ```

2.  **Install Frontend Dependencies**

    ```bash
    cd dashboard
    npm install
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```
    The dashboard will launch at `http://localhost:8000`.

---

## 📂 Repository Structure

- `dashboard/`: The React application.
  - `src/pages/`: Analytics views (Sleep, Work, Personas).
  - `src/services/`: Data fetching and in-memory aggregation logic.
- `data/etl/`: Python ETL scripts.
- `docs/`: Product specifications and architectural decisions.

---

## 📄 License

This project is licensed under the MIT License.
