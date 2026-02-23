import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useStore } from "../../../store/store";
import {
  calculateCelestialVisibilityScore,
  getVisibilityColor,
} from "../../../utils/visibilityCalculator";
import type { WeatherConditions, CelestialObject } from "../../../types";
import {
  getAllWeatherFromCache,
  getWeatherFromBulkCache,
} from "../../../utils/weatherService";

// Cache for visibility scores - keyed by "objectId,lat,lon,time10min"
const visibilityCache = new Map<string, number>();
const CACHE_MAX_SIZE = 10000;
const CACHE_TIME_RESOLUTION_MS = 600000; // 10 minutes

function getCacheKey(lat: number, lon: number, time: Date, objectId: string): string {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  const timeMinute = Math.floor(time.getTime() / CACHE_TIME_RESOLUTION_MS);
  return `${objectId},${roundedLat},${roundedLon},${timeMinute}`;
}

function getCachedScore(
  lat: number,
  lon: number,
  time: Date,
  weatherCache: Map<string, WeatherConditions>,
  object: CelestialObject | null
): { score: number; hasRealWeather: boolean } {
  const key = getCacheKey(lat, lon, time, object?.id ?? 'moon');

  if (visibilityCache.has(key)) {
    const cached = visibilityCache.get(key)!;
    return { score: Math.abs(cached), hasRealWeather: cached >= 0 };
  }

  const weather = getWeatherFromBulkCache(lat, lon, weatherCache);

  if (!weather) {
    visibilityCache.set(key, -0.5);
    return { score: 0.5, hasRealWeather: false };
  }

  const score = calculateCelestialVisibilityScore(lat, lon, time, weather, object);

  if (visibilityCache.size >= CACHE_MAX_SIZE) {
    const firstKey = visibilityCache.keys().next().value;
    if (firstKey) visibilityCache.delete(firstKey);
  }

  visibilityCache.set(key, score);
  return { score, hasRealWeather: true };
}

// --- Canvas-based L.GridLayer subclass ---

interface IVisibilityGridLayer extends L.GridLayer {
  _weatherCache: Map<string, WeatherConditions>;
  _currentTime: Date;
  _selectedObject: CelestialObject | null;
  setWeatherCache(cache: Map<string, WeatherConditions>): void;
  setCurrentTime(time: Date): void;
  setSelectedObject(obj: CelestialObject | null): void;
}

const VisibilityGridLayer = L.GridLayer.extend({
  _weatherCache: new Map() as Map<string, WeatherConditions>,
  _currentTime: new Date(),
  _selectedObject: null as CelestialObject | null,

  setWeatherCache(this: IVisibilityGridLayer, cache: Map<string, WeatherConditions>) {
    this._weatherCache = cache;
  },

  setCurrentTime(this: IVisibilityGridLayer, time: Date) {
    this._currentTime = time;
  },

  setSelectedObject(this: IVisibilityGridLayer, obj: CelestialObject | null) {
    this._selectedObject = obj;
  },

  createTile(this: IVisibilityGridLayer & { _map: L.Map; getTileSize(): L.Point }, coords: L.Coords): HTMLCanvasElement {
    const tile = document.createElement("canvas");
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;

    const ctx = tile.getContext("2d");
    if (!ctx) return tile;

    const map = this._map;
    const zoom = coords.z;
    const tileSize = size.x;
    const weatherCache = this._weatherCache;
    const now = this._currentTime;
    const selectedObject = this._selectedObject;

    // Tile pixel origin in global pixel space
    const nwPixel = L.point(coords.x * tileSize, coords.y * tileSize);

    // Geographic bounds of this tile
    const nw = map.unproject(nwPixel, zoom);
    const se = map.unproject(L.point((coords.x + 1) * tileSize, (coords.y + 1) * tileSize), zoom);

    // Grid cell size at this zoom
    const baseSize = 2.5;
    const cellSize = baseSize / Math.pow(2, zoom - 4);

    // Find grid cells that overlap this tile
    const latStart = Math.floor(se.lat / cellSize) * cellSize;
    const latEnd = Math.ceil(nw.lat / cellSize) * cellSize;
    const lngStart = Math.floor(nw.lng / cellSize) * cellSize;
    const lngEnd = Math.ceil(se.lng / cellSize) * cellSize;

    for (let lat = latStart; lat < latEnd; lat += cellSize) {
      for (let lng = lngStart; lng < lngEnd; lng += cellSize) {
        const cellCenterLat = lat + cellSize / 2;
        const cellCenterLng = lng + cellSize / 2;

        const { score, hasRealWeather } = getCachedScore(
          cellCenterLat, cellCenterLng, now, weatherCache, selectedObject
        );

        const color = hasRealWeather ? getVisibilityColor(score) : "#6B7280";
        const opacity = hasRealWeather ? 0.25 + score * 0.2 : 0.15;

        // Convert cell corners from lat/lng to tile-local pixel coords
        const cellNW = map.project(L.latLng(lat + cellSize, lng), zoom);
        const cellSE = map.project(L.latLng(lat, lng + cellSize), zoom);

        const x0 = cellNW.x - nwPixel.x;
        const y0 = cellNW.y - nwPixel.y;
        const x1 = cellSE.x - nwPixel.x;
        const y1 = cellSE.y - nwPixel.y;

        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        // Expand by 0.5px to avoid sub-pixel seams between adjacent tiles
        ctx.fillRect(x0 - 0.5, y0 - 0.5, (x1 - x0) + 1, (y1 - y0) + 1);
      }
    }

    ctx.globalAlpha = 1.0;
    return tile;
  },
}) as unknown as { new (options?: L.GridLayerOptions): IVisibilityGridLayer };

