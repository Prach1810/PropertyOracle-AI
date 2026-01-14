# tests/test_persistence.py
import pytest
from unittest.mock import MagicMock, patch
from persistence import save_scrape, save_result

def make_fake_client():
    fake_db = MagicMock()
    fake_client = MagicMock()
    fake_client.property_db = fake_db
    return fake_client, fake_db

@patch("persistence.get_db_client")
def test_save_scrape_and_result(mock_get_client):
    fake_client, fake_db = make_fake_client()
    mock_get_client.return_value = fake_client

    job_id = "job-123"
    url = "https://example.com/listing"
    html = "<html>ok</html>"
    normalized = {"price": 100}
    provenance = [{"source": url, "text": "$100"}]

    # call save_scrape
    save_scrape(job_id, url, html, normalized, provenance)
    # ensure replace_one called on scrapes collection
    assert fake_db.scrapes.replace_one.called
    args, kwargs = fake_db.scrapes.replace_one.call_args
    assert args[0] == {"job_id": job_id}
    doc = args[1]
    assert doc["normalized"] == normalized
    assert doc["source_url"] == url

    # call save_result
    result = {"summary": "ok"}
    save_result(job_id, result)
    assert fake_db.results.replace_one.called
    args2, kwargs2 = fake_db.results.replace_one.call_args
    assert args2[0] == {"job_id": job_id}
    doc2 = args2[1]
    assert doc2["result"] == result
