"""
Moon position refresh script
Fetches moon positions relative to their parent planet from JPL Horizons,
then computes heliocentric positions by adding the parent's position.
Run hourly via scheduler.
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

# (id, name, jpl_id, parent_id, parent_jpl_id, radius_km)
MOONS = [
    ("moon",     "Moon",     "301", "earth",   "399", 1737.4),
    ("titan",    "Titan",    "606", "saturn",  "699", 2574.7),
    ("ganymede", "Ganymede", "503", "jupiter", "599", 2634.1),
    ("europa",   "Europa",   "502", "jupiter", "599", 1560.8),
]


def get_parent_position(parent_id: str) -> tuple[float, float, float] | None:
    """Get parent planet's heliocentric position from DB."""
    try:
        resp = supabase.table("celestial_objects") \
            .select("x, y, z") \
            .eq("id", parent_id) \
            .single() \
            .execute()
        d = resp.data
        return (d["x"], d["y"], d["z"])
    except Exception as e:
        print(f"  Error reading parent {parent_id}: {e}")
        return None


def fetch_moon(name: str, jpl_id: str, parent_jpl_id: str) -> dict | None:
    """Fetch moon position relative to its parent planet."""
    try:
        now = Time.now()

        # Query moon position relative to parent planet center
        vectors = Horizons(
            id=jpl_id,
            location=f'@{parent_jpl_id}',
            epochs=now.jd,
        ).vectors()

        # Also get geocentric observer data for the 2D map
        ephem = Horizons(id=jpl_id, location='500', epochs=now.jd).ephemerides()

        return {
            # Offset from parent (AU)
            "offset_x": float(vectors['x'][0]),
            "offset_y": float(vectors['y'][0]),
            "offset_z": float(vectors['z'][0]),
            "vx": float(vectors['vx'][0]),
            "vy": float(vectors['vy'][0]),
            "vz": float(vectors['vz'][0]),
            # Observer data
            "ra": float(ephem['RA'][0]),
            "dec": float(ephem['DEC'][0]),
            "distance_au": float(ephem['delta'][0]),
            "distance_km": float(ephem['delta'][0]) * 149597870.7,
            "magnitude": float(ephem['V'][0]) if 'V' in ephem.colnames and ephem['V'][0] else None,
        }
    except Exception as e:
        print(f"  Error fetching {name}: {e}")
        return None


def refresh_moons():
    print(f"[Moons] Starting refresh at {datetime.now(timezone.utc).isoformat()}")

    success = 0
    errors = 0

    for moon_id, name, jpl_id, parent_id, parent_jpl_id, radius in MOONS:
        print(f"  Fetching {name} (parent: {parent_id})...")

        parent_pos = get_parent_position(parent_id)
        if not parent_pos:
            print(f"    ✗ Parent {parent_id} not in DB — run refresh_planets first")
            errors += 1
            continue

        data = fetch_moon(name, jpl_id, parent_jpl_id)
        if not data:
            errors += 1
            continue

        # Heliocentric = parent + offset
        px, py, pz = parent_pos
        x = px + data["offset_x"]
        y = py + data["offset_y"]
        z = pz + data["offset_z"]

        record = {
            "id": moon_id,
            "name": name,
            "type": "moon",
            "jpl_horizons_id": jpl_id,
            "parent_body": parent_id,
            "radius_km": radius,
            "x": x, "y": y, "z": z,
            "vx": data["vx"], "vy": data["vy"], "vz": data["vz"],
            "ra": data["ra"], "dec": data["dec"],
            "distance_au": data["distance_au"],
            "distance_km": data["distance_km"],
            "magnitude": data["magnitude"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        try:
            supabase.table("celestial_objects").upsert(record, on_conflict="id").execute()
            success += 1
            print(f"    ✓ {name}: offset=({data['offset_x']:.6f}, {data['offset_y']:.6f}, {data['offset_z']:.6f}) AU")
            print(f"      helio=({x:.4f}, {y:.4f}, {z:.4f}) AU")
        except Exception as e:
            errors += 1
            print(f"    ✗ Upsert failed: {e}")

    print(f"\n[Moons] Done — {success} ok, {errors} failed, {len(MOONS)} total")


if __name__ == "__main__":
    refresh_moons()
