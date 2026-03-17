"""
Celestial events refresh script.
Fetches upcoming astronomical events from external APIs and caches in Supabase.
Run via Heroku Scheduler daily.

Sources:
  - USNO: solar eclipses, moon phases (free, no key)
  - NOAA SWPC: geomagnetic storm / aurora forecast (free, no key)
  - Static: meteor showers (annual, deterministic)
  - Static: lunar eclipses (USNO has no lunar eclipse API)
"""

import os
import httpx
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY]):
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ── Meteor Showers (static annual data) ─────────────────────────────────

METEOR_SHOWERS = [
    {"name": "Quadrantids",     "month": 1,  "day": 3,  "zhr": 120, "parent": "2003 EH1"},
    {"name": "Lyrids",          "month": 4,  "day": 22, "zhr": 18,  "parent": "C/1861 G1 Thatcher"},
    {"name": "Eta Aquariids",   "month": 5,  "day": 6,  "zhr": 50,  "parent": "1P/Halley"},
    {"name": "Delta Aquariids", "month": 7,  "day": 30, "zhr": 25,  "parent": "96P/Machholz"},
    {"name": "Perseids",        "month": 8,  "day": 12, "zhr": 100, "parent": "109P/Swift-Tuttle"},
    {"name": "Draconids",       "month": 10, "day": 8,  "zhr": 10,  "parent": "21P/Giacobini-Zinner"},
    {"name": "Orionids",        "month": 10, "day": 21, "zhr": 20,  "parent": "1P/Halley"},
    {"name": "Leonids",         "month": 11, "day": 17, "zhr": 15,  "parent": "55P/Tempel-Tuttle"},
    {"name": "Geminids",        "month": 12, "day": 14, "zhr": 150, "parent": "3200 Phaethon"},
    {"name": "Ursids",          "month": 12, "day": 22, "zhr": 10,  "parent": "8P/Tuttle"},
]

# ── Known Lunar Eclipses (USNO has no API for these) ────────────────────

LUNAR_ECLIPSES = [
    {"date": "2025-03-14", "name": "Total Lunar Eclipse",     "desc": "Visible from Americas, Europe, Africa"},
    {"date": "2025-09-07", "name": "Total Lunar Eclipse",     "desc": "Visible from Europe, Africa, Asia, Australia"},
    {"date": "2026-03-03", "name": "Total Lunar Eclipse",     "desc": "Visible from E Asia, Australia, Pacific, Americas"},
    {"date": "2026-08-28", "name": "Partial Lunar Eclipse",   "desc": "Visible from E Pacific, Americas, Europe, Africa"},
    {"date": "2027-02-06", "name": "Penumbral Lunar Eclipse", "desc": "Visible from Americas, Europe, Africa, W Asia"},
    {"date": "2027-07-18", "name": "Penumbral Lunar Eclipse", "desc": "Visible from Americas, Europe, Africa"},
    {"date": "2028-01-12", "name": "Partial Lunar Eclipse",   "desc": "Visible from Americas, Europe, Africa"},
    {"date": "2028-07-06", "name": "Partial Lunar Eclipse",   "desc": "Visible from Americas, Europe, Africa, W Asia"},
    {"date": "2028-12-31", "name": "Total Lunar Eclipse",     "desc": "Visible from Europe, Africa, Asia, Australia"},
]


# ── USNO: Solar Eclipses ────────────────────────────────────────────────

def fetch_usno_solar_eclipses(year: int) -> list[dict]:
    """Fetch solar eclipses for a given year from USNO API."""
    url = f"https://aa.usno.navy.mil/api/eclipses/solar/year?year={year}"
    try:
        resp = httpx.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  Error fetching USNO solar eclipses for {year}: {e}")
        return []

    rows = []
    for e in data.get("eclipses_in_year", []):
        date_str = f"{e['year']}-{e['month']:02d}-{e['day']:02d}"
        rows.append({
            "id": f"eclipse-solar-{date_str}",
            "name": e.get("event", "Solar Eclipse"),
            "type": "eclipse",
            "event_date": date_str,
            "description": e.get("event", ""),
            "source": "usno",
        })
    return rows


# ── USNO: Moon Phases ───────────────────────────────────────────────────

PHASE_DESCRIPTIONS = {
    "New Moon": "Moon between Earth and Sun — invisible",
    "First Quarter": "Half-lit, waxing — visible in evening sky",
    "Full Moon": "Fully illuminated — visible all night",
    "Last Quarter": "Half-lit, waning — visible in morning sky",
}

def fetch_usno_moon_phases(year: int) -> list[dict]:
    """Fetch all moon phases for a given year from USNO API."""
    url = f"https://aa.usno.navy.mil/api/moon/phases/year?year={year}"
    try:
        resp = httpx.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  Error fetching USNO moon phases for {year}: {e}")
        return []

    rows = []
    for p in data.get("phasedata", []):
        date_str = f"{p['year']}-{p['month']:02d}-{p['day']:02d}"
        phase_name = p.get("phase", "")
        desc = PHASE_DESCRIPTIONS.get(phase_name, "")
        time_utc = p.get("time", "")

        rows.append({
            "id": f"lunar-{phase_name.lower().replace(' ', '-')}-{date_str}",
            "name": phase_name,
            "type": "lunar_phase",
            "event_date": date_str,
            "description": f"{desc} · {time_utc} UTC" if time_utc else desc,
            "source": "usno",
        })
    return rows


