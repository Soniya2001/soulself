import { JournalLocation } from "../types";
import { POPULAR_LOCATIONS } from "../data/initialData";

const LOCATION_STORAGE_KEY = "soulself_user_preferred_location";

/**
 * Geocode a user-provided location string into a valid JournalLocation
 * with latitude and longitude for 3D Globe visualization.
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

  // 1. Check if matches popular locations
  const lower = trimmed.toLowerCase();
  const matched = POPULAR_LOCATIONS.find(
    (l) => l.name.toLowerCase() === lower || `${l.name.toLowerCase()}, ${l.country?.toLowerCase()}` === lower
  );
  if (matched) {
    return { ...matched };
  }

  // 2. Hash-based deterministic coordinates for custom places on Earth
  // Ensures any place name (e.g. "My Room", "Lake Tahoe", "Coimbatore") sits consistently on the Globe
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const lat = ((Math.abs(hash) % 13000) / 100) - 60; // -60 to +70 deg
  const lng = ((Math.abs(hash * 31) % 36000) / 100) - 180; // -180 to +180 deg

  return {
    name: trimmed,
    country: country || "Earth",
    latitude: Math.round(lat * 1000) / 1000,
    longitude: Math.round(lng * 1000) / 1000,
  };
}

/**
 * Request real-time location from browser GPS / IP with reverse geocoding.
 */
export async function detectCurrentLocation(): Promise<JournalLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      // Fallback to timezone inference
      const tzLocation = inferLocationFromTimezone();
      if (tzLocation) {
        resolve(tzLocation);
      } else {
        reject(new Error("Geolocation is not supported by your browser"));
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          // Free OpenStreetMap reverse geocoding
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
              latitude: lat,
              longitude: lng,
            };
            savePreferredLocation(detected);
            resolve(detected);
            return;
          }
        } catch (err) {
          console.warn("Reverse geocode failed, using coordinates:", err);
        }

        // Fallback with coordinates
        const fallback: JournalLocation = {
          name: "Current Location",
          country: "",
          latitude: lat,
          longitude: lng,
        };
        savePreferredLocation(fallback);
        resolve(fallback);
      },
      (err) => {
        // Fallback to timezone inference
        const tzLocation = inferLocationFromTimezone();
        if (tzLocation) {
          resolve(tzLocation);
        } else {
          reject(err);
        }
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  });
}

/**
 * Infer a friendly city name from the user's browser timezone.
 */
export function inferLocationFromTimezone(): JournalLocation | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    const parts = tz.split("/");
    if (parts.length >= 2) {
      const rawCity = parts[parts.length - 1].replace(/_/g, " ");
      return resolveLocationFromName(rawCity, parts[0]);
    }
  } catch {}
  return null;
}

/**
 * Get preferred location saved in localStorage
 */
export function getSavedPreferredLocation(): JournalLocation | null {
  try {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}
  return null;
}

/**
 * Save preferred location to localStorage
 */
export function savePreferredLocation(loc: JournalLocation | null) {
  try {
    if (!loc) {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    } else {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc));
    }
  } catch {}
}
