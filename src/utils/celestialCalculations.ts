// import SunCalc from 'suncalc' -- unused for manual calc
import type { Position } from '../types'

/**
 * Calculate the current position (sub-lunar point) of the Moon.
 * SunCalc returns azimuth and altitude for a specific observer.
 * To get the "sub-lunar point" (lat/lon), we need to reverse this or find the point where altitude is 90 degrees.
 * 
 * However, a simpler approximation for the sub-lunar point (lat/lon) 
 * can be derived from the Moon's Equatorial Coordinates (Right Ascension & Declination).
 * SunCalc provides getMoonPosition(date, lat, lon) which gives azimuth/altitude.
 * It also provides getMoonIllumination(date).
 * 
 * BUT, standard SunCalc doesn't directly export RA/Dec or sub-lunar point.
 * We can approximate it by iterating or using a library that supports it.
 * 
 * A better approach with standard SunCalc:
 * 1. Calculate moon position for (lat=0, lon=0) at given time.
 * 2. This creates a reference.
 * 
 * Actually, let's use a known formula or a more robust library if needed.
 * But sticking to the plan: SunCalc.
 * 
 * Wait, SunCalc.getMoonPosition(date, lat, lng) returns:
 * - azimuth: (radians)
 * - altitude: (radians)
 * - distance: (km)
 * - parallacticAngle: (radians)
 * 
 * To find the sub-lunar point (where altitude is 90 deg / PI/2 rads), we need the GHA (Greenwich Hour Angle) and Dec (Declination).
 * 
 * Let's calculate Declination and Right Ascension properly.
 * We'll implement a helper to convert RA/Dec to Lat/Lon (Sub-lunar point).
 * 
 * Sub-point Latitude = Declination
 * Sub-point Longitude = (Ra - GLAST) * -1 (simplified) -> needs Greenwich Sidereal Time.
 * 
 * Since SunCalc doesn't give us RA/Dec directly in a clean way without observer, 
 * we might need to be clever.
 * 
 * Actually, looking at SunCalc source, it computes ra/dec internally.
 * Ideally we'd use 'astronomy-engine' or similar for this, but user approved 'suncalc'.
 * 
 * Let's use a robust approximation for now or check if we can extract it.
 * 
 * Alternative: Since we just need *a* position for the demo/app to work and not crash,
 * we can calculate the moon position for the user's current location (or default 0,0) 
 * and render relative to that? No, we need absolute Lat/Lon for the map marker.
 * 
 * Let's implement a standard astronomical calculation for Moon position here manually 
 * if SunCalc falls short, OR use a simplified version.
 * 
 * Actually, let's try to infer it. 
 * The sub-lunar latitude is equal to the Declination.
 * The sub-lunar longitude requires Greenwich Sidereal Time.
 * 
 * Let's implement a concise algorithm here to get Lat/Lon.
 */

export function calculateMoonPosition(date: Date): Position {
    // 1. Get Julian Date
    const t = date.getTime() / 1000
    const jd = t / 86400 + 2440587.5
    const d = jd - 2451543.5

    // 2. Ecliptic longitude of the moon
    const L = 218.316 + 13.176396 * d
    const M = 134.963 + 13.064993 * d

    const l = L + 6.289 * Math.sin(rad(M))

    // 3. Obliquity of the ecliptic
    const dist = 385000.56 + -20905.355 * Math.cos(rad(M)) // km

    // 4. Calculate RA and Dec (Approximate)
    // This is a simplified model. For high precision we'd want a bigger library.
    // But for the visualization map (zoom 4), this is sufficient.

    // We can actually use SunCalc to get specific localized position if we want,
    // but for the "Where is the Moon NOW on the map" we need global coordinates.

    // Let's use `suncalc` to get the position if possible. 
    // SunCalc.getMoonPosition actually converts from internal RA/Dec to Az/Alt.
    // Converting back is painful.

    // Let's rely on a direct calculation here for the sub-point.

    // Calculation adapted from standard astronomical formulas (e.g. Meeus)
    // Sub-point Lat/Lon

    const ra = Math.atan2(Math.sin(rad(l)) * Math.cos(rad(23.44)), Math.cos(rad(l)))
    const dec = Math.asin(Math.sin(rad(l)) * Math.sin(rad(23.44)))

    // Greenwich Mean Sidereal Time (GMST)
    const GMST = 18.697374558 + 24.06570982441908 * d
    const GMST_rad = rad((GMST % 24) * 15)

    const lat = deg(dec)
    let lon = deg(ra - GMST_rad)

    // Provide correct wrapping for longitude
    lon = ((lon + 180) % 360) - 180

    // Ensure we are within reasonable bounds (standard normalization)
    if (lon < -180) lon += 360
    if (lon > 180) lon -= 360

    return {
        lat,
        lon,
        altitude: dist
    }
}

function rad(deg: number): number {
    return deg * (Math.PI / 180)
}

function deg(rad: number): number {
    return rad * (180 / Math.PI)
}
