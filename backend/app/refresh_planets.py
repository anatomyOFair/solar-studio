"""
Planet position refresh script
Fetches heliocentric positions (relative to Sun) from JPL Horizons.
Run daily via scheduler.
"""

import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from astroquery.jplhorizons import Horizons
from astropy.time import Time

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# (id, name, type, jpl_id, radius_km)
PLANETS = [
    ("sun",     "Sun",     "star",   "10",  695700),
    ("mercury", "Mercury", "planet", "199", 2439.7),
    ("venus",   "Venus",   "planet", "299", 6051.8),
    ("earth",   "Earth",   "planet", "399", 6371.0),
    ("mars",    "Mars",    "planet", "499", 3389.5),
    ("jupiter", "Jupiter", "planet", "599", 69911),
    ("saturn",  "Saturn",  "planet", "699", 58232),
    ("uranus",  "Uranus",  "planet", "799", 25362),
    ("neptune", "Neptune", "planet", "899", 24622),
]


def fetch_planet(obj_id: str, name: str, jpl_id: str) -> dict | None:
    """Fetch heliocentric vectors + geocentric observer data for a planet."""
    try:
        now = Time.now()

        # Heliocentric vectors (position relative to Sun)
        vectors = Horizons(id=jpl_id, location='@sun', epochs=now.jd).vectors()

        result = {
            "x": float(vectors['x'][0]),
            "y": float(vectors['y'][0]),
            "z": float(vectors['z'][0]),
            "vx": float(vectors['vx'][0]),
            "vy": float(vectors['vy'][0]),
            "vz": float(vectors['vz'][0]),
        }

        # Geocentric observer data (RA/dec/distance for 2D sky map)
        # Can't observe Earth from Earth
        if obj_id != "earth":
            ephem = Horizons(id=jpl_id, location='500', epochs=now.jd).ephemerides()
            result.update({
                "ra": float(ephem['RA'][0]),
                "dec": float(ephem['DEC'][0]),
                "distance_au": float(ephem['delta'][0]),
                "distance_km": float(ephem['delta'][0]) * 149597870.7,
                "magnitude": float(ephem['V'][0]) if 'V' in ephem.colnames and ephem['V'][0] else None,
            })
        else:
            result.update({
                "ra": None, "dec": None,
                "distance_au": 0, "distance_km": 0,
                "magnitude": None,
            })

        return result
    except Exception as e:
        print(f"  Error fetching {name}: {e}")
        return None


def refresh_planets():
    print(f"[Planets] Starting refresh at {datetime.now(timezone.utc).isoformat()}")

    success = 0
    errors = 0

    for obj_id, name, obj_type, jpl_id, radius in PLANETS:
        print(f"  Fetching {name}...")
        data = fetch_planet(obj_id, name, jpl_id)

        if data:
            record = {
                "id": obj_id,
                "name": name,
                "type": obj_type,
                "jpl_horizons_id": jpl_id,
                "parent_body": None,
                "radius_km": radius,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                **data,
            }
            try:
                supabase.table("celestial_objects").upsert(record, on_conflict="id").execute()
                success += 1
                print(f"    ✓ {name}: x={data['x']:.4f}, y={data['y']:.4f}, z={data['z']:.4f} AU")
            except Exception as e:
                errors += 1
                print(f"    ✗ Upsert failed: {e}")
        else:
            errors += 1

    print(f"\n[Planets] Done — {success} ok, {errors} failed, {len(PLANETS)} total")


if __name__ == "__main__":
    refresh_planets()
