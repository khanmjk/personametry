#!/usr/bin/env python3
"""
Personametry ETL: Harvest to JSON
---------------------------------
Converts raw Harvest XLSX export to JSON format for the dashboard.
Replicates ALL QuickSight transformation logic to eliminate QuickSight dependency.

Usage:
    python harvest_to_json.py
    
Input:
    ../seedfiles/harvest_time_report_from2015-07-06to2022-07-31.xlsx

Output:
    ../data/processed/timeentries_harvest.json
"""

import pandas as pd
import json
from datetime import datetime
from pathlib import Path
import re

# Configuration
INPUT_FILE = Path(__file__).parent.parent.parent / "seedfiles" / "harvest_time_report_from2015-07-06to2022-07-31.xlsx"
OUTPUT_FILE = Path(__file__).parent.parent / "processed" / "timeentries_harvest.json"


# ============================================
# TRANSFORMATION MAPPINGS (from QuickSight)
# ============================================

# Task -> NormalisedTask mapping
TASK_NORMALIZATION = {
    '[Brother] Relationship with Siblings': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Business Owner] AS3 Time': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
    '[Consultant] New Client Engagements': '[Professional] Service Provider - Work/Job',
    '[Consultant] Service Provider Partners': '[Professional] Service Provider - Work/Job',
    '[Family-Man] Home Affairs / DIY': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Father] Relationship with AYK': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Father] Relationship with MJK': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Father] Relationship with SK': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Home Owner] Home Improvements / DIY': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
    '[Individual] Blogging': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
    '[Individual] Coding / Tech / Builder': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
    '[Individual] Driving Car Time': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Individual] Health & Fitness - Cycling n Running': '[Individual] Health, Fitness & Wellbeing',
    '[Investor] Wealth & Finances - Share Trading JSE': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
    '[Job Hunter] Job Hunting Companies': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
    '[Professional] Work Social Relationships': '[Professional] Service Provider - Work/Job',
    '[Software Professional] Searching for Growth': '[Professional] Service Provider - Work/Job',
    '[Son Bro-In-Law] Relationship with In-Laws': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Son] Relationship with Mommy': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    '[Uncle] Relationship with Nieces n Nephews': '[Family-Man] Family Time (#Father #Brother #Son #Relatives)',
    'zz [Community Member] Community NBHW Patrols': '[Friend] Social',
    '[Entrepreneur] Ideas / Networking': '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)',
}

# NormalisedTask -> PrioritisedPersona mapping
PERSONA_MAPPING = {
    '[Family-Man] Family Time (#Father #Brother #Son #Relatives)': 'P5 Family',
    '[Friend] Social': 'P6 Friend Social',
    '[Husband] Marital/Wife #Husband': 'P4 Husband',
    '[Individual] Health, Fitness & Wellbeing': 'P2 Individual',
    '[Individual] Knowledge-Base - Books/Video/Podcasts': 'P2 Individual',
    '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)': 'P2 Individual',
    '[Individual] Rest n Sleep': 'P0 Life Constraints (Sleep)',
    '[Individual] Spirituality': 'P1 Muslim',
    '[Professional] Service Provider - Work/Job': 'P3 Professional',
}

# PrioritisedPersona -> MetaWorkLife mapping
META_WORK_LIFE_MAPPING = {
    'P5 Family': 'Life',
    'P6 Friend Social': 'Life',
    'P4 Husband': 'Life',
    'P2 Individual': 'Life',
    'P0 Life Constraints (Sleep)': 'Sleep-Life',
    'P1 Muslim': 'Life',
    'P3 Professional': 'Work',
}

# NormalisedTask -> PersonaTier2 mapping
PERSONA_TIER2_MAPPING = {
    '[Family-Man] Family Time (#Father #Brother #Son #Relatives)': 'Family Time',
    '[Friend] Social': 'Social',
    '[Husband] Marital/Wife #Husband': 'Husband/Wife',
    '[Individual] Health, Fitness & Wellbeing': 'Me Time',
    '[Individual] Knowledge-Base - Books/Video/Podcasts': 'Me Time',
    '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)': 'Me Time',
    '[Individual] Rest n Sleep': 'Rest/Sleep',
    '[Individual] Spirituality': 'Me Time',
    '[Professional] Service Provider - Work/Job': 'Work Time',
}

