# persistence.py
from typing import Dict, Any, Optional
from db import get_db_client  # assumes your repo already has db.get_db_client()
from datetime import datetime, timezone
import json


# def upload_to_s3(content: str, key_prefix: Optional[str] = None) -> Optional[str]:
#     """
#     Stub for uploading raw HTML or screenshots to S3.
#     Replace with your real S3 upload logic. Returns an S3 key or URL.
#     """
#     # For now, return None to indicate no upload performed.
#     return None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_scrape(job_id: str, url: str, html: str, normalized: Dict[str, Any], provenance: list) -> None:
    client = get_db_client()
    db = client.property_db
    # html_key = upload_to_s3(html, key_prefix=f"scrapes/{job_id}")  # optional
    doc = {
        "job_id": job_id,
        "source_url": url,
        # "raw_html_s3": html_key,
        "raw_html_snippet": html[:4000],  # small preview for debugging
        "normalized": normalized,
        "provenance": provenance,
        "status": "scraped",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.scrapes.replace_one({"job_id": job_id}, doc, upsert=True)


def save_result(job_id: str, result: Dict[str, Any]) -> None:
    client = get_db_client()
    db = client.property_db
    doc = {
        "job_id": job_id,
        "result": result,
        "status": "complete",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    db.results.replace_one({"job_id": job_id}, doc, upsert=True)
