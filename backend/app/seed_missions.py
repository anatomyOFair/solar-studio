"""
Seed mission trajectory data from JPL Horizons.
Run once to populate missions + mission_waypoints tables.
Re-run to update or add new missions.

Usage:
  cd backend && python -m app.seed_missions
"""

import os
import time
from datetime import datetime
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

# ── Mission configuration ──────────────────────────────────────────────
# To add a new mission: append an entry with its NAIF ID, date range,
# color, metadata, and flyby events, then re-run this script.

MISSIONS = [
    {
        "id": "voyager-1",
        "naif": "-31",
        "color": "#00ccff",
        "sort_order": 0,
        "start": "1977-09-06",
        "stop": "2025-01-01",
        "step": "180d",
        "meta": {
            "name": "Voyager 1",
            "description": "Launched in 1977, Voyager 1 flew past Jupiter and Saturn before heading into interstellar space. It is the most distant human-made object, now over 160 AU from the Sun.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "1979-03-05": ("Jupiter flyby", "jupiter"),
            "1980-11-12": ("Saturn flyby", "saturn"),
            "2012-08-25": ("Entered interstellar space", None),
        },
    },
    {
        "id": "voyager-2",
        "naif": "-32",
        "color": "#ff6600",
        "sort_order": 1,
        "start": "1977-08-21",
        "stop": "2025-01-01",
        "step": "180d",
        "meta": {
            "name": "Voyager 2",
            "description": "The only spacecraft to visit all four outer planets. After flybys of Jupiter, Saturn, Uranus, and Neptune, it entered interstellar space in 2018.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "1979-07-09": ("Jupiter flyby", "jupiter"),
            "1981-08-26": ("Saturn flyby", "saturn"),
            "1986-01-24": ("Uranus flyby", "uranus"),
            "1989-08-25": ("Neptune flyby", "neptune"),
            "2018-11-05": ("Entered interstellar space", None),
        },
    },
    {
        "id": "pioneer-10",
        "naif": "-23",
        "color": "#ff4444",
        "sort_order": 2,
        "start": "1972-03-04",
        "stop": "2003-01-01",
        "step": "180d",
        "meta": {
            "name": "Pioneer 10",
            "description": "The first spacecraft to traverse the asteroid belt and fly past Jupiter (1973). Last signal received in 2003, now heading toward the star Aldebaran.",
            "agency": "NASA/ARC",
            "end_date": "2003-01-23",
            "status": "completed",
        },
        "flybys": {
            "1973-12-04": ("Jupiter flyby", "jupiter"),
        },
    },
    {
        "id": "pioneer-11",
        "naif": "-24",
        "color": "#ff8844",
        "sort_order": 3,
        "start": "1973-04-07",
        "stop": "1995-09-01",
        "step": "180d",
        "meta": {
            "name": "Pioneer 11",
            "description": "First spacecraft to fly past Saturn (1979) after a Jupiter gravity assist. Lost contact in 1995 as its power source weakened.",
            "agency": "NASA/ARC",
            "end_date": "1995-09-30",
            "status": "completed",
        },
        "flybys": {
            "1974-12-03": ("Jupiter flyby", "jupiter"),
            "1979-09-01": ("Saturn flyby", "saturn"),
        },
    },
    {
        "id": "galileo",
        "naif": "-77",
        "color": "#44aaff",
        "sort_order": 4,
        "start": "1989-10-20",
        "stop": "2003-09-21",
        "step": "120d",
        "meta": {
            "name": "Galileo",
            "description": "Orbited Jupiter for 8 years (1995\u20132003), discovering evidence of subsurface oceans on Europa, Ganymede, and Callisto. Deployed the first probe into Jupiter\u2019s atmosphere.",
            "agency": "NASA/JPL",
            "end_date": "2003-09-21",
            "status": "completed",
        },
        "flybys": {
            "1990-02-10": ("Venus flyby", "venus"),
            "1990-12-08": ("Earth flyby", "earth"),
            "1992-12-08": ("Earth flyby 2", "earth"),
            "1995-12-07": ("Jupiter orbit insertion", "jupiter"),
        },
    },
    {
        "id": "cassini",
        "naif": "-82",
        "color": "#ffcc00",
        "sort_order": 5,
        "start": "1997-10-16",
        "stop": "2017-09-15",
        "step": "120d",
        "meta": {
            "name": "Cassini-Huygens",
            "description": "Orbited Saturn for 13 years (2004\u20132017), studying the planet, its rings, and moons including Titan and Enceladus. Ended with a deliberate plunge into Saturn\u2019s atmosphere.",
            "agency": "NASA/ESA/ASI",
            "end_date": "2017-09-15",
            "status": "completed",
        },
        "flybys": {
            "1998-04-26": ("Venus flyby", "venus"),
            "1999-06-24": ("Venus flyby 2", "venus"),
            "1999-08-18": ("Earth flyby", "earth"),
            "2000-12-30": ("Jupiter flyby", "jupiter"),
            "2004-07-01": ("Saturn orbit insertion", "saturn"),
        },
    },
    {
        "id": "messenger",
        "naif": "-236",
        "color": "#ffdd66",
        "sort_order": 6,
        "start": "2004-08-04",
        "stop": "2015-04-30",
        "step": "90d",
        "meta": {
            "name": "MESSENGER",
            "description": "First spacecraft to orbit Mercury (2011\u20132015). Used one Earth, two Venus, and three Mercury flybys to slow down enough to enter orbit. Mapped Mercury\u2019s entire surface.",
            "agency": "NASA/APL",
            "end_date": "2015-04-30",
            "status": "completed",
        },
        "flybys": {
            "2005-08-02": ("Earth flyby", "earth"),
            "2006-10-24": ("Venus flyby", "venus"),
            "2007-06-05": ("Venus flyby 2", "venus"),
            "2008-01-14": ("Mercury flyby", "mercury"),
            "2008-10-06": ("Mercury flyby 2", "mercury"),
            "2009-09-29": ("Mercury flyby 3", "mercury"),
            "2011-03-18": ("Mercury orbit insertion", "mercury"),
        },
    },
    {
        "id": "rosetta",
        "naif": "-226",
        "color": "#aaaaff",
        "sort_order": 7,
        "start": "2004-03-03",
        "stop": "2016-09-30",
        "step": "90d",
        "meta": {
            "name": "Rosetta",
            "description": "First spacecraft to orbit a comet and deploy a lander (Philae) onto its surface. Studied comet 67P/Churyumov\u2013Gerasimenko for over two years.",
            "agency": "ESA",
            "end_date": "2016-09-30",
            "status": "completed",
        },
        "flybys": {
            "2005-03-04": ("Earth flyby", "earth"),
            "2007-02-25": ("Mars flyby", "mars"),
            "2007-11-13": ("Earth flyby 2", "earth"),
            "2009-11-13": ("Earth flyby 3", "earth"),
            "2014-08-06": ("Comet 67P arrival", None),
        },
    },
    {
        "id": "new-horizons",
        "naif": "-98",
        "color": "#cc33ff",
        "sort_order": 8,
        "start": "2006-01-20",
        "stop": "2025-01-01",
        "step": "120d",
        "meta": {
            "name": "New Horizons",
            "description": "Launched in 2006, New Horizons performed the first-ever flyby of Pluto in 2015 and continues to explore the Kuiper Belt.",
            "agency": "NASA/APL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2007-02-28": ("Jupiter gravity assist", "jupiter"),
            "2015-07-14": ("Pluto flyby", None),
            "2019-01-01": ("Arrokoth flyby", None),
        },
    },
    {
        "id": "dawn",
        "naif": "-203",
        "color": "#88ffcc",
        "sort_order": 9,
        "start": "2007-09-28",
        "stop": "2018-11-01",
        "step": "90d",
        "meta": {
            "name": "Dawn",
            "description": "First spacecraft to orbit two extraterrestrial bodies: the giant asteroid Vesta (2011\u20132012) and dwarf planet Ceres (2015\u20132018). Used ion propulsion for the journey.",
            "agency": "NASA/JPL",
            "end_date": "2018-11-01",
            "status": "completed",
        },
        "flybys": {
            "2009-02-17": ("Mars gravity assist", "mars"),
            "2011-07-16": ("Vesta orbit insertion", None),
            "2012-09-05": ("Vesta departure", None),
            "2015-03-06": ("Ceres orbit insertion", None),
        },
    },
    {
        "id": "juno",
        "naif": "-61",
        "color": "#33ff66",
        "sort_order": 10,
        "start": "2011-08-06",
        "stop": "2025-01-01",
        "step": "120d",
        "meta": {
            "name": "Juno",
            "description": "Arrived at Jupiter in 2016 to study the planet\u2019s atmosphere, magnetic field, and interior structure from a polar orbit. Extended mission includes flybys of Galilean moons.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2013-10-09": ("Earth gravity assist", "earth"),
            "2016-07-05": ("Jupiter orbit insertion", "jupiter"),
        },
    },
    {
        "id": "osiris-rex",
        "naif": "-64",
        "color": "#dd44aa",
        "sort_order": 11,
        "start": "2016-09-09",
        "stop": "2025-01-01",
        "step": "90d",
        "meta": {
            "name": "OSIRIS-REx",
            "description": "Collected a sample from asteroid Bennu and returned it to Earth in September 2023. Now renamed OSIRIS-APEX, heading to asteroid Apophis for a 2029 encounter.",
            "agency": "NASA/GSFC",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2017-09-22": ("Earth gravity assist", "earth"),
            "2018-12-03": ("Bennu arrival", None),
            "2023-09-24": ("Sample return to Earth", "earth"),
        },
    },
    {
        "id": "parker-solar-probe",
        "naif": "-96",
        "color": "#ffaa00",
        "sort_order": 12,
        "start": "2018-08-13",
        "stop": "2025-12-01",
        "step": "60d",
        "meta": {
            "name": "Parker Solar Probe",
            "description": "The fastest human-made object, using Venus gravity assists to repeatedly dive closer to the Sun. In 2024 it passed within 6.1 million km of the solar surface.",
            "agency": "NASA/APL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2018-10-03": ("Venus flyby 1", "venus"),
            "2018-11-06": ("Perihelion 1", None),
            "2019-12-26": ("Venus flyby 2", "venus"),
            "2020-07-11": ("Venus flyby 3", "venus"),
            "2021-02-20": ("Venus flyby 4", "venus"),
            "2021-10-16": ("Venus flyby 5", "venus"),
            "2023-08-21": ("Venus flyby 6", "venus"),
            "2024-11-06": ("Venus flyby 7", "venus"),
            "2024-12-24": ("Closest perihelion", None),
        },
    },
    {
        "id": "lucy",
        "naif": "-49",
        "color": "#88cc44",
        "sort_order": 13,
        "start": "2021-10-17",
        "stop": "2033-03-01",
        "step": "90d",
        "meta": {
            "name": "Lucy",
            "description": "A 12-year mission to visit Jupiter\u2019s Trojan asteroids \u2014 ancient remnants from the early solar system. Will fly past seven different asteroid targets between 2025 and 2033.",
            "agency": "NASA/GSFC",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2022-10-16": ("Earth gravity assist 1", "earth"),
            "2023-11-01": ("Dinkinesh flyby", None),
            "2024-12-13": ("Earth gravity assist 2", "earth"),
            "2025-04-20": ("Donaldjohanson flyby", None),
            "2027-08-12": ("Eurybates flyby", None),
            "2028-11-11": ("Orus flyby", None),
        },
    },
    {
        "id": "europa-clipper",
        "naif": "-159",
        "color": "#66ddff",
        "sort_order": 14,
        "start": "2024-10-15",
        "stop": "2034-09-01",
        "step": "90d",
        "meta": {
            "name": "Europa Clipper",
            "description": "NASA\u2019s flagship mission to assess the habitability of Jupiter\u2019s ocean moon Europa. Will perform 49 close flybys to study its ice shell, ocean, and geology.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2025-03-01": ("Mars gravity assist", "mars"),
            "2026-12-03": ("Earth gravity assist", "earth"),
            "2030-04-11": ("Jupiter orbit insertion", "jupiter"),
        },
    },
    # ── Additional historic & active missions ──────────────────────────
    {
        "id": "ulysses",
        "naif": "-55",
        "color": "#ff77cc",
        "sort_order": 15,
        "start": "1990-10-07",
        "stop": "2009-06-30",
        "step": "120d",
        "meta": {
            "name": "Ulysses",
            "description": "Joint NASA/ESA mission that used a Jupiter gravity assist to enter a unique polar orbit around the Sun, studying the heliosphere from above and below the ecliptic plane.",
            "agency": "NASA/ESA",
            "end_date": "2009-06-30",
            "status": "completed",
        },
        "flybys": {
            "1992-02-08": ("Jupiter gravity assist", "jupiter"),
            "1994-09-13": ("South solar pole pass", None),
            "1995-07-31": ("North solar pole pass", None),
            "2004-02-04": ("Jupiter distant flyby", "jupiter"),
        },
    },
    {
        "id": "near-shoemaker",
        "naif": "-93",
        "color": "#cc8866",
        "sort_order": 16,
        "start": "1996-02-20",
        "stop": "2001-02-28",
        "step": "90d",
        "meta": {
            "name": "NEAR Shoemaker",
            "description": "First spacecraft to orbit and land on an asteroid. Studied 433 Eros for a year, then made a controlled descent to the surface in 2001.",
            "agency": "NASA/APL",
            "end_date": "2001-02-28",
            "status": "completed",
        },
        "flybys": {
            "1997-06-27": ("Mathilde flyby", None),
            "1998-01-23": ("Earth gravity assist", "earth"),
            "2000-02-14": ("Eros orbit insertion", None),
            "2001-02-12": ("Eros landing", None),
        },
    },
    {
        "id": "stardust",
        "naif": "-29",
        "color": "#99ddaa",
        "sort_order": 17,
        "start": "1999-02-08",
        "stop": "2006-01-15",
        "step": "90d",
        "meta": {
            "name": "Stardust",
            "description": "Collected dust particles from comet Wild 2 and returned them to Earth in 2006. First mission to bring back solid samples from beyond the Moon.",
            "agency": "NASA/JPL",
            "end_date": "2006-01-15",
            "status": "completed",
        },
        "flybys": {
            "2001-01-15": ("Earth gravity assist", "earth"),
            "2004-01-02": ("Comet Wild 2 encounter", None),
            "2006-01-15": ("Sample return to Earth", "earth"),
        },
    },
    {
        "id": "deep-impact",
        "naif": "-140",
        "color": "#dd9944",
        "sort_order": 18,
        "start": "2005-01-13",
        "stop": "2013-09-20",
        "step": "90d",
        "meta": {
            "name": "Deep Impact / EPOXI",
            "description": "Launched a copper impactor into comet Tempel 1 in 2005. The flyby spacecraft was repurposed as EPOXI and visited comet Hartley 2 in 2010.",
            "agency": "NASA/JPL",
            "end_date": "2013-09-20",
            "status": "completed",
        },
        "flybys": {
            "2005-07-04": ("Tempel 1 impact", None),
            "2007-12-31": ("Earth gravity assist", "earth"),
            "2010-11-04": ("Hartley 2 flyby", None),
        },
    },
    {
        "id": "maven",
        "naif": "-202",
        "color": "#77bbaa",
        "sort_order": 19,
        "start": "2013-11-19",
        "stop": "2014-09-23",
        "step": "15d",
        "meta": {
            "name": "MAVEN",
            "description": "Mars Atmosphere and Volatile EvolutioN mission, studying how Mars lost its atmosphere and water over time. Has been orbiting Mars since 2014 and also serves as a communications relay for surface rovers.",
            "agency": "NASA/GSFC",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2014-09-22": ("Mars orbit insertion", "mars"),
        },
    },
    {
        "id": "curiosity",
        "naif": "-76",
        "color": "#cc8844",
        "sort_order": 20,
        "start": "2011-11-27",
        "stop": "2012-08-07",
        "step": "15d",
        "meta": {
            "name": "Curiosity (MSL)",
            "description": "NASA\u2019s car-sized Mars rover, exploring Gale Crater since 2012. Discovered ancient river beds, organic molecules, and evidence that Mars once had conditions suitable for microbial life.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2012-08-06": ("Mars landing", "mars"),
        },
    },
    {
        "id": "hayabusa-2",
        "naif": "-37",
        "color": "#ee6688",
        "sort_order": 21,
        "start": "2014-12-04",
        "stop": "2020-12-06",
        "step": "90d",
        "meta": {
            "name": "Hayabusa2",
            "description": "JAXA mission that collected subsurface samples from asteroid Ryugu using an impactor, then returned 5.4 grams of material to Earth in December 2020.",
            "agency": "JAXA",
            "end_date": "2020-12-06",
            "status": "completed",
        },
        "flybys": {
            "2015-12-03": ("Earth gravity assist", "earth"),
            "2018-06-27": ("Ryugu arrival", None),
            "2020-12-06": ("Sample return to Earth", "earth"),
        },
    },
    {
        "id": "bepicolombo",
        "naif": "-121",
        "color": "#bbaa55",
        "sort_order": 22,
        "start": "2018-10-21",
        "stop": "2026-12-01",
        "step": "60d",
        "meta": {
            "name": "BepiColombo",
            "description": "Joint ESA/JAXA mission to Mercury using one of the most complex flyby sequences ever: one Earth, two Venus, and six Mercury gravity assists to slow into orbit.",
            "agency": "ESA/JAXA",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2020-04-10": ("Earth flyby", "earth"),
            "2020-10-15": ("Venus flyby 1", "venus"),
            "2021-08-10": ("Venus flyby 2", "venus"),
            "2021-10-02": ("Mercury flyby 1", "mercury"),
            "2022-06-23": ("Mercury flyby 2", "mercury"),
            "2023-06-20": ("Mercury flyby 3", "mercury"),
            "2024-09-05": ("Mercury flyby 4", "mercury"),
            "2024-12-02": ("Mercury flyby 5", "mercury"),
            "2025-01-09": ("Mercury flyby 6", "mercury"),
            "2026-11-01": ("Mercury orbit insertion", "mercury"),
        },
    },
    {
        "id": "juice",
        "naif": "-28",
        "color": "#55bbdd",
        "sort_order": 23,
        "start": "2023-04-15",
        "stop": "2031-07-20",
        "step": "90d",
        "meta": {
            "name": "JUICE",
            "description": "ESA\u2019s Jupiter Icy Moons Explorer, en route to study Ganymede, Europa, and Callisto. Uses a complex series of gravity assists including a rare lunar\u2013Earth double flyby.",
            "agency": "ESA",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2024-08-20": ("Luna\u2013Earth gravity assist", "earth"),
            "2025-08-31": ("Venus gravity assist", "venus"),
            "2026-09-29": ("Earth gravity assist 2", "earth"),
            "2029-01-18": ("Earth gravity assist 3", "earth"),
            "2031-07-21": ("Jupiter orbit insertion", "jupiter"),
        },
    },
    {
        "id": "solar-orbiter",
        "naif": "-144",
        "color": "#ffbb44",
        "sort_order": 24,
        "start": "2020-02-11",
        "stop": "2030-01-01",
        "step": "60d",
        "meta": {
            "name": "Solar Orbiter",
            "description": "ESA/NASA mission studying the Sun from close range and high latitudes. Uses repeated Venus gravity assists to tilt its orbit out of the ecliptic plane.",
            "agency": "ESA/NASA",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2020-12-27": ("Venus flyby 1", "venus"),
            "2021-08-09": ("Venus flyby 2", "venus"),
            "2022-03-26": ("Close perihelion (0.32 AU)", None),
            "2022-09-04": ("Venus flyby 3", "venus"),
            "2025-02-18": ("Venus flyby 4", "venus"),
            "2026-12-24": ("Venus flyby 5", "venus"),
            "2028-03-17": ("Venus flyby 6", "venus"),
        },
    },
    {
        "id": "psyche",
        "naif": "-255",
        "color": "#aabb99",
        "sort_order": 25,
        "start": "2023-10-14",
        "stop": "2029-06-25",
        "step": "90d",
        "meta": {
            "name": "Psyche",
            "description": "En route to 16 Psyche, a metal-rich asteroid that may be the exposed core of an early planetesimal. Uses solar electric propulsion and a Mars gravity assist.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2026-05-01": ("Mars gravity assist", "mars"),
            "2029-06-25": ("Psyche orbit insertion", None),
        },
    },
    {
        "id": "dart",
        "naif": "-135",
        "color": "#ff5566",
        "sort_order": 26,
        "start": "2021-11-25",
        "stop": "2022-09-27",
        "step": "30d",
        "meta": {
            "name": "DART",
            "description": "First planetary defense test mission. Successfully impacted asteroid moonlet Dimorphos in September 2022, altering its orbit around Didymos.",
            "agency": "NASA/APL",
            "end_date": "2022-09-26",
            "status": "completed",
        },
        "flybys": {
            "2022-09-26": ("Dimorphos impact", None),
        },
    },
    {
        "id": "perseverance",
        "naif": "-168",
        "color": "#dd7744",
        "sort_order": 27,
        "start": "2020-07-31",
        "stop": "2021-02-19",
        "step": "15d",
        "meta": {
            "name": "Perseverance",
            "description": "NASA\u2019s Mars 2020 rover, searching for signs of ancient microbial life in Jezero Crater. Carries the Ingenuity helicopter, the first aircraft to fly on another planet.",
            "agency": "NASA/JPL",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2021-02-18": ("Mars landing", "mars"),
        },
    },
    {
        "id": "venus-express",
        "naif": "-248",
        "color": "#cc99dd",
        "sort_order": 28,
        "start": "2005-11-10",
        "stop": "2014-12-31",
        "step": "90d",
        "meta": {
            "name": "Venus Express",
            "description": "ESA\u2019s first Venus mission. Orbited for 8 years studying the atmosphere, clouds, and surface of Venus, discovering a cold layer and a variable south polar vortex.",
            "agency": "ESA",
            "end_date": "2014-12-16",
            "status": "completed",
        },
        "flybys": {
            "2006-04-11": ("Venus orbit insertion", "venus"),
        },
    },
    {
        "id": "mars-express",
        "naif": "-41",
        "color": "#ee8855",
        "sort_order": 29,
        "start": "2003-06-03",
        "stop": "2004-01-25",
        "step": "15d",
        "meta": {
            "name": "Mars Express",
            "description": "ESA\u2019s first planetary mission. Has been orbiting Mars since 2003, discovering subsurface water ice and mapping the planet in unprecedented detail. Still active after 20+ years.",
            "agency": "ESA",
            "end_date": None,
            "status": "active",
        },
        "flybys": {
            "2003-12-25": ("Mars orbit insertion", "mars"),
        },
    },
]