# NormalisedTask -> txMeTimeBreakdown mapping
ME_TIME_BREAKDOWN_MAPPING = {
    '[Individual] Health, Fitness & Wellbeing': 'Health/Fitness',
    '[Individual] Knowledge-Base - Books/Video/Podcasts': 'Learning',
    '[Individual] Me Time (Bootup, Nothing, PC/Surfing, Journalling, Hobbies, Blogging, DIY, Netflix, Silence - Alone Time)': 'Alone Time (DIY, Hobbies, Writing)',
    '[Individual] Spirituality': 'Spiritual',
    '[Individual] Rest n Sleep': 'Rest/Sleep',
}

# Social context keywords (for socialContext field)
SOCIAL_CONTEXT_KEYWORDS = {
    'Professional-Coaching/Mentoring': ['mentor', 'coach'],
    'Professional-Networking': ['network', 'rayner', 'dallas', 'wadee', 'adhil patel visit', 'aadhil'],
}

# Social entity keywords (for socialEntity field)
SOCIAL_ENTITY_KEYWORDS = [
    ('mentoring', 'Asanda'),
    ('networking', 'General Networking'),
    ('nofal', 'Joburg Friends'),
    ('patel', 'Joburg Friends'),
    ('motorvations', 'Uni Friends'),
    ('hamza', 'Uni Friends'),
    ('salik', 'UK Friends'),
    ('justin', 'Justin'),
    ('asanda', 'Asanda'),
    ('phiona', 'Phiona'),
    ('farid', 'Farid'),
    ('andrew', 'Andrew Dallas'),
    ('india', 'India Friends'),
    ('divash', 'Divash'),
    ('mota', 'CPT Friends-Motas'),
    ('lambat', 'CPT Friends-Lambats'),
    ('sooliman', 'PMB Friends'),
    ('kola', 'CPT - Neighbours'),
    ('nizam', 'PMB Friends'),
    ('ashraf', 'Joburg Friends'),
    ('imran', 'Joburg Friends'),
    ('francois', 'Franky'),
    ('zeyn', 'PMB Friends'),
    ('nikhil', 'India Friends'),
    ('themba', 'Themba'),
    ('umar', 'Umar'),
    ('jarryd', 'Jarryd'),
    ('wayne', 'Wayne'),
    ('uncle ab', 'CPT - Neighbours'),
    ('brandon', 'CPT - Neighbours'),
    ('evane', 'Joburg Friends'),
    ('haseena', 'CPT Friends-New'),
    ('vaug', 'Vaugan'),
    ('leon', 'Vaugan'),
    ('iby', 'USA Friends'),
    ('rayner', 'Mark Rayner'),
    ('mosajee', 'Moosajee'),
]

# Day of week mapping (Python weekday to QuickSight format)
DAY_OF_WEEK_MAPPING = {
    0: '_01 Monday',
    1: '_02 Tuesday',
    2: '_03 Wednesday',
    3: '_04 Thursday',
    4: '_05 Friday',
    5: '_06 Saturday',
    6: '_07 Sunday',
}

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']


# ============================================
# TRANSFORMATION FUNCTIONS
# ============================================

def normalise_task(task: str) -> str:
    """Apply task normalization mapping."""
    return TASK_NORMALIZATION.get(task, task)


def get_prioritised_persona(normalised_task: str) -> str:
    """Get persona from normalised task."""
    return PERSONA_MAPPING.get(normalised_task, 'ERROR')


def get_meta_work_life(persona: str) -> str:
    """Get MetaWorkLife from persona."""
    return META_WORK_LIFE_MAPPING.get(persona, 'ERROR')


def get_persona_tier2(normalised_task: str) -> str:
    """Get PersonaTier2 from normalised task."""
    return PERSONA_TIER2_MAPPING.get(normalised_task, 'ERROR')


def get_tx_day(date: pd.Timestamp) -> str:
    """Get day of week in QuickSight format."""
    return DAY_OF_WEEK_MAPPING.get(date.weekday(), 'ERROR')


def get_type_of_day(tx_day: str) -> str:
    """Determine if weekday or weekend."""
    if tx_day in ['_06 Saturday', '_07 Sunday']:
        return 'Weekend'
    return 'Weekday'


def get_week_num(date: pd.Timestamp) -> int:
    """Calculate week number (ISO week)."""
    return date.isocalendar()[1]


def get_social_context(persona_tier2: str, notes: str) -> str:
    """Determine social context from notes."""
    if persona_tier2 != 'Social':
        return None
    
    if not notes or pd.isna(notes):
        return 'Personal-Nurturing Relationships'
    
    notes_lower = str(notes).lower()
    
    for context, keywords in SOCIAL_CONTEXT_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in notes_lower:
                return context
    
    return 'Personal-Nurturing Relationships'


