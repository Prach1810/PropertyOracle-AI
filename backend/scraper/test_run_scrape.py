# test_run_scrape.py
import json
import traceback
from scraper import scrape
from normalize import normalize_scraped

URLS = [
    "https://www.greenstrealty.com/properties/profile/stoneway-condos",
    "https://www.greenstrealty.com/properties/profile/1914-melrose-dr-unit-c",
]

def pretty_print(title, obj):
    print("\n" + "="*40)
    print(title)
    print("="*40)
    print(json.dumps(obj, indent=2, ensure_ascii=False))

def run_one(url):
    try:
        print(f"\nFetching: {url}")
        res = scrape(url)  # returns {"url","html","raw","provenance"}
        pretty_print("RAW SNIPPETS", res["raw"])
        pretty_print("PROVENANCE", res.get("provenance", []))

        normalized = normalize_scraped(res["raw"])
        pretty_print("NORMALIZED", normalized)
    except Exception as e:
        print("ERROR while scraping/normalizing:", str(e))
        traceback.print_exc()

def main():
    for u in URLS:
        run_one(u)

if __name__ == "__main__":
    main()
