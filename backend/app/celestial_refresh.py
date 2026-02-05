"""
Celestial Objects refresh script
Fetches position data from JPL Horizons and stores in Supabase
Run via Heroku Scheduler daily or on-demand
"""

import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client

# Astroquery for JPL Horizons
from astroquery.jplhorizons import Horizons
from astropy.time import Time

load_dotenv()

# Config
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Error: Missing required environment variables")
    print(f"  SUPABASE_URL: {'set' if SUPABASE_URL else 'MISSING'}")
    print(f"  SUPABASE_SERVICE_KEY: {'set' if SUPABASE_KEY else 'MISSING'}")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Celestial objects to track
# Format: (id, name, type, jpl_horizons_id, parent_body, radius_km)
CELESTIAL_OBJECTS = [
    # Star
    ("sun", "Sun", "star", "10", None, 695700),

    # Planets
    ("mercury", "Mercury", "planet", "199", None, 2439.7),
    ("venus", "Venus", "planet", "299", None, 6051.8),
    ("earth", "Earth", "planet", "399", None, 6371.0),
    ("mars", "Mars", "planet", "499", None, 3389.5),
    ("jupiter", "Jupiter", "planet", "599", None, 69911),
    ("saturn", "Saturn", "planet", "699", None, 58232),
    ("uranus", "Uranus", "planet", "799", None, 25362),
    ("neptune", "Neptune", "planet", "899", None, 24622),

    # Major Moons (only the big ones)
    ("moon", "Moon", "moon", "301", "earth", 1737.4),
    ("titan", "Titan", "moon", "606", "saturn", 2574.7),
    ("ganymede", "Ganymede", "moon", "503", "jupiter", 2634.1),
    ("europa", "Europa", "moon", "502", "jupiter", 1560.8),
]


def fetch_object_data(obj_id: str, name: str, jpl_id: str) -> dict | None:
    """
    Fetch position data from JPL Horizons
    Returns heliocentric cartesian coordinates and observer data
    """
    try:
        # Current time
        now = Time.now()

        # Query JPL Horizons for heliocentric vectors (for 3D rendering)
        # Location '@sun' gives heliocentric coordinates
        obj = Horizons(
            id=jpl_id,
            location='@sun',  # Heliocentric
            epochs=now.jd
        )

        # Get vectors (x, y, z position and velocity)
        vectors = obj.vectors()

        # Also get ephemeris from Earth for observer data
        obj_earth = Horizons(
            id=jpl_id,
            location='500',  # Geocentric
            epochs=now.jd
        )
        ephem = obj_earth.ephemerides()

        return {
            # Heliocentric cartesian (AU)
            "x": float(vectors['x'][0]),
            "y": float(vectors['y'][0]),
            "z": float(vectors['z'][0]),
            # Velocity (AU/day)
            "vx": float(vectors['vx'][0]),
            "vy": float(vectors['vy'][0]),
            "vz": float(vectors['vz'][0]),
            # Observer data
            "ra": float(ephem['RA'][0]),
            "dec": float(ephem['DEC'][0]),
            "distance_au": float(ephem['delta'][0]),  # Distance from Earth
            "distance_km": float(ephem['delta'][0]) * 149597870.7,  # AU to km
            "magnitude": float(ephem['V'][0]) if 'V' in ephem.colnames and ephem['V'][0] else None,
        }

    except Exception as e:
        print(f"  Error fetching {name} ({jpl_id}): {e}")
        return None


def upsert_object(obj_data: dict):
    """Upsert celestial object into Supabase"""
    try:
        supabase.table("celestial_objects").upsert(
            obj_data,
            on_conflict="id"
        ).execute()
        return True
    except Exception as e:
        print(f"  Error upserting {obj_data['name']}: {e}")
        return False


def refresh_celestial_objects():
    """Main refresh function"""
    print(f"Starting celestial objects refresh at {datetime.now(timezone.utc).isoformat()}")
    print(f"Fetching data for {len(CELESTIAL_OBJECTS)} objects...")

    success_count = 0
    error_count = 0

    for obj_id, name, obj_type, jpl_id, parent, radius in CELESTIAL_OBJECTS:
        print(f"  Fetching {name}...")

        data = fetch_object_data(obj_id, name, jpl_id)

        if data:
            record = {
                "id": obj_id,
                "name": name,
                "type": obj_type,
                "jpl_horizons_id": jpl_id,
                "parent_body": parent,
                "radius_km": radius,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                **data
            }

            if upsert_object(record):
                success_count += 1
                print(f"    ✓ {name}: x={data['x']:.4f}, y={data['y']:.4f}, z={data['z']:.4f} AU")
            else:
                error_count += 1
        else:
            error_count += 1

    print(f"\nRefresh complete!")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    print(f"  Total: {len(CELESTIAL_OBJECTS)}")


if __name__ == "__main__":
    refresh_celestial_objects()