def get_social_entity(persona_tier2: str, notes: str) -> str:
    """Determine social entity from notes."""
    if persona_tier2 != 'Social':
        return None
    
    if not notes or pd.isna(notes):
        return 'General-Nurturing Relationships'
    
    notes_lower = str(notes).lower()
    
    for keyword, entity in SOCIAL_ENTITY_KEYWORDS:
        if keyword.lower() in notes_lower:
            return entity
    
    return 'General-Nurturing Relationships'


def get_me_time_breakdown(persona_tier2: str, normalised_task: str) -> str:
    """Get Me Time breakdown if applicable."""
    if persona_tier2 != 'Me Time':
        return None
    
    return ME_TIME_BREAKDOWN_MAPPING.get(normalised_task, None)


def get_commute_context(persona_tier2: str, notes: str) -> str:
    """Determine commute context for work time."""
    if persona_tier2 != 'Work Time':
        return None
    
    if notes and not pd.isna(notes) and 'commute' in str(notes).lower():
        return 'commuting'
    
    return 'working'


def clean_notes(notes) -> str:
    """Clean notes field."""
    if pd.isna(notes) or notes == '':
        return None
    return str(notes)


# ============================================
# MAIN ETL FUNCTION
# ============================================

def convert_harvest_to_json():
    """Main conversion function - replicates QuickSight transformations."""
    print(f"Reading: {INPUT_FILE}")
    df = pd.read_excel(INPUT_FILE)
    print(f"Loaded {len(df)} rows")
    print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    
    # Apply transformations
    print("\nApplying transformations...")
    
    # Parse date
    df['date'] = pd.to_datetime(df['Date'])
    
    # Date components
    df['year'] = df['date'].dt.year
    df['month'] = df['date'].dt.month
    df['day'] = df['date'].dt.day
    df['isoDate'] = df['date'].dt.strftime('%Y-%m-%d')
    df['monthName'] = df['date'].dt.month.apply(lambda m: MONTH_NAMES[m - 1])
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
    
    # Social context (only for Social persona)
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
    
    # Commute context (only for Work)
    df['commuteContext'] = df.apply(
        lambda row: get_commute_context(row['personaTier2'], row['Notes']), axis=1
    )
    
    # Clean notes
    df['notesClean'] = df['Notes'].apply(clean_notes)
    
    # Handle Started At / Ended At (may be null in early data)
    df['startedAt'] = df['Started At'].apply(lambda x: str(x) if pd.notna(x) else None)
    df['endedAt'] = df['Ended At'].apply(lambda x: str(x) if pd.notna(x) else None)
    
    # Select output columns
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
    
    df_output = df[list(output_columns.keys())].rename(columns=output_columns)
    
    # Convert to records
    records = df_output.to_dict('records')
    
    # Clean up None/NaN values
    for record in records:
        for key, value in list(record.items()):
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
            "source": str(INPUT_FILE.name),
            "etlVersion": "harvest_to_json v1.0",
            "note": "Transformed from raw Harvest data using QuickSight logic"
        },
        "entries": records
    }
    
    # Write JSON
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f, indent=2, default=str)
    
    print(f"\n✅ Exported {len(records)} records to {OUTPUT_FILE}")
    print(f"Date range: {output['metadata']['dateRange']['start']} to {output['metadata']['dateRange']['end']}")
    
    # Validation: Check for ERROR values
    error_count = df_output[df_output['prioritisedPersona'] == 'ERROR'].shape[0]
    if error_count > 0:
        print(f"\n⚠️  WARNING: {error_count} records have 'ERROR' persona (unmapped tasks)")
        unmapped = df[df['prioritisedPersona'] == 'ERROR']['Task'].unique()
        print("  Unmapped tasks:")
        for task in unmapped[:10]:
            print(f"    - {task}")
    
    # Print summary statistics
    print("\n=== Summary by Persona ===")
    persona_summary = df.groupby('prioritisedPersona')['Hours'].sum().sort_values(ascending=False)
    for persona, hours in persona_summary.items():
        print(f"  {persona}: {hours:,.1f} hours")
    
    print("\n=== Summary by Year ===")
    yearly_summary = df.groupby('year')['Hours'].sum()
    for year, hours in yearly_summary.items():
        print(f"  {int(year)}: {hours:,.1f} hours")
    
    print("\n=== Summary by MetaWorkLife ===")
    meta_summary = df.groupby('metaWorkLife')['Hours'].sum()
    for meta, hours in meta_summary.items():
        print(f"  {meta}: {hours:,.1f} hours")


if __name__ == "__main__":
    convert_harvest_to_json()
