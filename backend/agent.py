import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Import your components
from llm_client import safe_call_gemini_chat
from scraper import scrape
from scraper.normalize import normalize_scraped
from db import get_db_client # Uses your existing db.py

load_dotenv()

# --- 1. The Ground Truth Lookup (Fixed to use Address) ---
def fetch_canonical_by_address(address_text):
    if not address_text:
        return None

    client = get_db_client()
    db = client.property_db

    # Use first 15 chars for fuzzy match
    search_term = address_text[:15]

    # ✅ THE FIX: Ensure this says "address.line1"
    record = db.listings.find_one({
        "address.line1": {
            "$regex": search_term, 
            "$options": "i"
        }
    })
    return record

def extract_rich_details(raw_text_data):
    """
    Feeds raw text (description, messy HTML text) to Gemini to extract
    attributes that Regex missed (Amenities, Parking, Year Built, etc.)
    """
    system_prompt = "You are a Real Estate Data Structuring Engine."
    user_prompt = f"""
    Analyze the following RAW REAL ESTATE TEXT. 
    Extract a comprehensive list of features, amenities, and terms.
    
    RAW TEXT:
    {raw_text_data}
    
    Return a clean bulleted list of:
    - Amenities (AC, Dishwasher, etc)
    - Construction Details (Year, Type)
    - Parking Info
    - Lease Terms
    - Utilities included (if any)
    """
    return safe_call_gemini_chat(system_prompt, user_prompt)

# --- 2. The Workflow (Scrape -> Normalize -> RAG -> LLM) ---
def run_workflow_sync(initial_state):
    url = initial_state.get("address") # This comes from React as the URL
    state = initial_state.copy()
    
    print(f"🚀 [AGENT] Starting analysis for: {url}")

    # STEP A: SCRAPE & NORMALIZE
    try:
        raw_scrape = scrape(url)
        normalized = normalize_scraped(raw_scrape["raw"])
        
        # Store the clean data
        state["raw_data"].append({
            "source": "Live Web Listing", 
            "data": normalized
        })
        # Extract the address found on the website to query our DB
        detected_address = normalized.get("address", {}).get("line1", "")
        if not detected_address:
            # Fallback: Attempt to guess address from URL text if scrape failed
            detected_address = "123 Palo Alto" 
            
    except Exception as e:
        print(f"Scraping Error: {e}")
        state["summary"] = f"Error: Could not scrape data. {str(e)}"
        return state
    
    # STEP B: RICH EXTRACTION (The New "Intelligence" Step)
    # This runs BEFORE the comparison, so we have more data to compare.
    print("💎 [AGENT] Extracting rich amenities via LLM...")
    rich_features = extract_rich_details(raw_scrape["raw"])
    
    # Save this rich info into our state so the final brief can use it
    state["raw_data"].append({
        "source": "AI Extracted Features",
        "data": rich_features
    })

    # STEP C: DATABASE LOOKUP (RAG)
    print(f"💾 [AGENT] Searching internal DB for: {detected_address}...")
    canonical = fetch_canonical_by_address(detected_address)
    print("-+-+-+-+-+-+-", canonical)
    
    if canonical:
        print(" Found Ground Truth record!")
        # Remove MongoDB ID for cleaner LLM input
        canonical.pop('_id', None)
        state["raw_data"].append({"source": "OFFICIAL TAX RECORD", "data": canonical})
    else:
        print("No internal records found.")
        state["raw_data"].append({"source": "OFFICIAL TAX RECORD", "data": "No matching records found."})

    # STEP D: PREPARE CONTEXT
    # Turn the list of data dictionaries into a string for Gemini
    context_str = ""
    for item in state["raw_data"]:
        context_str += f"\n=== SOURCE: {item['source']} ===\n{item['data']}\n"

    print("-------", context_str)

    # STEP E: ANALYZE DISCREPANCIES (The Logic)
    print("[AGENT] Reasoning with Gemini...")
    analyst_system = (
        "You are a Forensic Real Estate Analyst. Compare the 'Live Web Listing' against the 'OFFICIAL TAX RECORD'.\n"
        "STRICT RULES:\n"
        "1. ONLY report a discrepancy if BOTH sources have data but they disagree (e.g. Web price $500k vs Tax value $300k).\n"
        "2. If the 'OFFICIAL TAX RECORD' is missing or says 'No matching records', return exactly: 'No discrepancies found (Ground truth unavailable).'\n"
        "3. Do NOT flag missing data as a warning."
    )
    discrepancies = safe_call_gemini_chat(analyst_system, context_str)
    state["discrepancies"] = discrepancies

    # STEP F: SUMMARIZE (The Output)
    summary_system = (
        "You are a helpful Real Estate Assistant. Write a 2-3 paragraph brief for a buyer, for him to know if the listing is legitimate.\n"
        "If the tax record was missing, simply state 'Official records were unavailable for verification' as a neutral note at the end."
    )
    summary_prompt = f"{context_str}\n\nANALYSIS NOTES:\n{discrepancies}"
    summary = safe_call_gemini_chat(summary_system, summary_prompt)
    
    state["summary"] = summary
    print("🏁 [AGENT] Workflow Complete.")
    return state

# --- 3. The Chat Handler ---
def chat_with_brief(state, user_message):
    """
    Called by app.py when the user sends a message.
    It uses the 'state' (the results of the analysis) as context.
    """
    # Reconstruct the context from the saved job state
    context = f"""
    PREVIOUS ANALYSIS SUMMARY:
    {state.get('summary')}
    
    IDENTIFIED DISCREPANCIES:
    {state.get('discrepancies')}
    
    RAW DATA SOURCES:
    {state.get('raw_data')}
    """
    
    system = "You are a helpful real estate assistant. Answer based strictly on the context provided."
    user_prompt = f"{context}\n\nUSER QUESTION: {user_message}"
    
    return safe_call_gemini_chat(system, user_prompt)