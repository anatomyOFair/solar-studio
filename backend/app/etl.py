import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")
    exit(1)

supabase: Client = create_client(url, key)

def fetch_solar_data():
    """
    Placeholder for fetching data from external APIs (NASA, etc.)
    """
    print("Fetching solar system data...")
    # TODO: Implement data fetching
    return []

def update_database(data):
    """
    Placeholder for inserting/updating data in Supabase
    """
    print("Updating Supabase...")
    # TODO: Implement Supabase upsert
    # response = supabase.table('celestial_objects').upsert(data).execute()
    # print(response)

if __name__ == "__main__":
    print("Starting ETL process...")
    
    # Dummy Data Seeding
    dummy_data = [
        {
            "id": "moon",
            "name": "Moon",
            "type": "moon",
            "data": {
                "position": {
                    "lat": 28.6139,
                    "lon": 77.2090,
                    "altitude": 384400
                }
            }
        },
        {
            "id": "mars",
            "name": "Mars",
            "type": "planet",
            "data": {
                "position": {
                    "lat": 0,
                    "lon": 0,
                    "altitude": 225000000
                }
            }
        }
    ]
    
    response = supabase.table('celestial_objects').upsert(dummy_data).execute()
    print(f"Inserted: {response}")
    print("ETL complete.")
