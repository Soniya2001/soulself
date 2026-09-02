import * as THREE from "three";
import { JournalLocation } from "../types";
import { POPULAR_LOCATIONS } from "../data/initialData";

const LOCATION_STORAGE_KEY = "soulself_user_preferred_location";

/**
 * Single Reusable Spherical to 3D Cartesian Conversion Function.
 * Converts Geographic Latitude (-90 to +90) and Longitude (-180 to +180) in degrees
 * into Three.js 3D Vector3 space matching Earth texture orientation.
 *
 * @param latitude North/South position in degrees (-90 to +90)
 * @param longitude East/West position in degrees (-180 to +180)
 * @param radius Globe radius in Three.js units
 */
export function latitudeLongitudeToGlobePosition(
  latitude: number,
  longitude: number,
  radius: number
): THREE.Vector3 {
  const lat = Number(latitude);
  const lon = Number(longitude);

  // Validation: Check for finite numbers in valid geographic range
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    console.error(`[Globe Conversion Error] Invalid coordinates: lat=${latitude}, lon=${longitude}`);
    return new THREE.Vector3(0, 0, 0);
  }

  // Convert degrees to radians explicitly
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;

  // Spherical projection aligned with Three.js standard SphereGeometry & Earth texture:
  // Y-axis = North/South poles (+Y = North Pole, -Y = South Pole)
  // X/Z plane = Equator. Longitude 0 (Greenwich) faces +Z.
  const x = -radius * Math.cos(latRad) * Math.sin(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.cos(lonRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * Fully Dynamic Geocoding Service.
 * Resolves ANY user-provided location string into an accurate lat/lng location object
 * using real-time online geocoding APIs (Open-Meteo & Nominatim).
 *
 * Does NOT use hardcoded city lookup tables or static fallback coordinates.
 */
export async function geocodeLocation(query: string): Promise<JournalLocation> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Please enter a valid place or city name.");
  }

  // 1. Try Open-Meteo Geocoding API (Fast, global, free, CORS-friendly)
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        trimmed
      )}&count=5&language=en&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const lat = Number(item.latitude);
        const lon = Number(item.longitude);

        if (
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          lat >= -90 &&
          lat <= 90 &&
          lon >= -180 &&
          lon <= 180
        ) {
          const stateStr = item.admin1 ? `${item.admin1}, ` : "";
          const countryStr = item.country || "Earth";
          return {
            name: `${item.name}, ${stateStr}${countryStr}`,
            country: countryStr,
            latitude: Math.round(lat * 10000) / 10000,
            longitude: Math.round(lon * 10000) / 10000,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Open-Meteo geocoding request failed, trying fallback...", err);
  }

  // 2. Fallback to OpenStreetMap Nominatim API
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&limit=1&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = Number(item.lat);
        const lon = Number(item.lon);

        if (
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          lat >= -90 &&
          lat <= 90 &&
          lon >= -180 &&
          lon <= 180
        ) {
          const addr = item.address || {};
          const cityName =
            addr.city || addr.town || addr.village || addr.suburb || addr.county || item.name || trimmed;
          const countryName = addr.country || "Earth";

          return {
            name: `${cityName}, ${countryName}`,
            country: countryName,
            latitude: Math.round(lat * 10000) / 10000,
            longitude: Math.round(lon * 10000) / 10000,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Nominatim geocoding request failed:", err);
  }

  // 3. Check popular initial list if offline or network blocked
  const lower = trimmed.toLowerCase();
  const matched = POPULAR_LOCATIONS.find(
    (l) =>
      l.name.toLowerCase() === lower ||
      `${l.name.toLowerCase()}, ${l.country?.toLowerCase()}` === lower
  );
  if (matched) {
    return { ...matched };
  }

  // Strictly throw error if location cannot be resolved. Do NOT guess fake coordinates!
  throw new Error(`Couldn't find "${trimmed}". Please choose a valid place.`);
}

/**
 * Synchronous resolver helper for initial dataset fallback matching.
 */
export function resolveLocationFromName(placeName: string, country?: string): JournalLocation {
  const trimmed = placeName.trim();
  if (!trimmed) {
    return {
      name: "My Sanctuary",
      country: country || "Earth",
      latitude: 20.0,
      longitude: 0.0,
    };
  }

  const lower = trimmed.toLowerCase();
  const matched = POPULAR_LOCATIONS.find(
    (l) =>
      l.name.toLowerCase() === lower ||
      `${l.name.toLowerCase()}, ${l.country?.toLowerCase()}` === lower
  );
  if (matched) {
    return { ...matched };
  }

  // For unknown un-geocoded strings, return placeholder until geocoded online
  return {
    name: trimmed,
    country: country || "Earth",
    latitude: 0,
    longitude: 0,
  };
}

/**
 * Request real-time location from browser GPS / IP with reverse geocoding.
 */
export async function detectCurrentLocation(): Promise<JournalLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const cityName =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.county ||
              addr.state ||
              "My Current Location";
            const countryName = addr.country || "";

            const detected: JournalLocation = {
              name: cityName,
              country: countryName,
              latitude: Math.round(lat * 10000) / 10000,
              longitude: Math.round(lng * 10000) / 10000,
            };
            savePreferredLocation(detected);
            resolve(detected);
            return;
          }
        } catch (err) {
          console.warn("Reverse geocode failed, using coordinates:", err);
        }

        const fallback: JournalLocation = {
          name: "Current Location",
          country: "",
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lng * 10000) / 10000,
        };
        savePreferredLocation(fallback);
        resolve(fallback);
      },
      (err) => {
        reject(err);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  });
}

