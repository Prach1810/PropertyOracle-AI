import requests
from bs4 import BeautifulSoup

def scrape_property(url):
    """
    Simulates a real estate scraper. 
    In a production app, you'd use headers to avoid bot detection.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        # we can handle real URLs or return mock data 
        # if the site blocks the request (common with Zillow)
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            # These selectors are generic; in a real role, we'll customize per site
            price = soup.find("span", {"id": "price"}).text if soup.find("span", {"id": "price"}) else "$2,500,000"
            sqft = "3,200" # Dummy extraction for the flow
            
            return {
                "source": "web_listing",
                "price": price,
                "sqft": sqft,
                "beds": 3
            }
    except Exception as e:
        print(f"Scraping failed: {e}")
        # Return mock data so the agent flow doesn't break during your demo
        return {
            "source": "mock_web_listing",
            "price": "$2,450,000",
            "sqft": "3,200",
            "beds": 3
        }