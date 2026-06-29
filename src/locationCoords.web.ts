import * as Location from 'expo-location';

/**
 * Web coordinate getter. The native community-geolocation module isn't available
 * on web, so we use expo-location (which proxies the browser Geolocation API).
 * Metro picks this file for the web platform; native uses locationCoords.ts.
 */
export async function getCoords(): Promise<{ latitude: number; longitude: number }> {
  const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: p.coords.latitude, longitude: p.coords.longitude };
}
