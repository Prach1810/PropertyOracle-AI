# agent.py
from llm_client import call_gemini_chat
from scraper import scrape_property
from db import get_db_client, save_result, get_result
import os

def run_workflow_sync(initial_state):
    address = initial_state.get("address")
    state = initial_state.copy()

    # 1. Scrape
    scraped = scrape_property(address)
    state["raw_data"].append(scraped)

    # 2. DB lookup (example)
    client = get_db_client()
    db = client.property_db
    record = db.listings.find_one({"source_url": address})
    state["raw_data"].append({"db_record": record} if record else {"db_record": None})

    # 3. LLM analyze discrepancies
    combined = "\n".join([str(x) for x in state["raw_data"]])
    system = "You are a real estate forensic analyst. Compare sources and list discrepancies."
    analysis = call_gemini_chat(system, combined)
    state["discrepancies"] = analysis

    # 4. Summarize brief
    brief_prompt = f"DATA:\n{combined}\nALERTS:\n{analysis}\nWrite a 2-sentence brief for a buyer."
    summary = call_gemini_chat("You are a professional real estate assistant.", brief_prompt)
    state["summary"] = summary

    return state

def chat_with_brief(state, user_message):
    # Build context: system + brief + provenance + user message
    system = "You are a helpful assistant answering follow-up questions about a property. Use the brief and sources."
    context = f"BRIEF:\n{state.get('summary')}\nSOURCES:\n{state.get('raw_data')}\n"
    prompt = context + "\nUser question: " + user_message
    return call_gemini_chat(system, prompt)
