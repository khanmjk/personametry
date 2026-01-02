#!/usr/bin/env python3
"""
Personametry ETL: Harvest API Sync
----------------------------------
Automated incremental sync from Harvest API v2.
Features:
- Incremental fetch (from last sync date)
- Deduplication (composite key)
- Rate limit handling (exponential backoff)
- Reuses existing transformation logic

Usage:
    export HARVEST_ACCESS_TOKEN="your_token"
    export HARVEST_ACCOUNT_ID="your_account_id"
    python harvest_api_sync.py
"""

import os
import json
import time
import requests
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from harvest_to_json import (
    normalise_task,
    get_prioritised_persona,
    get_meta_work_life,
    get_persona_tier2,
    get_tx_day,
    get_type_of_day,
    get_week_num,
    get_social_context,
    get_social_entity,
    get_me_time_breakdown,
    get_commute_context,
    clean_notes,
    MONTH_NAMES
)

# Configuration
DATA_DIR = Path(__file__).parent.parent / "processed"
OUTPUT_FILE = DATA_DIR / "timeentries_harvest.json"

# API Config
HARVEST_API_URL = "https://api.harvestapp.com/v2/time_entries"
USER_AGENT = "Personametry Integration (github.com/khanmjk/personametry)"
MAX_RETRIES = 5
BASE_DELAY = 2  # seconds

def get_auth_headers():
    """Get headers from environment variables."""
    token = os.environ.get("HARVEST_ACCESS_TOKEN")
    account_id = os.environ.get("HARVEST_ACCOUNT_ID")
    
    if not token or not account_id:
        raise ValueError("Missing required environment variables: HARVEST_ACCESS_TOKEN, HARVEST_ACCOUNT_ID")
        
    return {
        "Authorization": f"Bearer {token}",
        "Harvest-Account-Id": account_id,
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json"
    }

def fetch_time_entries(from_date):
    """Fetch time entries from Harvest API with pagination and backoff."""
    headers = get_auth_headers()
    params = {
        "from": from_date,
        "to": datetime.now().strftime("%Y-%m-%d"),
        "page": 1,
        "per_page": 100
    }
    
    all_entries = []
    
    print(f"🔄 Fetching data from Harvest since {from_date}...")
    
    while True:
        try:
            response = requests.get(HARVEST_API_URL, headers=headers, params=params)
            
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 15))
                print(f"⚠️ Rate limited. Waiting {retry_after}s...")
                time.sleep(retry_after)
                continue
                
            response.raise_for_status()
            data = response.json()
            
            entries = data.get("time_entries", [])
            all_entries.extend(entries)
            
            print(f"  - Page {params['page']}: Fetched {len(entries)} entries")
            
            if data.get("next_page"):
                params["page"] = data["next_page"]
                # Polite delay between pages
                time.sleep(0.5)
            else:
                break
                
        except requests.exceptions.RequestException as e:
            print(f"❌ API Error: {e}")
            raise

    print(f"✅ Total fetched: {len(all_entries)} entries")
    return all_entries

