import Geolocation from '@react-native-community/geolocation';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  Geolocation.setRNConfiguration({ skipPermissionRequests: true, locationProvider: 'android' });
  configured = true;
}

/**
 * Native coordinate getter. Forces Android's system LocationManager
 * (`locationProvider: 'android'`) so it works on devices WITHOUT Google Play
 * Services (e.g. many domestic Android phones like vivo/Huawei). Permissions
 * are handled separately (expo-location), hence `skipPermissionRequests`.
 *
 * Uses coarse (network / cell + WiFi) accuracy — fast even indoors and
 * accurate enough for a "where was I when I recorded this" note. Cold GPS
 * fixes can otherwise take 30-60s in a building. Timeout is generous so a
 * slow first fix doesn't fail spuriously.
 */
export function getCoords(): Promise<{ latitude: number; longitude: number }> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 45000, maximumAge: 300000 },
    );
  });
}
