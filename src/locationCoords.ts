import Geolocation from '@react-native-community/geolocation';

let configured = false;

/**
 * Native coordinate getter. Forces Android's system LocationManager
 * (`locationProvider: 'android'`) so it works on devices WITHOUT Google Play
 * Services (e.g. many domestic Android phones like vivo/Huawei). Permissions
 * are handled separately (expo-location), hence `skipPermissionRequests`.
 */
export function getCoords(): Promise<{ latitude: number; longitude: number }> {
  if (!configured) {
    Geolocation.setRNConfiguration({ skipPermissionRequests: true, locationProvider: 'android' });
    configured = true;
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 },
    );
  });
}
