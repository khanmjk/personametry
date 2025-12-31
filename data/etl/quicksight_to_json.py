#!/usr/bin/env python3
"""
Personametry ETL Script
-----------------------
Converts QuickSight XLSX export to JSON format for the dashboard.

Usage:
    python quicksight_to_json.py
    
Input:
    ../seedfiles/personametry_quicksight_export_2018_to_2024_timetracking_v2.xlsx

Output:
    ../data/processed/timeentries.json
"""

import pandas as pd
import json
from datetime import datetime
from pathlib import Path

# Configuration
INPUT_FILE = Path(__file__).parent.parent.parent / "seedfiles" / "personametry_quicksight_export_2018_to_2024_timetracking_v2.xlsx"
OUTPUT_FILE = Path(__file__).parent.parent / "processed" / "timeentries.json"


def parse_date(date_str: str) -> str:
    """Convert QuickSight date format to ISO date string."""
    try:
        # Handle format like "Jan 1, 2018 12:00am"
        dt = pd.to_datetime(date_str)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return None


def convert_quicksight_to_json():
    """Main conversion function."""
    print(f"Reading: {INPUT_FILE}")
    df = pd.read_excel(INPUT_FILE)
    print(f"Loaded {len(df)} rows")
    
    # Parse dates and extract components
    df['date'] = pd.to_datetime(df['Date'])
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['day'] = df['date'].dt.day
    df['isoDate'] = df['date'].dt.strftime('%Y-%m-%d')
    
    # Select and rename columns for JSON output
    output_columns = {
        'isoDate': 'date',
        'year': 'year',
        'month': 'month',
        'day': 'day',
        'txDay': 'dayOfWeek',
        'txMonth': 'monthName',
        'txMonthNum': 'monthNum',
        'txWeekNum': 'weekNum',
        'txTypeofDay': 'typeOfDay',
        'Task': 'task',
        'NormalisedTask': 'normalisedTask',
        'MetaWorkLife': 'metaWorkLife',
        'PrioritisedPersona': 'prioritisedPersona',
        'PersonaTier2': 'personaTier2',
        'Hours': 'hours',
        'Started At': 'startedAt',
        'Ended At': 'endedAt',
        'Notes': 'notes',
        'txNotes': 'notesClean',
        'socialContext': 'socialContext',
        'socialEntity': 'socialEntity',
        'txMeTimeBreakdown': 'meTimeBreakdown',
        'commuteContext': 'commuteContext'
    }
    
    # Rename and select
    df_output = df[list(output_columns.keys())].rename(columns=output_columns)
    
    # Convert NaN to None for JSON
    df_output = df_output.where(pd.notnull(df_output), None)
    
    # Convert to records
    records = df_output.to_dict('records')
    
    # Clean up None values in records
    for record in records:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
    
    # Create output structure
    output = {
        "metadata": {
            "generatedAt": datetime.now().isoformat(),
            "recordCount": len(records),
            "dateRange": {
                "start": df_output['date'].min(),
                "end": df_output['date'].max()
            },
            "source": str(INPUT_FILE.name)
        },
        "entries": records
    }
    
    # Write JSON
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2, default=str)
    
    print(f"Exported {len(records)} records to {OUTPUT_FILE}")
    print(f"Date range: {output['metadata']['dateRange']['start']} to {output['metadata']['dateRange']['end']}")
    
    # Print summary statistics
    print("\n=== Summary by Persona ===")
    persona_summary = df.groupby('PrioritisedPersona')['Hours'].sum().sort_values(ascending=False)
    for persona, hours in persona_summary.items():
        print(f"  {persona}: {hours:,.1f} hours")
    
    print("\n=== Summary by Year ===")
    yearly_summary = df.groupby('year')['Hours'].sum()
    for year, hours in yearly_summary.items():
        print(f"  {int(year)}: {hours:,.1f} hours")


if __name__ == "__main__":
    convert_quicksight_to_json()