def fetch_trajectory(naif_id: str, start: str, stop: str, step: str) -> list[dict]:
    """Fetch heliocentric trajectory waypoints from JPL Horizons."""
    epochs = {"start": start, "stop": stop, "step": step}
    obj = Horizons(id=naif_id, location="@sun", epochs=epochs)
    vectors = obj.vectors()

    waypoints = []
    for i, row in enumerate(vectors):
        jd = float(row["datetime_jd"])
        t = Time(jd, format="jd")
        epoch_date = t.datetime.strftime("%Y-%m-%d")
        waypoints.append({
            "waypoint_order": i,
            "epoch": epoch_date,
            "x": float(row["x"]),
            "y": float(row["y"]),
            "z": float(row["z"]),
            "label": None,
            "object_id": None,
        })
    return waypoints


def apply_flyby_labels(waypoints: list[dict], flybys: dict) -> list[dict]:
    """Assign labels and object_ids to waypoints closest to flyby dates."""
    for flyby_date_str, (label, object_id) in flybys.items():
        flyby_date = datetime.strptime(flyby_date_str, "%Y-%m-%d")
        best_idx = 0
        best_delta = float("inf")
        for i, wp in enumerate(waypoints):
            wp_date = datetime.strptime(wp["epoch"], "%Y-%m-%d")
            delta = abs((wp_date - flyby_date).total_seconds())
            if delta < best_delta:
                best_delta = delta
                best_idx = i
        waypoints[best_idx]["label"] = label
        waypoints[best_idx]["object_id"] = object_id
    # Always label first waypoint as Launch if unlabeled
    if waypoints and not waypoints[0]["label"]:
        waypoints[0]["label"] = "Launch"
        waypoints[0]["object_id"] = "earth"
    return waypoints


