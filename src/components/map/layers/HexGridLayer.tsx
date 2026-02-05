import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useStore } from "../../../store/store";
import {
  calculateCelestialVisibilityScore,
  getVisibilityColor,
} from "../../../utils/visibilityCalculator";
import type { WeatherConditions } from "../../../types";
import {
  getAllWeatherFromCache,
  getWeatherFromBulkCache,
} from "../../../utils/weatherService";

// Cache for visibility scores - keyed by "lat,lon,time10min"
const visibilityCache = new Map<string, number>();
const CACHE_MAX_SIZE = 10000;
const CACHE_TIME_RESOLUTION_MS = 600000; // 10 minutes

function getCacheKey(lat: number, lon: number, time: Date): string {
  // Round coordinates to 2 decimal places and time to nearest minute
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  const timeMinute = Math.floor(time.getTime() / CACHE_TIME_RESOLUTION_MS);
  return `${roundedLat},${roundedLon},${timeMinute}`;
}

// Returns { score, hasRealWeather } - score is -1 if no real weather data
function getCachedScore(
  lat: number,
  lon: number,
  time: Date,
  weatherCache: Map<string, WeatherConditions>
): { score: number; hasRealWeather: boolean } {
  const key = getCacheKey(lat, lon, time);

  // Check visibility cache first
  if (visibilityCache.has(key)) {
    const cached = visibilityCache.get(key)!;
    // Negative scores indicate no real weather data
    return { score: Math.abs(cached), hasRealWeather: cached >= 0 };
  }

  // Get weather for this location from bulk cache
  const weather = getWeatherFromBulkCache(lat, lon, weatherCache);

  if (!weather) {
    // No real weather data - cache as negative to remember
    visibilityCache.set(key, -0.5);
    return { score: 0.5, hasRealWeather: false };
  }

  // Calculate and cache
  const score = calculateCelestialVisibilityScore(lat, lon, time, weather);

  // Evict old entries if cache is too large
  if (visibilityCache.size >= CACHE_MAX_SIZE) {
    const firstKey = visibilityCache.keys().next().value;
    if (firstKey) visibilityCache.delete(firstKey);
  }

  visibilityCache.set(key, score);
  return { score, hasRealWeather: true };
}

// Square grid generator
// Generates a grid of squares covering an expanded area around the view
function generateSquareGrid(bounds: L.LatLngBounds, zoom: number): any[] {
  // Determine cell size based on zoom
  // Higher zoom = smaller cells
  const baseSize = 2.5; // degrees at zoom 4
  const cellSize = baseSize / Math.pow(2, zoom - 4);

  // Expand bounds by 50% in each direction for pre-rendering
  const latPadding = (bounds.getNorth() - bounds.getSouth()) * 0.5;
  const lonPadding = (bounds.getEast() - bounds.getWest()) * 0.5;

  const cells: any[] = [];

  const latStart = Math.floor((bounds.getSouth() - latPadding) / cellSize) * cellSize;
  const latEnd = Math.ceil((bounds.getNorth() + latPadding) / cellSize) * cellSize;
  const lonStart = Math.floor((bounds.getWest() - lonPadding) / cellSize) * cellSize;
  const lonEnd = Math.ceil((bounds.getEast() + lonPadding) / cellSize) * cellSize;

  // Cap max cells to prevent performance issues
  const maxCells = 2000;
  const estimatedCells = ((latEnd - latStart) / cellSize) * ((lonEnd - lonStart) / cellSize);

  if (estimatedCells > maxCells) {
    // Fall back to just the viewport if too many cells
    const latStartFallback = Math.floor(bounds.getSouth() / cellSize) * cellSize;
    const latEndFallback = Math.ceil(bounds.getNorth() / cellSize) * cellSize;
    const lonStartFallback = Math.floor(bounds.getWest() / cellSize) * cellSize;
    const lonEndFallback = Math.ceil(bounds.getEast() / cellSize) * cellSize;

    for (let lat = latStartFallback; lat < latEndFallback; lat += cellSize) {
      for (let lon = lonStartFallback; lon < lonEndFallback; lon += cellSize) {
        const points = [
          [lat, lon],
          [lat + cellSize, lon],
          [lat + cellSize, lon + cellSize],
          [lat, lon + cellSize],
        ];
        cells.push({
          center: { lat: lat + cellSize / 2, lon: lon + cellSize / 2 },
          points: points,
        });
      }
    }
    return cells;
  }

  for (let lat = latStart; lat < latEnd; lat += cellSize) {
    for (let lon = lonStart; lon < lonEnd; lon += cellSize) {
      const points = [
        [lat, lon],
        [lat + cellSize, lon],
        [lat + cellSize, lon + cellSize],
        [lat, lon + cellSize],
      ];

      cells.push({
        center: { lat: lat + cellSize / 2, lon: lon + cellSize / 2 },
        points: points,
      });
    }
  }
  return cells;
}