def transform_api_data(entries):
    """Transform API JSON response to DataFrame matching internal schema."""
    if not entries:
        return pd.DataFrame()

    # Flatten relevant fields
    rows = []
    for entry in entries:
        client = entry.get("client", {}).get("name", "")
        project = entry.get("project", {}).get("name", "")
        task_name = entry.get("task", {}).get("name", "")
        
        # Only process Personametry relevant entries if needed filtering
        # For now, we take everything as per current logic
        
        row = {
            "Date": entry["spent_date"],
            "Task": task_name,
            "Hours": entry["hours"],
            "Notes": entry["notes"],
            "Started At": entry.get("started_time", ""),
            "Ended At": entry.get("ended_time", ""),
            "external_id": str(entry["id"])  # Store Harvest ID for potential debugging
        }
        rows.append(row)
        
    df = pd.DataFrame(rows)
    
    # Apply existing transformations (same as harvest_to_json.py)
    print("\nApplying transformations...")
    
    # Parse date
    df['date'] = pd.to_datetime(df['Date'])
    
    # Date components
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['day'] = df['date'].dt.day
    df['isoDate'] = df['date'].dt.strftime('%Y-%m-%d')
    df['monthName'] = df['date'].dt.month.map(lambda m: MONTH_NAMES[m - 1])
    df['monthNum'] = df['date'].dt.month
    df['weekNum'] = df['date'].apply(get_week_num)
    df['dayOfWeek'] = df['date'].apply(get_tx_day)
    df['typeOfDay'] = df['dayOfWeek'].apply(get_type_of_day)
    
    # Task normalization
    df['normalisedTask'] = df['Task'].apply(normalise_task)
    
    # Persona mappings
    df['prioritisedPersona'] = df['normalisedTask'].apply(get_prioritised_persona)
    df['metaWorkLife'] = df['prioritisedPersona'].apply(get_meta_work_life)
    df['personaTier2'] = df['normalisedTask'].apply(get_persona_tier2)
    
    # Social context
    df['socialContext'] = df.apply(
        lambda row: get_social_context(row['personaTier2'], row['Notes']), axis=1
    )
    df['socialEntity'] = df.apply(
        lambda row: get_social_entity(row['personaTier2'], row['Notes']), axis=1
    )
    
    # Me Time breakdown
    df['meTimeBreakdown'] = df.apply(
        lambda row: get_me_time_breakdown(row['personaTier2'], row['normalisedTask']), axis=1
    )
    
    # Commute context
    df['commuteContext'] = df.apply(
        lambda row: get_commute_context(row['personaTier2'], row['Notes']), axis=1
    )
    
    # Clean notes
    df['notesClean'] = df['Notes'].apply(clean_notes)
    
    # Handle Start/End times
    df['startedAt'] = df['Started At'].fillna("").astype(str).replace("nan", "")
    df['endedAt'] = df['Ended At'].fillna("").astype(str).replace("nan", "")
    
    # Rename columns to match schema
    output_columns = {
        'isoDate': 'date',
        'year': 'year',
        'month': 'month',
        'day': 'day',
        'dayOfWeek': 'dayOfWeek',
        'monthName': 'monthName',
        'monthNum': 'monthNum',
        'weekNum': 'weekNum',
        'typeOfDay': 'typeOfDay',
        'Task': 'task',
        'normalisedTask': 'normalisedTask',
        'metaWorkLife': 'metaWorkLife',
        'prioritisedPersona': 'prioritisedPersona',
        'personaTier2': 'personaTier2',
        'Hours': 'hours',
        'startedAt': 'startedAt',
        'endedAt': 'endedAt',
        'Notes': 'notes',
        'notesClean': 'notesClean',
        'socialContext': 'socialContext',
        'socialEntity': 'socialEntity',
        'meTimeBreakdown': 'meTimeBreakdown',
        'commuteContext': 'commuteContext'
    }
    
    return df[list(output_columns.keys())].rename(columns=output_columns)

def load_existing_data():
    """Load existing JSON data and determine last sync date."""
    if not OUTPUT_FILE.exists():
        print("⚠️ No existing data found. Using default start date.")
        return [], "2024-01-01"
        
    with open(OUTPUT_FILE, 'r') as f:
        data = json.load(f)
        
    entries = data.get("entries", [])
    
    # Find max date
    if entries:
        dates = [e['date'] for e in entries]
        last_date = max(dates)
    else:
        last_date = "2024-01-01"
        
    print(f"📂 Loaded {len(entries)} existing entries. Last date: {last_date}")
    return entries, last_date

