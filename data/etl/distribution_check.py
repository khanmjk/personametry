import json
import pandas as pd
import numpy as np
import scipy.stats as stats

# Load data
with open('data/processed/timeentries_harvest.json', 'r') as f:
    data = json.load(f)

df = pd.DataFrame(data['entries'])

# Filter for P0 (Sleep) and P3 (Work)
p0_df = df[df['prioritisedPersona'] == 'P0 Life Constraints (Sleep)']
p3_df = df[df['prioritisedPersona'] == 'P3 Professional']

def analyze_persona(name, df):
    # Group by date to get daily totals
    daily = df.groupby('date')['hours'].sum()
    
    # Basic stats
    mean = daily.mean()
    std = daily.std()
    skew = daily.skew()
    kurt = daily.kurtosis()
    
    print(f"\n--- {name} Analysis ---")
    print(f"Count (Days): {len(daily)}")
    print(f"Mean: {mean:.2f}h")
    print(f"StdDev: {std:.2f}h")
    print(f"Skewness: {skew:.2f} (0 = normal)")
    print(f"Kurtosis: {kurt:.2f} (3 = normal)")
    
    # Shapiro-Wilk test (on a sample if large)
    # stat, p = stats.shapiro(daily.sample(min(5000, len(daily))))
    # print(f"Normal Test p-value: {p:.4f} (>0.05 looks normal)")

analyze_persona("P0 Sleep", p0_df)
analyze_persona("P3 Work", p3_df)
