# scripts/seed_mongo.py
"""
Seed MongoDB with canonical property records.

Behavior
- Tries to import db.get_db_client() from your repo if available.
- If not available, falls back to using MONGO_URI environment variable.
- Loads data from ../_db.json and upserts into property_db.listings.

Usage
$ export MONGO_URI="mongodb://localhost:27017"
$ python3 scripts/seed.py
"""

from dotenv import load_dotenv 
import os
import json
from datetime import datetime, timezone
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print("GOOGLE_API_KEY:", os.getenv("GOOGLE_API_KEY"))
    print("MONGO_URI:", os.getenv("MONGO_URI"))
else:
    print("Warning: .env not found at", env_path)

# Try to reuse existing db helper if present
try:
    from db import get_db_client
    _using_local_db_helper = True
except Exception:
    _using_local_db_helper = False
    from pymongo import MongoClient

DATA_PATH = Path(__file__).resolve().parent.parent / "_db.json"

def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_client():
    if _using_local_db_helper:
        return get_db_client()
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    return MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

def upsert_documents(docs):
    client = get_client()
    db = client.property_db
    # Ensure indexes
    db.listings.create_index("property_id", unique=True)
    db.listings.create_index("source_url")
    db.listings.create_index([("address.city", 1), ("address.zip", 1)])

    for doc in docs:
        # Add timestamps if missing
        now = datetime.now(timezone.utc).isoformat()
        doc.setdefault("created_at", now)
        doc["updated_at"] = now
        filter_q = {"property_id": doc["property_id"]}
        update = {"$set": doc}
        result = db.listings.update_one(filter_q, update, upsert=True)
        print(f"Upserted {doc['property_id']} (matched: {result.matched_count}, modified: {result.modified_count})")

def main():
    if not DATA_PATH.exists():
        print("ERROR: _db.json not found at", DATA_PATH)
        return
    docs = load_data()
    upsert_documents(docs)
    print("Seeding complete.")

if __name__ == "__main__":
    main()
