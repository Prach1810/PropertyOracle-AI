# scraper.py
import re
import socket
import ipaddress
from typing import Any, Dict
from urllib.parse import urlparse, urlunparse
from urllib import robotparser
import requests
from requests.adapters import HTTPAdapter, Retry
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "PropertyOracleBot/1.0 (+your-email@example.com)"}
REQUEST_TIMEOUT = 15
RETRY_STRATEGY = Retry(total=2, backoff_factor=0.5, status_forcelist=(429, 500, 502, 503, 504))

# Optional domain allowlist; set to None to allow any public domain
DOMAIN_ALLOWLIST = None  # e.g., {"greenstrealty.com", "example.com"}

def normalize_url(url: str) -> str | None:
    try:
        parsed = urlparse(url.strip())
        if not parsed.scheme:
            parsed = parsed._replace(scheme="https")
        # remove fragments
        parsed = parsed._replace(fragment="")
        # ensure netloc exists
        if not parsed.netloc:
            return None
        return urlunparse(parsed)
    except Exception:
        return None

def is_allowed_url(url: str) -> bool:
    """
    Basic checks: valid scheme and netloc, not a data: or file: URL.
    """
    try:
        parsed = urlparse(url)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False

def is_private_ip(hostname: str) -> bool:
    """
    Resolve hostname and reject private/reserved IPs to avoid SSRF.
    """
    try:
        for res in socket.getaddrinfo(hostname, None):
            ip = res[4][0]
            ip_obj = ipaddress.ip_address(ip)
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local or ip_obj.is_multicast:
                return True
        return False
    except Exception:
        # If DNS resolution fails, be conservative and treat as not private here;
        # upstream code can handle unreachable hosts.
        return False

def is_allowed_domain(url: str) -> bool:
    """
    Optional allowlist check. If DOMAIN_ALLOWLIST is None, allow all public domains.
    """
    if DOMAIN_ALLOWLIST is None:
        return True
    try:
        host = urlparse(url).netloc.lower()
        # strip port
        host = host.split(":")[0]
        return any(host == d or host.endswith("." + d) for d in DOMAIN_ALLOWLIST)
    except Exception:
        return False

def is_allowed_by_robots(url: str, user_agent: str = HEADERS["User-Agent"]) -> bool:
    """
    Check robots.txt for the host. Returns True if allowed or robots.txt unreachable.
    """
    try:
        parsed = urlparse(url)
        rp = robotparser.RobotFileParser()
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:
        # If robots.txt cannot be fetched, be permissive but log this in production
        return True

def fetch_html(url: str, allow_js: bool = False) -> str:
    """
    Fetch HTML with retries and timeouts. If allow_js is True, you can plug in Playwright
    or another headless renderer here as a fallback.
    """
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=RETRY_STRATEGY))
    session.mount("http://", HTTPAdapter(max_retries=RETRY_STRATEGY))
    resp = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    resp.raise_for_status()
    return resp.text

# --- site-specific extraction for greenstrealty pages --- 
def extract_greenstrealty(html: str, url: str) -> Dict[str, Any]: 
    """ Extract common fields from GreenstRealty listing pages. 
    Returns a dict with raw text fields and provenance snippets. 
    """ 
    soup = BeautifulSoup(html, "html.parser") 
    def text_or_none(sel): 
        el = soup.select_one(sel) 
        return el.get_text(strip=True) if el else None 
    
    # Common selectors (may need adjustment if site changes) 
    price_text = text_or_none(".listing-price, .price, .property-price") 
    beds_text = text_or_none(".beds, .property-beds, .beds-count") 
    baths_text = text_or_none(".baths, .property-baths, .baths-count") 
    sqft_text = text_or_none(".sqft, .property-sqft, .sqft-count") 
    address_text = text_or_none(".property-address, .address, .listing-address") 
    agent_name = text_or_none(".agent-name, .listing-agent, .agent") 
    agent_phone = text_or_none(".agent-phone, .agent-contact, .phone") 
    description = text_or_none(".description, .property-description, .listing-description") 
    # provenance: small snippets with selector hints 
    provenance = [] 
    for sel, txt in [ 
        (".listing-price", price_text), 
        (".price", price_text), 
        (".beds", beds_text), 
        (".baths", baths_text), 
        (".sqft", sqft_text), 
        (".property-address", address_text), 
        (".agent-name", agent_name), 
        ]: 
        if txt: 
            provenance.append({"selector": sel, "text": txt, "source": url}) 
    raw = { 
        "price_text": price_text, 
        "beds_text": beds_text, 
        "baths_text": baths_text, 
        "sqft_text": sqft_text, 
        "address_text": address_text, 
        "agent_name_text": agent_name, 
        "agent_phone_text": agent_phone, 
        "description_text": description, 
        } 
        
    return {"raw": raw, "provenance": provenance} 
    
def generic_extract(html: str, url: str) -> Dict[str, Any]: 
    """ Generic fallback extraction: look for common keywords using heuristics. """ 
    soup = BeautifulSoup(html, "html.parser") 
    text = soup.get_text(" ", strip=True) 
    # Very simple heuristics; keep minimal to avoid hallucination 
    price_match = None 
    import re 
    m = re.search(r"\$\s?[\d,]{3,}", text) 
    if m: 
        price_match = m.group(0) 
    raw = { 
           "price_text": price_match, 
           "beds_text": None, "baths_text": None, 
           "sqft_text": None, "address_text": None, 
           "agent_name_text": None, 
           "agent_phone_text": None, 
           "description_text": None, 
        } 
    provenance = [{"source": url, "text": price_match}] if price_match else [{"source": url}] 
    return {"raw": raw, "provenance": provenance}

def scrape(url: str) -> Dict[str, Any]:
    """ Top-level scrape entry. Runs safety checks, fetches HTML, and returns raw snippets. """
    normalized = normalize_url(url)
    if not normalized or not is_allowed_url(normalized):
        raise ValueError("Invalid or unsupported URL")

    host = urlparse(normalized).netloc.split(":")[0]
    if is_private_ip(host):
        raise ValueError("Refusing to fetch private or reserved IP address")

    if not is_allowed_domain(normalized):
        raise ValueError("Domain not allowed by configuration")

    if not is_allowed_by_robots(normalized):
        raise ValueError("Disallowed by robots.txt")

    html = fetch_html(normalized)
    # route to site-specific parser
    netloc = urlparse(normalized).netloc.lower()
    if "greenstrealty.com" in netloc:
        extracted = extract_greenstrealty(html, normalized)
    else:
        extracted = generic_extract(html, normalized)

    return {
        "url": normalized,
        "html": html,
        "raw": extracted["raw"],
        "provenance": extracted["provenance"],
    }