# ── NOAA: Aurora / Geomagnetic Storm Forecast ───────────────────────────

STORM_LABELS = {
    "G1": "Minor Storm — aurora possible at high latitudes (60°+)",
    "G2": "Moderate Storm — aurora possible at mid-latitudes (55°+)",
    "G3": "Strong Storm — aurora visible at 50°+ latitudes",
    "G4": "Severe Storm — aurora visible at 45°+ latitudes",
    "G5": "Extreme Storm — aurora visible at low latitudes",
}

def fetch_noaa_aurora_forecast() -> list[dict]:
    """Fetch Kp index forecast from NOAA SWPC. Create events for G1+ storms."""
    url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json"
    try:
        resp = httpx.get(url, timeout=15)
        resp.raise_for_status()
        raw = resp.json()
    except Exception as e:
        print(f"  Error fetching NOAA Kp forecast: {e}")
        return []

    # Skip header row, find peak Kp per day
    day_peaks: dict[str, dict] = {}
    for row in raw[1:]:
        time_tag, kp_str, _, scale = row
        date_str = time_tag[:10]
        kp = float(kp_str)

        existing = day_peaks.get(date_str)
        if not existing or kp > existing["kp"]:
            day_peaks[date_str] = {"kp": kp, "scale": scale}

    rows = []
    for date_str, info in day_peaks.items():
        kp = info["kp"]
        if kp < 5:
            continue

        scale = info["scale"]
        if not scale:
            scale = "G3" if kp >= 7 else ("G2" if kp >= 6 else "G1")

        label = STORM_LABELS.get(scale, STORM_LABELS["G1"])
        rows.append({
            "id": f"aurora-{date_str}",
            "name": f"Aurora Alert ({scale})",
            "type": "aurora",
            "event_date": date_str,
            "description": f"Kp {kp:.1f} — {label}",
            "source": "noaa",
        })
    return rows


# ── Static: Meteor Showers ──────────────────────────────────────────────

def get_meteor_shower_rows(year: int) -> list[dict]:
    rows = []
    for s in METEOR_SHOWERS:
        for y in [year, year + 1]:
            date_str = f"{y}-{s['month']:02d}-{s['day']:02d}"
            slug = s["name"].lower().replace(" ", "-")
            rows.append({
                "id": f"meteor-{slug}-{y}",
                "name": f"{s['name']} Peak",
                "type": "meteor_shower",
                "event_date": date_str,
                "description": f"~{s['zhr']} meteors/hr at peak · Parent: {s['parent']}",
                "source": "computed",
            })
    return rows


# ── Static: Lunar Eclipses ──────────────────────────────────────────────

def get_lunar_eclipse_rows() -> list[dict]:
    return [
        {
            "id": f"eclipse-lunar-{e['date']}",
            "name": e["name"],
            "type": "eclipse",
            "event_date": e["date"],
            "description": e["desc"],
            "source": "computed",
        }
        for e in LUNAR_ECLIPSES
    ]


# ── Main ────────────────────────────────────────────────────────────────

def refresh_events():
    """Fetch all event sources and upsert into Supabase."""
    now = datetime.now(timezone.utc)
    year = now.year
    print(f"Starting celestial events refresh at {now.isoformat()}")

    all_rows: list[dict] = []

    # USNO solar eclipses (current + next year)
    print("Fetching USNO solar eclipses...")
    all_rows.extend(fetch_usno_solar_eclipses(year))
    all_rows.extend(fetch_usno_solar_eclipses(year + 1))

    # USNO moon phases (current + next year)
    print("Fetching USNO moon phases...")
    all_rows.extend(fetch_usno_moon_phases(year))
    all_rows.extend(fetch_usno_moon_phases(year + 1))

    # NOAA aurora forecast
    print("Fetching NOAA aurora forecast...")
    all_rows.extend(fetch_noaa_aurora_forecast())

    # Static data
    print("Adding meteor showers + lunar eclipses...")
    all_rows.extend(get_meteor_shower_rows(year))
    all_rows.extend(get_lunar_eclipse_rows())

    print(f"Total events to upsert: {len(all_rows)}")

    # Stamp all rows
    fetched_at = now.isoformat()
    for row in all_rows:
        row["fetched_at"] = fetched_at

    # Upsert in batches
    BATCH = 100
    success = 0
    for i in range(0, len(all_rows), BATCH):
        batch = all_rows[i : i + BATCH]
        try:
            supabase.table("celestial_events").upsert(
                batch, on_conflict="id"
            ).execute()
            success += len(batch)
        except Exception as e:
            print(f"  Error upserting batch {i}-{i+len(batch)}: {e}")

    print(f"Celestial events refresh complete! {success}/{len(all_rows)} upserted.")


if __name__ == "__main__":
    refresh_events()
