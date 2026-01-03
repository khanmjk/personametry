# Harvest API Integration Guide

This document details how Personametry integrates with the Harvest API v2 to automate data ingestion.

---

## 1. Connection Details

### Authentication

The integration uses **Personal Access Tokens**.

- **Header**: `Authorization: Bearer <TOKEN>`
- **Header**: `Harvest-Account-Id: <ACCOUNT_ID>`

### Secrets

Credentials are stored in GitHub Secrets (for CI/CD) and local `.env` (for development):

- `HARVEST_ACCESS_TOKEN`
- `HARVEST_ACCOUNT_ID`

---

## 2. API Usage

### Endpoint

**`GET https://api.harvestapp.com/v2/time_entries`**

We use the Time Entries endpoint because it is the only endpoint that provides granular data (Notes, Start Time, End Time) required for Personametry's logic.

### Filter Parameters

| Parameter  | Value                       | Purpose                                    |
| :--------- | :-------------------------- | :----------------------------------------- |
| `from`     | `{Last Sync Date} - 7 Days` | Fetch data since last sync + safety buffer |
| `to`       | `Today`                     | Capture up-to-the-minute entries           |
| `per_page` | `100`                       | Maximize data per request                  |
| `page`     | `1..N`                      | Pagination handling                        |

### Rate Limits

- **Limit**: 100 requests per 15 minutes.
- **Handling**: The script (`harvest_api_sync.py`) implements automatic **exponential backoff** if a `429 Too Many Requests` status is received.
- **Usage**: A typical daily sync uses ~1-2 requests (1% of quota).

---

## 3. Sync Logic

### The "Safe Incremental" Strategy

Instead of fetching the "Current Month" every time (which grows linearly in cost), we use an efficient incremental approach with a safety window.

1.  **Determine Last Sync**: Read `data/processed/timeentries_harvest.json` to find the latest date.
2.  **Lookback Window**: Subtract **7 Days** from the last sync date.
    - _Why?_ To capture "late entries" (e.g., you logged Friday's time on Monday).
3.  **Fetch**: Retrieve all entries from that Lookback Date.
4.  **Deduplicate**: Merge new data with existing data.

### Deduplication (Critical)

To prevent duplicates when fetching overlapping dates (the 7-day window):

- **Primary Key**: `external_id` (Harvest Entry ID).
- **Rule**: If an Incoming Record has the same ID as an Existing Record, the Existing Record is **Updated** (replaced).
- **Benefit**: This correctly handles cases where you edit Hours or Notes for a past entry.

---

## 4. Schema Mapping

The raw API response is transformed into the Personametry Schema.

| Personametry Field | Harvest API Field | Notes                              |
| :----------------- | :---------------- | :--------------------------------- |
| `external_id`      | `id`              | Unique ID (Used for deduplication) |
| `date`             | `spent_date`      | YYYY-MM-DD                         |
| `hours`            | `hours`           | Decimal hours                      |
| `task`             | `task.name`       | Raw task name                      |
| `notes`            | `notes`           | Used for Persona classification    |
| `startedAt`        | `started_time`    | Optional HH:MM                     |
| `endedAt`          | `ended_time`      | Optional HH:MM                     |

---

## 5. Execution

### Automated (GitHub Actions)

- **Workflow**: `.github/workflows/harvest_sync.yml`
- **Schedule**: Daily at 09:00 SAST (07:00 UTC).
- **Trigger**: Also runs manually via "Run Workflow" button.

### Local (Manual Analysis)

You can run the script locally if you have Python and the secrets set.

```bash
export HARVEST_ACCOUNT_ID="your_id"
export HARVEST_ACCESS_TOKEN="your_token"
python data/etl/harvest_api_sync.py
```