def seed_mission(config: dict):
    """Seed a single mission."""
    mission_id = config["id"]
    meta = config["meta"]
    print(f"\n{'='*50}")
    print(f"Seeding: {meta['name']} ({mission_id})")

    # 1. Trajectory from JPL Horizons
    print(f"  Fetching trajectory from JPL Horizons (NAIF {config['naif']})...")
    waypoints = fetch_trajectory(config["naif"], config["start"], config["stop"], config["step"])
    print(f"  Got {len(waypoints)} waypoints")

    # 2. Apply flyby labels
    waypoints = apply_flyby_labels(waypoints, config.get("flybys", {}))
    labeled = [w for w in waypoints if w["label"]]
    print(f"  Labeled {len(labeled)} events: {[w['label'] for w in labeled]}")

    # 3. Upsert mission
    mission_row = {
        "id": mission_id,
        "name": meta["name"],
        "description": meta["description"],
        "agency": meta.get("agency"),
        "launch_date": config["start"],
        "end_date": meta.get("end_date"),
        "status": meta.get("status", "active"),
        "color": config["color"],
        "sort_order": config["sort_order"],
    }
    supabase.table("missions").upsert(mission_row).execute()
    print(f"  Upserted mission row")

    # 4. Replace waypoints (delete old + insert new)
    supabase.table("mission_waypoints").delete().eq("mission_id", mission_id).execute()
    wp_rows = [
        {
            "mission_id": mission_id,
            "waypoint_order": wp["waypoint_order"],
            "label": wp["label"],
            "object_id": wp["object_id"],
            "epoch": wp["epoch"],
            "x": wp["x"],
            "y": wp["y"],
            "z": wp["z"],
        }
        for wp in waypoints
    ]
    batch_size = 50
    for i in range(0, len(wp_rows), batch_size):
        batch = wp_rows[i : i + batch_size]
        supabase.table("mission_waypoints").insert(batch).execute()
    print(f"  Inserted {len(wp_rows)} waypoints")


def main():
    print("=" * 50)
    print("MISSION SEED SCRIPT")
    print("Source: JPL Horizons (trajectories + metadata)")
    print(f"Missions to seed: {len(MISSIONS)}")
    print("=" * 50)

    for config in MISSIONS:
        try:
            seed_mission(config)
            time.sleep(1)  # Be polite to Horizons
        except Exception as e:
            print(f"  ERROR seeding {config['id']}: {e}")
            import traceback
            traceback.print_exc()

    # Final count
    missions = supabase.table("missions").select("id").execute()
    waypoints = supabase.table("mission_waypoints").select("id", count="exact").execute()
    print(f"\n{'='*50}")
    print(f"Done! {len(missions.data)} missions, {waypoints.count} total waypoints")


if __name__ == "__main__":
    main()
