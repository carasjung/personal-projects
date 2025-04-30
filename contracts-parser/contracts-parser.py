import os
import re
import spacy
import pandas as pd
import argparse
from pdfminer.high_level import extract_text
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
# from google.colab import drive

"""If parsing files in Google Drive, uncomment the above and below lines. File will be available under /content/drive/My Drive/"""

# drive.mount('/content/drive')
nlp = spacy.load("en_core_web_sm")

work_regex = re.compile(r"(?<=your work )(.*?)(?=, currently)", re.IGNORECASE)

section_headers = {
    "Initial Payment": ["Initial Payment", "First Payment", "First Installment"],
    "Second Payment": ["Second Payment", "Second Installment"]
}

currency_pattern = r'(?:[$€]\s*|(?:USD|EUR|dollars|euros)\s+)'
money_regex = re.compile(rf"{currency_pattern}([0-9]+(?:,[0-9]{{3}})*)(?:\.\d{{2}})?")

# Convert pdf file to text
def convert_pdf_to_text(pdf_path):
    return extract_text(pdf_path)

# Extract each section's amount and currency
def extract_section_payment(text, sections):
    earliest_position = float('inf')
    keyword_found = None
    currency_symbol = '$'

    for word in sections:
        pattern = r'\b' + re.escape(word) + r'\b'
        match = re.search(pattern, text, re.IGNORECASE)
        if match and match.start() < earliest_position:
            earliest_position = match.start()
            keyword_found = word
    if keyword_found is None:
        return None
    
    section_text = text[earliest_position:earliest_position + 1000]

    match = money_regex.search(section_text)
    if match:
        amount = match.group(1).replace(',', '')
        if '€' in section_text or 'EUR' in section_text.lower():
            currency_symbol = '€'
        return f"{currency_symbol}{amount}"
    return None

# Extract information from text
def extract_text_info(text):
    doc = nlp(text)
    name = next((ent.text for ent in doc.ents if ent.label_ == "PERSON"), None)
    date = next((ent.text for ent in doc.ents if ent.label_ == "DATE"), None)
    works = re.findall(work_regex, text)

    # Extract payments for each section
    initial_payment = extract_section_payment(text, section_headers["Initial Payment"])
    second_payment = extract_section_payment(text, section_headers["Second Payment"])

    return {
        "Name": name,
        "Date": date,
        "Work": works,
        "Initial Payment": initial_payment,
        "Second Payment": second_payment
    }

# Parse single contract
def parse_single_contract(file, folder_path):
    try:
        full_path = os.path.join(folder_path, file)
        text = convert_pdf_to_text(full_path)
        info = extract_text_info(text)
        info['Filename'] = file
    except Exception as e:
        print(f"Error parsing {file}: {str(e)}")
        info = {
            "Filename": file,
            "Name": None,
            "Date": None,
            "Work": None,
            "Initial Payment": None,
            "Second Payment": None
        }
    return info

def parse_all_contracts(folder_path="contracts"):
    extracted_data = []

    # Get list of contract file names
    pdf_files = [f for f in os.listdir(folder_path) if f.lower().endswith(".pdf")]
    if not pdf_files:
        print(f"No PDF files found in '{folder_path}'")
        return pd.DataFrame()
    print(f"{len(pdf_files)} PDF files found. Processing...")

    # Process 8 files at once
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(parse_single_contract, file, folder_path): file for file in pdf_files}

        # Set up progress bar
        with tqdm(total=len(futures), desc="Parsing contracts", unit="file", dynamic_ncols=True) as pbar:
            for future in as_completed(futures):
                file_name = futures[future]
                try:
                    result = future.result()
                    extracted_data.append(result)
                except Exception as e:
                    print(f"Error processing {file_name}: {e}")
                
                # Display the filename being processed in the progress bar
                pbar.set_postfix(file=file_name[:30]) # Limit to 30 chars
                pbar.update(1)

    # Create DataFrame with extracted information
    df = pd.DataFrame(extracted_data)

    columns = ["Filename", "Name", "Date", "Work", "Initial Payment", "Second Payment"]
    df = df[columns]
    return df

# Save as CSV file
def save_as_csv(df, output_path="output/csv/parsed_contracts.csv"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"\nSaved results to {output_path}")

def main(): # See below for Google Colab version
    parser = argparse.ArgumentParser(description="Contract Parser CLI")
    parser.add_argument("--input", type=str, default="contracts/", help="Input folder containing PDF contracts")
    parser.add_argument("--output", type=str, default="output/csv/parsed_contracts.csv", help="Output CSV file path")
    args = parser.parse_args()

    df = parse_all_contracts(args.input)

    if not df.empty:
        save_as_csv(df, args.output)
        # Print preview
        print("\nPreview of extracted information:")
        pd.set_option('display.max_colwidth', 40)
        print(df)
    else:
        print("Whoops, no data was found. Check your files")

if __name__ == "__main__":
    main()

'''
def main():
    parser = argparse.ArgumentParser(description="Contract Parser CLI")
    parser.add_argument("--input", type=str, default="/content/drive/MyDrive/path/to/folder/", help="Input folder containing PDF contracts")
    parser.add_argument("--output", type=str, default="/content/drive/MyDrive/path/to/output/folder/parsed_contracts.csv", help="Output CSV file path")
    args = parser.parse_args(['--input', '/content/drive/MyDrive/path/to/folder', '--ouptut', '/content/drive/MyDrive/path/to/output/folder/parsed_contracts.csv'])

    Rest of code remains the same
'''