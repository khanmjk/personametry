# Incident Response Runbook

## Data Pipeline Failures

### Symptom

- Dashboard Status Badge shows "Failing".
- "Data Loading Error" notification appears in the dashboard.
- "Refreshed" timestamp is stale (> 24 hours).

### Diagnosis

1.  Check **GitHub Actions** tab: [Harvest API Sync](https://github.com/khanmjk/personametry/actions/workflows/harvest_sync.yml)
2.  Examine the logs of the failed run. Common causes:
    - **API Rate Limit**: Harvest API 429 errors (usually temporary).
    - **Schema Change**: Harvest API changed response format.
    - **Invalid Data**: New data patterns causing transformation errors (e.g., `NaN` values - _fixed in Feb 2026 update_).

### Recovery Procedure

1.  **Manual Trigger**:
    - Go to [Harvest API Sync Workflow](https://github.com/khanmjk/personametry/actions/workflows/harvest_sync.yml).
    - Click **Run workflow** > **Branch: main** > **Run workflow**.
2.  **Verify**:
    - Wait for the run to complete (approx. 2 mins).
    - Check the Dashboard header for the "Refreshed" timestamp.

### Escalation

If manual trigger fails repeatedly, check `data/etl/harvest_api_sync.py` locally:

```bash
# Set credentials
export HARVEST_ACCESS_TOKEN="your_token"
export HARVEST_ACCOUNT_ID="your_account"

# Run locally to debug
python3 data/etl/harvest_api_sync.py
```