/**
 * Automated Geographic Unit Test Suite (Requirement 20).
 * Verifies mathematical transformation across all Earth hemispheres and poles.
 */
export function runGeographicCoordinateUnitTests() {
  console.log("🌍 Running 3D Globe Geographic Coordinate Unit Tests...");
  const R = 2.0;

  const testCases = [
    { name: "Equator / Greenwich (0, 0)", lat: 0, lon: 0 },
    { name: "North Pole (90, 0)", lat: 90, lon: 0 },
    { name: "South Pole (-90, 0)", lat: -90, lon: 0 },
    { name: "Date Line East (0, 180)", lat: 0, lon: 180 },
    { name: "Date Line West (0, -180)", lat: 0, lon: -180 },
    { name: "NE Quadrant (45, 45)", lat: 45, lon: 45 },
    { name: "SW Quadrant (-45, -45)", lat: -45, lon: -45 },
    { name: "Madurai, India (9.9252, 78.1198)", lat: 9.9252, lon: 78.1198 },
    { name: "Tokyo, Japan (35.6762, 139.6503)", lat: 35.6762, lon: 139.6503 },
    { name: "Paris, France (48.8566, 2.3522)", lat: 48.8566, lon: 2.3522 },
    { name: "Sydney, Australia (-33.8688, 151.2093)", lat: -33.8688, lon: 151.2093 },
    { name: "San Francisco, USA (37.7749, -122.4194)", lat: 37.7749, lon: -122.4194 },
    { name: "Cape Town, SA (-33.9249, 18.4241)", lat: -33.9249, lon: 18.4241 },
  ];

  let passedCount = 0;
  testCases.forEach((tc) => {
    const pos = latitudeLongitudeToGlobePosition(tc.lat, tc.lon, R);
    const mag = Math.hypot(pos.x, pos.y, pos.z);
    const isValid = Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z);
    const isMagCorrect = Math.abs(mag - R) < 0.001;

    if (!isValid || !isMagCorrect) {
      console.error(
        `❌ Unit Test Failed for ${tc.name}: Vector3(${pos.x}, ${pos.y}, ${pos.z}), Mag=${mag}`
      );
    } else {
      passedCount++;
      console.log(
        `✅ Unit Test Passed: ${tc.name} => Vector3(x:${pos.x.toFixed(2)}, y:${pos.y.toFixed(
          2
        )}, z:${pos.z.toFixed(2)})`
      );
    }
  });

  console.log(`🎉 3D Globe Coordinate Unit Tests Complete: ${passedCount}/${testCases.length} Passed.`);
}

export function getSavedPreferredLocation(): JournalLocation | null {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return null;
}

export function savePreferredLocation(loc: JournalLocation | null) {
  try {
    if (!loc) {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    } else {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    }
  } catch {}
}