// --- React component ---

export default function HexGridLayer() {
  const map = useMap();
  const selectedObject = useStore((state) => state.selectedObject);
  const layerRef = useRef<IVisibilityGridLayer | null>(null);

  const [weatherCache, setWeatherCache] = useState<Map<string, WeatherConditions>>(new Map());
  const weatherLoadedRef = useRef(false);
  const timeRef = useRef<number>(Math.floor(Date.now() / CACHE_TIME_RESOLUTION_MS));

  // Load weather data on mount + refresh every 5 min
  useEffect(() => {
    if (weatherLoadedRef.current) return;
    weatherLoadedRef.current = true;

    getAllWeatherFromCache().then((cache) => {
      setWeatherCache(cache);
    });

    const interval = setInterval(() => {
      getAllWeatherFromCache().then((cache) => {
        setWeatherCache(cache);
        visibilityCache.clear();
        if (layerRef.current) {
          layerRef.current.setWeatherCache(cache);
          layerRef.current.redraw();
        }
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Time-based redraw every 60s if the 10-min bucket changed
  useEffect(() => {
    const interval = setInterval(() => {
      const currentBucket = Math.floor(Date.now() / CACHE_TIME_RESOLUTION_MS);
      if (currentBucket !== timeRef.current) {
        timeRef.current = currentBucket;
        visibilityCache.clear();
        if (layerRef.current) {
          layerRef.current.setCurrentTime(new Date());
          layerRef.current.redraw();
        }
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Layer lifecycle — create/destroy based on map + selectedObject
  useEffect(() => {
    if (!map || !selectedObject) {
      if (layerRef.current) {
        map?.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      return;
    }

    let pane = map.getPane("hexPane");
    if (!pane) {
      pane = map.createPane("hexPane");
      pane.style.zIndex = "600";
      pane.style.pointerEvents = "none";
      pane.style.cursor = "default";
    }

    const gridLayer = new VisibilityGridLayer({
      tileSize: 256,
      noWrap: true,
      pane: "hexPane",
      opacity: 1,
      updateWhenZooming: false,
      keepBuffer: 2,
    });

    visibilityCache.clear();
    gridLayer.setWeatherCache(weatherCache);
    gridLayer.setCurrentTime(new Date());
    gridLayer.setSelectedObject(selectedObject);
    gridLayer.addTo(map);
    layerRef.current = gridLayer;

    return () => {
      map.removeLayer(gridLayer);
      layerRef.current = null;
    };
  }, [map, selectedObject]);

  // Sync weather cache to existing layer without recreating it
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setWeatherCache(weatherCache);
      layerRef.current.redraw();
    }
  }, [weatherCache]);

  return null;
}
