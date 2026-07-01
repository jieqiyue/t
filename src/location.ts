import * as Location from 'expo-location';
import { getCoords } from './locationCoords';
import { ActivityLocation } from './types';

export type CaptureReason = 'denied' | 'disabled' | 'error';
export type CaptureResult =
  | { ok: true; location: ActivityLocation }
  | { ok: false; reason: CaptureReason };

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

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Capture the device's current location once. Asks for foreground permission,
 * checks that location services are on, reads coordinates via the platform
 * getter (system GPS on Android — no Google Play Services required), and tries
 * to reverse-geocode a place name (best effort; often empty without a Google
 * geocoding backend — coordinates are always kept). Never throws.
 */
export async function captureLocation(): Promise<CaptureResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied' };

    try {
      if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'disabled' };
    } catch {
      // hasServicesEnabledAsync may be unavailable on some platforms — ignore.
    }

    // Fast path: a recent last-known fix (from any recent app / prior use)
    // returns instantly and avoids waiting for a fresh GPS lock.
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 500 });
      if (last) coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
    } catch {
      // ignore — last-known unavailable on some platforms
    }
    if (!coords) {
      try {
        // Fresh fix: getCoords now uses coarse (network) accuracy with a 45s
        // budget — indoor GPS cold-starts still get a chance.
        coords = await withTimeout(getCoords(), 46000);
      } catch {
        // no fix in time / provider error — handled by the null check below
      }
    }
    if (!coords) return { ok: false, reason: 'error' };

    const lat = coords.latitude;
    const lng = coords.longitude;
    let label: string | undefined;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      label = formatPlace(places[0]);
    } catch {
      // reverse geocoding unsupported on web / no geocoder backend — coords only
    }

    return { ok: true, location: { lat, lng, label } };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** User-facing message for a failed capture. */
export function locationErrorMessage(reason: CaptureReason): string {
  if (reason === 'denied') return '未获得定位权限，可在系统设置里开启';
  if (reason === 'disabled') return '手机定位服务未开启，请在系统里打开定位';
  return '定位失败，请到信号较好的地方稍后重试';
}

/** Display text for a stored location: the place name, else "lat, lng". */
export function locationLabel(loc: ActivityLocation): string {
  return loc.label || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
}