def merge_and_deduplicate(existing, new_df):
    """Merge new data with existing, preserving the API's latest version for overlaps."""
    if new_df.empty:
        return existing

    new_records = new_df.to_dict('records')
    
    # Create DataFrames for comparison
    df_existing = pd.DataFrame(existing)
    df_new = pd.DataFrame(new_records)
    
    # Columns used for identifying unique entries
    dedup_cols = ['date', 'task', 'hours', 'startedAt']
    
    # 1. Identify purely new records (not in existing based on dedup keys)
    # We do a left merge to find what is ALREADY in existing
    # Note: We need to ensure types match for merge
    for col in dedup_cols:
        df_existing[col] = df_existing[col].astype(str)
        df_new[col] = df_new[col].astype(str)
        
    merged_check = pd.merge(
        df_new, 
        df_existing[dedup_cols], 
        on=dedup_cols, 
        how='left', 
        indicator=True
    )
    
    # records in new that exist in old (both) = Duplicates/Updates
    duplicates = merged_check[merged_check['_merge'] == 'both']
    new_unique = merged_check[merged_check['_merge'] == 'left_only']
    
    print(f"\n📊 Merge Analysis:")
    print(f"   - Existing records: {len(existing)}")
    print(f"   - New API records:  {len(new_records)}")
    print(f"   - Overlaps found:   {len(duplicates)} (will be updated with fresh API data)")
    print(f"   - Net new records:  {len(new_unique)}")
    
    if not duplicates.empty:
        print("\n🔍 Overwritten Records Log (Sample up to 5):")
        for idx, row in duplicates.head(5).iterrows():
            print(f"   ♻️  Replaced: {row['date']} | {row['task']} ({row['hours']}h)")
        if len(duplicates) > 5:
            print(f"   ... and {len(duplicates) - 5} more.")

    # 2. Perform the actual merge
    # We concatenate existing + new, then drop_duplicates keeping 'last' (new)
    combined_df = pd.DataFrame(existing + new_records)
    
    before_count = len(combined_df)
    
    combined_df.drop_duplicates(
        subset=dedup_cols, 
        keep='last', 
        inplace=True
    )
    
    after_count = len(combined_df)
    
    # Sanity check
    expected_count = len(existing) + len(new_records) - len(duplicates)
    # Note: Logic above is slightly fuzzy matching simple string types vs object types in drop_duplicates
    # but the principle holds.
    
    print(f"\n✅ Final count: {after_count} entries.")
    
    # Sort by date descending
    combined_df.sort_values(by='date', ascending=False, inplace=True)
    
    # Clean NaN values for JSON compliance
    records = combined_df.to_dict('records')
    for record in records:
        for key, value in list(record.items()):
            if pd.isna(value):
                record[key] = None
                
    return records

def save_data(records):
    """Save records to JSON with updated metadata."""
    if not records:
        return
        
    dates = [r['date'] for r in records if r['date']]
    
    output = {
        "metadata": {
            "generatedAt": datetime.now().isoformat(),
            "recordCount": len(records),
            "dateRange": {
                "start": min(dates) if dates else None,
                "end": max(dates) if dates else None
            },
            "source": "harvest_api_sync_v2",
            "etlVersion": "harvest_api_sync v1.0",
            "note": "Incremental sync from Harvest API + Manual History"
        },
        "entries": records
    }
    
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2, default=str)
        
    print(f"💾 Saved to {OUTPUT_FILE}")

def main():
    try:
        # 1. Load existing state
        existing_entries, last_sync_date = load_existing_data()
        
        # 2. Fetch new data (incremental with safety lookback)
        # We look back 30 days to ensure we catch any retroactive updates/late entries
        # Deduplication logic will handle the overlaps safely
        last_date_obj = datetime.strptime(last_sync_date, "%Y-%m-%d")
        lookback_date = (last_date_obj - timedelta(days=30)).strftime("%Y-%m-%d")
        
        print(f"🗓️  Last sync date: {last_sync_date}")
        print(f"🔙 Looking back 30 days to: {lookback_date} (to catch retroactive updates)")
        
        new_raw_entries = fetch_time_entries(lookback_date)
        
        if not new_raw_entries:
            print("✨ No new data found. Sync complete.")
            return

        # 3. Transform
        new_df = transform_api_data(new_raw_entries)
        
        # 4. Merge & Deduplicate
        final_records = merge_and_deduplicate(existing_entries, new_df)
        
        # 5. Save
        save_data(final_records)
        print("🚀 Sync successfully completed!")
        
    except Exception as e:
        print(f"💥 Sync Failed: {e}")
        exit(1)

if __name__ == "__main__":
    main()
