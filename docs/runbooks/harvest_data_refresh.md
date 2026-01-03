# Harvest Data Refresh Runbook

## Automated Workflow (GitHub Actions)

```
User exports Harvest → Replace seedfiles/harvest_time_report.xlsx → git push → GitHub Action → Deploy
```

---

## Step-by-Step

### 1. Export from Harvest

1. Log into [Harvest](https://harvestapp.com)
2. Navigate to: **Reports → Time → Detailed Report**
3. Set date range: `2015-07-06` to `TODAY`
4. Export as **XLSX** (`harvest_time_report.xlsx`)

### 2. Replace Seed File

```bash
cp ~/Downloads/harvest_time_report.xlsx seedfiles/harvest_time_report.xlsx
```

### 3. Commit & Push

```bash
git add seedfiles/harvest_time_report.xlsx
git commit -m "data: Refresh Harvest data through $(date +%Y-%m-%d)"
git push origin main
```

### 4. GitHub Action Runs Automatically

- Detects change to `seedfiles/harvest_time_report.xlsx`
- Runs Python ETL → Generates `timeentries_harvest.json`
- Builds dashboard
- Deploys to https://personametry.com

---

## Manual Local Testing

```bash
# 1. Run ETL locally
cd data/etl
source venv/bin/activate  # Use existing venv
python harvest_to_json.py

# 2. Copy to dashboard public folder
cp ../processed/timeentries_harvest.json ../../dashboard/public/data/

# 3. Start dashboard
cd ../../dashboard
npm run start:dev

# 4. Verify at http://localhost:8000
```

---

## Troubleshooting

| Issue                    | Solution                                   |
| ------------------------ | ------------------------------------------ |
| GitHub Action fails      | Check workflow logs in GitHub Actions tab  |
| ETL error: unmapped task | Add mapping to `harvest_to_json.py`        |
| Missing Python deps      | `pip install -r data/etl/requirements.txt` |
| Local venv not found     | `python3 -m venv data/etl/venv`            |

---

## File Locations

| File                                      | Purpose                        |
| ----------------------------------------- | ------------------------------ |
| `seedfiles/harvest_time_report.xlsx`      | Raw Harvest export (canonical) |
| `data/etl/harvest_to_json.py`             | ETL script                     |
| `data/processed/timeentries_harvest.json` | Transformed JSON               |
| `.github/workflows/deploy.yml`            | CI/CD workflow                 |
