from pymongo import MongoClient

def seed():
    client = MongoClient("mongodb://localhost:27017/")
    db = client.property_db
    # Clear existing and add fresh ground truth
    db.listings.delete_many({})
    db.listings.insert_one({
        "address": "123 Palo Alto Way",
        "tax_sqft": 2850, # Note: Website says 3200!
        "tax_beds": 3,
        "historical_price": "$1,800,000"
    })
    print("MongoDB Seeded!")

if __name__ == "__main__":
    seed()