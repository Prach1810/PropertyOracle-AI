# normalize.py
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def parse_price(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    # remove currency symbols and non-digits
    digits = re.sub(r"[^\d]", "", text)
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def parse_beds(text: Optional[str]) -> Optional[float]:
    if not text:
        return None
    t = text.lower()
    if "studio" in t:
        return 0.0
    m = re.search(r"(\d+(\.\d+)?)", t)
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            return None
    return None


def parse_baths(text: Optional[str]) -> Optional[float]:
    return parse_beds(text)


def parse_sqft(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    if not digits:
        return None
    try:
        return int(digits)
    except ValueError:
        return None


def normalize_address(text: Optional[str]) -> Dict[str, Optional[str]]:
    """
    Very small heuristic address splitter. For robust parsing use `usaddress` or a geocoding API.
    """
    if not text:
        return {"line1": None, "city": None, "state": None, "zip": None}
    # naive split by commas
    parts = [p.strip() for p in text.split(",")]
    line1 = parts[0] if parts else None
    city = parts[1] if len(parts) > 1 else None
    state = None
    zip_code = None
    if len(parts) > 2:
        # try to split state and zip
        m = re.search(r"([A-Za-z]{2})\s*(\d{5})?", parts[2])
        if m:
            state = m.group(1)
            zip_code = m.group(2)
        else:
            state = parts[2]
    return {"line1": line1, "city": city, "state": state, "zip": zip_code}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_scraped(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Input: raw dict from scraper.py (keys: price_text, beds_text, baths_text, sqft_text, address_text, agent_name_text, agent_phone_text, description_text)
    Output: normalized dict with typed fields and timestamp.
    """
    price = parse_price(raw.get("price_text"))
    beds = parse_beds(raw.get("beds_text"))
    baths = parse_baths(raw.get("baths_text"))
    sqft = parse_sqft(raw.get("sqft_text"))
    address = normalize_address(raw.get("address_text"))
    agent_name = raw.get("agent_name_text")
    agent_phone = raw.get("agent_phone_text")
    description = raw.get("description_text")

    return {
        "price": price,
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "address": address,
        "agent": {"name": agent_name, "phone": agent_phone},
        "description": description,
        "normalized_at": now_iso(),
    }
