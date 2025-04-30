# Contract Parser Project
* This is a program that parses contracts in PDF format in bulk and helps extract the following information into a CSV file:
    - Name
    - Date
    - Work (title of the work that is applicable to the contract) 
    - Initial Payment
    - Second Payment
* The program was actually built to identify agreements that were signed before a particular year. Since the contracts that were created and signed before that specific year had different payment terms (that were not industry standard), this program aimed at identifying these agreements
* This program can be run in local terminal. But for files stored in Google Drive, doing it directly on Colab is easier (instructions are provided)  
* This program is specifically designed to extract payment amounts in USD and EUR, but more currency options can be added as needed

## Required Libraries
* Install spacy first: pip install spacy
* Install pdfminer: pip install pdfminer.six
* Download the Eng nlp: python3 -m spacy download en_core_web_sm
    - For colab:
    - import spacy.cli
    - spacy.cli.download("en_core_web_sm")
* If running directly on Google Colab, import drive
* Additionally import os, re, pandas as pd, argparse
* from pdfminer.high_level import extract_text
    - This will be used to extract the text from PDF files
* from concurrent.futures import ThreadPoolExecutor, as_completed
    - This will allow the program to process the files faster
* from tqdm import tqdm
    - This will be used to display progress bar (not necessary, but nice to have)

## SpaCy + Regex
* To extract the name and date, use SpaCy. Load the English language model
* For work and payment information, use regex
    - For the contracts this program was used to process, the first appearance of the name of the work was listed after "your work" and before "currently"
    - All contracts have two sections where the first initial payment and the second payment can be found
    - Add more sections if needed
    - Using regex, list out all currency format in USD and EUR 
    - For money, list out all kinds of formats such as $1000, $1000.00, $1,000 or $1,000.00

## PDF to Text
* Using the extract_text from pdfminer, create a function that will extract the text from PDF files

## Extract Each Section's Amount and Currency
* Look through the text for the first appearance of the keyword (name of the headers). If there is a match, search for the payment amount in the first 1000 characters following the keyword
    - The payment amount is found within the first 1000 characters of the section
    - Initialize variable:
        - earliest_position to infinity (so any match will have a smaller position)
        - keyword_found to None
    - Loop through the text until there's a match. Update the earliest position to the match and assign the word to the keyword_found
    - Slice the text from the earliest_position up to first 1000 characters that follows. Store it in the section_text
* For each section, find the currency and amount
    - By default, the currency_symbol will be USD since most of the contracts this program is designed for are in dollar amount. If an amount in EUR is found, update it
    - Initialize a variable called amount and use money_regex to get the amount from the section_text
    - Return the currency and the amount

## Extract Information from Text
* Run the SpaCy NLP model to extract the person and date
* Use work_regex to find the name of the work that the contract applies to
* For each payment, create a separate variable and use extract_section_payment to extract the currency and amount
* Return all the information in a dictionary

## Create Function That Parses Single Contract
* Build the full path to the file and use convert_pdf_to_text to extract the raw text from the file
* If a file fails to be processed, print error message

## Parse All Contracts
* Initialize a an empty list called extracted_data
* Because most of the contracts being parsed are from Docusign and the filenames tend to be messy, list out the filenames of all contracts
* If the folder is empty, return an empty DataFrame and stop
* Use ThreadPoolExecutor to process 8 files (can be increased) at the same time
* Initialize a variable called futures and submit process_single_contract function as a job and each pdf file
* Create a progress bar using tqdm which will display the total number of files and its description
    - Use dynamic_ncols=True so the bar's size gets adjusted to the terminal window
* Append the result of the future (the output of the process_single_contract job) to the extracted_data
* If an error occurs print message
* Optional: Update the progress bar so it shows which file was processed 
* Using the list of dictionaries, create a Pandas DataFrame

## Save to CSV
* Save the DataFrame into a clean CSV file
