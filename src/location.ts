import * as Location from 'expo-location';
import { ActivityLocation } from './types';

export type CaptureResult =
  | { ok: true; location: ActivityLocation }
  | { ok: false; reason: 'denied' | 'error' };

/** Compose a short readable label from a reverse-geocode result, e.g.
 *  "朝阳区 · 某某路 · 星巴克". Empty parts and duplicates are dropped. */
function formatPlace(a?: Location.LocationGeocodedAddress): string | undefined {
  if (!a) return undefined;
  const ordered = [a.district ?? a.city ?? a.subregion ?? a.region, a.street, a.name];
  const parts: string[] = [];
  for (const p of ordered) {
    if (p && !parts.includes(p)) parts.push(p);
  }
  const label = parts.join(' · ').trim();
  return label || undefined;
}

/**
 * Capture the device's current location once. Asks for foreground permission,
 * reads the GPS position, and tries to reverse-geocode a place name (not
 * available on web — coordinates are still returned). Never throws.
 */
export async function captureLocation(): Promise<CaptureResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    let label: string | undefined;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      label = formatPlace(places[0]);
    } catch {
      // reverse geocoding is unsupported on web / may fail — keep coordinates only
    }

    return { ok: true, location: { lat, lng, label } };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Display text for a stored location: the place name, else "lat, lng". */
export function locationLabel(loc: ActivityLocation): string {
  return loc.label || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}
