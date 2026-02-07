
import pandas as pd
import json
import numpy as np

def reproduce():
    # Create a DataFrame with NaN
    df = pd.DataFrame([
        {'a': 1, 'b': np.nan},
        {'a': 2, 'b': 3.5}
    ])
    
    print("DataFrame:")
    print(df)
    
    # Convert to records
    records = df.to_dict('records')
    print("\nRecords:")
    print(records)
    
    # Dump to JSON
    json_output = json.dumps(records)
    print("\nJSON Output:")
    print(json_output)
    
    if "NaN" in json_output:
        print("\n✅ Reproduction Successful: JSON contains NaN")
    else:
        print("\n❌ Reproduction Failed: JSON does not contain NaN")

if __name__ == "__main__":
    reproduce()
