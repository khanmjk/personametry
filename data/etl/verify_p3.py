
import json
from pathlib import Path

# Paths
INPUT_FILE = Path(__file__).parent.parent / "processed" / "timeentries.json"

def analyze():
    if not INPUT_FILE.exists():
        print(f"File not found: {INPUT_FILE}")
        return

    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)
    
    entries = data.get('entries', [])
    p3_tasks = set()
    
    print(f"Total entries: {len(entries)}")
    
    p3_entries = [e for e in entries if e.get('prioritisedPersona') == 'P3 Professional']
    
    print(f"P3 Professional Entries: {len(p3_entries)}")
    
    # Sort by date
    p3_entries.sort(key=lambda x: x.get('date'))
    
    total_hours = sum(e.get('hours') or 0 for e in p3_entries)
    print(f"Total P3 Hours: {total_hours:,.1f}")
    
    has_end = [e for e in p3_entries if e.get('endedAt')]
    print(f"Entries with 'endedAt': {len(has_end)} ({len(has_end)/len(p3_entries)*100:.1f}%)")
    
    if has_end:
        first_with_end = min(has_end, key=lambda x: x.get('date'))
        last_with_end = max(has_end, key=lambda x: x.get('date'))
        print(f"Data with Time Range: {first_with_end.get('date')} to {last_with_end.get('date')}")
        
        # Check pre-2018
        pre_2018 = [e for e in p3_entries if e.get('year') < 2018]
        pre_2018_with_end = [e for e in pre_2018 if e.get('endedAt')]
        print(f"Pre-2018 Entries: {len(pre_2018)}")
        print(f"Pre-2018 with Time: {len(pre_2018_with_end)}")

if __name__ == "__main__":
    analyze()
