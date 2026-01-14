# tests/test_normalize.py
from normalize import parse_price, parse_beds, parse_sqft, normalize_address, normalize_scraped

def test_parse_price_and_beds_sqft():
    assert parse_price("$425,000") == 425000
    assert parse_price("USD 1,234,567") == 1234567
    assert parse_beds("2 beds") == 2.0
    assert parse_beds("Studio") == 0.0
    assert parse_sqft("1,400 sqft") == 1400

def test_normalize_address():
    addr = "123 Main St, Urbana, IL 61801"
    out = normalize_address(addr)
    assert out["line1"] == "123 Main St"
    assert out["city"] == "Urbana"
    assert out["state"] == "IL"
    assert out["zip"] == "61801"

def test_normalize_scraped():
    raw = {
        "price_text": "$425,000",
        "beds_text": "2 beds",
        "baths_text": "1 bath",
        "sqft_text": "920 sq ft",
        "address_text": "123 Main St, Urbana, IL 61801",
        "agent_name_text": "GreensT Realty",
        "agent_phone_text": "206-555-0101",
        "description_text": "Bright 2-bed condo."
    }
    norm = normalize_scraped(raw)
    assert norm["price"] == 425000
    assert norm["beds"] == 2.0
    assert norm["sqft"] == 920
    assert norm["agent"]["name"] == "GreensT Realty"
    assert "normalized_at" in norm