export default function HexGridLayer() {
  const map = useMap();
  const selectedObject = useStore((state) => state.selectedObject);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderRef = useRef<{
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
    time: number;
  } | null>(null);

  // Weather cache from Supabase
  const [weatherCache, setWeatherCache] = useState<Map<string, WeatherConditions>>(new Map());
  const weatherLoadedRef = useRef(false);

  // Load weather data on mount
  useEffect(() => {
    if (weatherLoadedRef.current) return;
    weatherLoadedRef.current = true;

    getAllWeatherFromCache().then((cache) => {
      setWeatherCache(cache);
    });

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      getAllWeatherFromCache().then((cache) => {
        setWeatherCache(cache);
        // Clear visibility cache when weather updates
        visibilityCache.clear();
        lastRenderRef.current = null;
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const updateGrid = useCallback(() => {
    if (!map || !selectedObject) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const now = new Date();
    const currentTimeMinute = Math.floor(now.getTime() / CACHE_TIME_RESOLUTION_MS);

    // Check if current view is still within previously rendered area
    if (lastRenderRef.current && lastRenderRef.current.zoom === zoom && lastRenderRef.current.time === currentTimeMinute) {
      const { north, south, east, west } = lastRenderRef.current;
      // Only re-render if we've panned more than 25% outside the previously rendered bounds
      const threshold = 0.25;
      const latRange = north - south;
      const lonRange = east - west;

      if (bounds.getNorth() < north - latRange * threshold &&
          bounds.getSouth() > south + latRange * threshold &&
          bounds.getEast() < east - lonRange * threshold &&
          bounds.getWest() > west + lonRange * threshold) {
        return; // Still within pre-rendered area, skip update
      }
    }

    // Store the expanded bounds we're about to render
    const latPadding = (bounds.getNorth() - bounds.getSouth()) * 0.5;
    const lonPadding = (bounds.getEast() - bounds.getWest()) * 0.5;
    lastRenderRef.current = {
      north: bounds.getNorth() + latPadding,
      south: bounds.getSouth() - latPadding,
      east: bounds.getEast() + lonPadding,
      west: bounds.getWest() - lonPadding,
      zoom,
      time: currentTimeMinute,
    };

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const cells = generateSquareGrid(bounds, zoom);
    const layerGroup = L.layerGroup();

    cells.forEach((cell) => {
      // Use cached score calculation with real weather
      const { score, hasRealWeather } = getCachedScore(
        cell.center.lat,
        cell.center.lon,
        now,
        weatherCache
      );

      // Grey for no data, normal color gradient for real weather
      const color = hasRealWeather ? getVisibilityColor(score) : "#6B7280";
      const opacity = hasRealWeather ? 0.25 + score * 0.2 : 0.15;

      const polygon = L.polygon(cell.points, {
        pane: "hexPane",
        stroke: false,
        fillColor: color,
        fillOpacity: opacity,
      });
      layerGroup.addLayer(polygon);
    });

    layerGroup.addTo(map);
    layerRef.current = layerGroup;
  }, [map, selectedObject, weatherCache]);

  // Debounced update handler
  const debouncedUpdate = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(updateGrid, 150);
  }, [updateGrid]);

  useEffect(() => {
    if (!map || !selectedObject) {
      return;
    }

    // Create custom pane for grid
    let pane = map.getPane("hexPane");
    if (!pane) {
      pane = map.createPane("hexPane");
      pane.style.zIndex = "600";
      pane.style.pointerEvents = "none";
      pane.style.cursor = "default";
    }

    // Initial draw
    updateGrid();

    // Debounced re-draw on moveend
    map.on("moveend", debouncedUpdate);

    return () => {
      map.off("moveend", debouncedUpdate);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, selectedObject, updateGrid, debouncedUpdate]);

  return null;
}
