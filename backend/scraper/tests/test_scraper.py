# tests/test_scraper.py
import pytest
from scraper import normalize_url, is_allowed_url, scrape, extract_greenstrealty

SAMPLE_HTML = """
<html>
  <body>
    <div class="property-address">123 Main St, Urbana, IL 61801</div>
    <div class="listing-price">$425,000</div>
    <div class="beds">2 beds</div>
    <div class="baths">1 bath</div>
    <div class="sqft">920 sq ft</div>
    <div class="agent-name">GreensT Realty</div>
    <div class="agent-phone">206-555-0101</div>
    <div class="description">Bright 2-bed condo with updated kitchen.</div>
  </body>
</html>
"""


def test_normalize_url_and_allowed():
    assert normalize_url("https://example.com/path#frag").endswith("/path")
    assert is_allowed_url("https://example.com")
    assert not is_allowed_url("ftp://example.com")


def test_extract_greenstrealty():
    res = extract_greenstrealty(SAMPLE_HTML, "https://www.greenstrealty.com/properties/profile/stoneway-condos")
    raw = res["raw"]
    assert raw["price_text"] == "$425,000"
    assert "2 beds" in raw["beds_text"]
    assert "920" in raw["sqft_text"]


def test_scrape_monkeypatch_fetch(monkeypatch):
    # monkeypatch fetch_html to return SAMPLE_HTML
    from scraper import fetch_html

    def fake_fetch(url, allow_js=False):
        return SAMPLE_HTML

    # 1. Mock the HTML fetch
    # Note: We patch 'scraper.scraper' to ensure we hit the actual file definition
    monkeypatch.setattr("scraper.scraper.fetch_html", fake_fetch)

    # 2. Mock the Robots check (THE FIX)
    # Use "scraper.scraper" instead of just "scraper"
    monkeypatch.setattr("scraper.scraper.is_allowed_by_robots", lambda url: True)

    out = scrape("https://www.greenstrealty.com/properties/profile/stoneway-condos")
    assert out["url"].startswith("https://")
    assert out["raw"]["price_text"] == "$425,000"
