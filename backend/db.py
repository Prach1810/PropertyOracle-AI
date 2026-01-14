# db.py
import os
from pymongo import MongoClient

_mongo_client = None

def get_db_client():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(os.getenv("MONGO_URI"), serverSelectionTimeoutMS=5000)
    return _mongo_client

# For demo: store results in a collection keyed by job_id
def save_result(job_id, state):
    client = get_db_client()
    db = client.property_db
    db.results.replace_one({"job_id": job_id}, {"job_id": job_id, "state": state}, upsert=True)

def get_result(job_id):
    client = get_db_client()
    db = client.property_db
    doc = db.results.find_one({"job_id": job_id})
    return doc["state"] if doc else None
