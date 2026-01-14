# scraper.py
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PropertyBriefBot/1.0; +https://yourdomain.example)"
}

def is_allowed_url(url):
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https")
    except Exception:
        return False

def scrape_property(url, timeout=10):
    if not is_allowed_url(url):
        raise ValueError("Invalid URL")

    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")

        # Site-agnostic best-effort extraction
        title = soup.title.string.strip() if soup.title else ""
        price = None
        # Try common patterns
        selectors = [
            {"name": "span", "attrs": {"id": "price"}},
            {"name": "span", "attrs": {"class": "price"}},
            {"name": "div", "attrs": {"class": "ds-summary-row"}}
        ]
        for sel in selectors:
            el = soup.find(sel["name"], sel["attrs"])
            if el and el.get_text(strip=True):
                price = el.get_text(strip=True)
                break

        # fallback: search for $ pattern
        if not price:
            text = soup.get_text(" ", strip=True)
            import re
            m = re.search(r"\$\s?[\d,]+", text)
            price = m.group(0) if m else None

        # Collect provenance snippets
        snippets = []
        if price:
            snippets.append({"field": "price", "value": price})
        if title:
            snippets.append({"field": "title", "value": title})

        return {"source": url, "price": price, "snippets": snippets, "raw_html_excerpt": resp.text[:2000]}
    except Exception as e:
        # Return structured mock or raise depending on your demo needs
        return {"source": "error", "error": str(e)}
