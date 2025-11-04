# Visibility Calculations Documentation

This document explains the mathematical formulas and algorithms used to calculate celestial object visibility on Earth's surface.

## Table of Contents

1. [Horizon Distance Formula](#horizon-distance-formula)
2. [Atmospheric Refraction](#atmospheric-refraction)
3. [Maximum Line-of-Sight Distance](#maximum-line-of-sight-distance)
4. [Koschmieder's Law](#koschmieders-law)
5. [Weather Impact on Visibility](#weather-impact-on-visibility)
6. [Time of Day Considerations](#time-of-day-considerations)
7. [Implementation Strategy](#implementation-strategy)

---

## Horizon Distance Formula

**Source:** Federal Communications Commission (FCC), standard atmospheric science

### Basic Formula

The distance to the horizon from an observer at height `h` (in meters) is:

```
d = 3.57 × √h
```

Where:
- `d` = distance to horizon in kilometers
- `h` = observer height above ground level in meters

This formula accounts for Earth's curvature (radius ≈ 6,371 km).

### Example

An observer at 100 meters height can see up to:
```
d = 3.57 × √100 = 3.57 × 10 = 35.7 km
```

---

## Atmospheric Refraction

**Source:** FCC, standard atmospheric science

Atmospheric refraction bends light downward, effectively extending the visible horizon. To account for this, the formula becomes:

```
d = 3.57 × √(K × h)
```

Where:
- `K` = refraction coefficient (typically 4/3 ≈ 1.333 under standard conditions)

This adjustment accounts for light bending through Earth's atmosphere, extending the visible range by approximately 15%.

### Example

Using the refraction coefficient:
```
d = 3.57 × √(1.333 × 100) = 3.57 × √133.3 ≈ 41.2 km
```

---

## Maximum Line-of-Sight Distance

**Source:** Federal Communications Commission (FCC)

When considering both the observer and target heights, the maximum line-of-sight distance `D_max` is:

```
D_max = 3.57 × (√h₁ + √h₂)
```

Where:
- `h₁` = observer height in meters
- `h₂` = target height in meters

This calculates the distance at which two elevated points can see each other, assuming no obstacles.

### Example

Observer at 100m and satellite at 400km altitude:
```
h₁ = 100m  →  √100 = 10
h₂ = 400km = 400,000m  →  √400,000 ≈ 632.5

D_max = 3.57 × (10 + 632.5) = 3.57 × 642.5 ≈ 2,292 km
```

---

## Koschmieder's Law

**Source:** Atmospheric optics, visibility science

Koschmieder's law relates visibility distance to the atmospheric extinction coefficient:

```
V = 3.912 / β
```

Where:
- `V` = visibility distance in kilometers
- `β` = atmospheric extinction coefficient (varies with weather conditions)

### Common Extinction Coefficients

| Weather Condition | β Range | Visibility Range |
|-------------------|---------|------------------|
| Clear sky         | 0.01-0.05 | 78-391 km      |
| Light haze        | 0.05-0.2  | 20-78 km       |
| Moderate haze     | 0.2-1.0   | 4-20 km        |
| Heavy fog         | 1-10      | 0.4-4 km       |
| Dense fog         | 10-100    | 0.04-0.4 km    |

### Contrast Reduction

Koschmieder's law also describes how object contrast decreases with distance:

```
C = C₀ × e^(-β × d)
```

Where:
- `C` = observed contrast
- `C₀` = inherent contrast
- `d` = distance in kilometers
- `β` = extinction coefficient

---

## Weather Impact on Visibility

Weather conditions significantly affect visibility through multiple mechanisms:

### Cloud Cover
- Dense clouds (cumulonimbus): completely block visibility
- Thin clouds (cirrus): minimal impact
- Cloud cover factor: `0.0` (clear) to `1.0` (completely overcast)

### Precipitation
- Light rain (< 2.5 mm/h): minimal impact
- Moderate rain (2.5-10 mm/h): moderate reduction
- Heavy rain (> 10 mm/h): severe reduction
- Snow: similar to rain, with additional scattering

### Fog/Mist
- Causes highest extinction coefficients
- Can reduce visibility to meters
- Usually local but persistent

### Calculating Extinction Coefficient from Weather

A simplified model:

```
β = β_base + (cloudCover × 0.5) + (precipitation × 0.1) + (fog × 20)
```

Where:
- `β_base` = 0.05 (clear air baseline)
- Values in appropriate units (0-1 for cloudCover and fog, mm/h for precipitation)

---

## Time of Day Considerations

Visibility depends on available light:

### Daytime
- Maximum visibility
- Clear conditions: full theoretical range
- Factor: `1.0`

### Dawn/Dusk
- Twilight period: 20-40 minutes before/after sunrise/sunset
- Reduced but still usable visibility
- Factor: `0.6-0.8`

### Nighttime
- Limited by artificial lighting and moonlight
- Clear nights: ~30% of daylight visibility
- Overcast nights: minimal visibility (<10%)
- Factor: `0.1-0.3` depending on moon phase

### Solar Position Calculation

To determine day/night status, calculate solar altitude angle:

```
altitude_angle = arcsin(sin(lat) × sin(dec) + cos(lat) × cos(dec) × cos(hour_angle))
```

Where:
- `lat` = observer latitude
- `dec` = solar declination
- `hour_angle` = local solar time angle

Simplified approach: Use sunrise/sunset times from astronomical algorithms.

---

## Implementation Strategy

### Combined Visibility Model

Calculate a composite visibility score combining all factors:

```typescript
function calculateVisibilityScore(
  observerPos: {lat: number, lon: number, alt: number},
  targetPos: {lat: number, lon: number, alt: number},
  weather: WeatherConditions
): number {
  // 1. Calculate great circle distance
  const distance = haversineDistance(observerPos, targetPos)
  
  // 2. Check geometric visibility (with refraction)
  const K = 4/3  // refraction coefficient
  const observerHorizon = 3.57 * Math.sqrt(K * observerPos.alt / 1000)
  const targetHorizon = 3.57 * Math.sqrt(K * targetPos.alt / 1000)
  const maxLOS = observerHorizon + targetHorizon
  
  // 3. Calculate weather-based visibility limit
  const extinctionCoeff = calculateExtinctionCoefficient(weather)
  const weatherLimit = 3.912 / extinctionCoeff
  
  // 4. Effective visibility is minimum of geometric and weather limits
  const effectiveLimit = Math.min(maxLOS, weatherLimit)
  
  // 5. Calculate visibility score (0-1)
  if (distance > effectiveLimit) return 0
  
  // Apply Koschmieder contrast reduction
  const contrast = Math.exp(-extinctionCoeff * distance)
  
  // Apply time-of-day factor
  const timeFactor = getTimeOfDayFactor(observerPos, currentTime)
  
  return contrast * timeFactor
}
```

### Great Circle Distance (Haversine Formula)

Calculate distance between two points on Earth's surface:

```
a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1-a))
d = R × c
```

Where:
- `φ₁, φ₂` = latitudes
- `Δφ` = difference in latitudes
- `Δλ` = difference in longitudes
- `R` = Earth radius (6,371 km)

---

## References

1. Federal Communications Commission. "Technical Rules Part 1, Sections 22-30: Mobile Services." (FCC-10-186A1)
2. Wikipedia contributors. "Horizon." Wikipedia, The Free Encyclopedia.
3. Wikipedia contributors. "Koschmieder's law." Wikipedia, The Free Encyclopedia.
4. Wikipedia contributors. "Line-of-sight propagation." Wikipedia, The Free Encyclopedia.
5. International Civil Aviation Organization. "Manual of Aeronautical Meteorological Practice" (Doc 8896)
6. Atmospheric Optics Research Group. Various visibility and extinction models.

---

## Notes for Implementation

- All distances in kilometers for consistency with formulas
- Heights in meters converted to kilometers when needed
- Earth radius: 6,371 km (mean)
- Atmospheric refraction coefficient: 4/3 (standard conditions)
- Weather data can be mocked initially, easily swapped with real API data
- Time calculations should use proper astronomical algorithms for accuracy
- Consider adding terrain/elevation model for surface-level objects

