import os
import pandas as pd

# Set your data directory path
data_dir = 'final_datasets'

# Loop through all CSV files in the directory
for filename in os.listdir(data_dir):
    if filename.endswith('.csv'):
        file_path = os.path.join(data_dir, filename)
        try:
            df = pd.read_csv(file_path, nrows=0)  # Read only headers
            print(f"\nHeaders in {filename}:")
            print(list(df.columns))
        except Exception as e:
            print(f"\nCould not read {filename}: {e}")
