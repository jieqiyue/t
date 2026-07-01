import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/** Cap the longer edge; anything larger gets downscaled before we save it.
 *  Full-res phone photos (12-24 MP) decoded into <Image> can OOM on Android. */
const MAX_EDGE_PX = 1600;

const ATTACHMENTS_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}attachments/`
  : '';

/** Ensure the attachments directory exists. Safe to call repeatedly. */
async function ensureDir(): Promise<void> {
  if (!ATTACHMENTS_DIR) return;
  const info = await FileSystem.getInfoAsync(ATTACHMENTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ATTACHMENTS_DIR, { intermediates: true });
  }
}

/** Downscale (only when needed) + JPEG-recompress the picker's file, then
 *  copy the result into our attachments folder under a fresh id. Full-res
 *  camera photos are 5-10 MB and 24 MP, which decode to 100+ MB of bitmap
 *  memory in <Image> and can crash Android. After this pass files are
 *  ~200-500 KB and safe to display. Web has no persistent FS — return the
 *  original blob/data uri unchanged (valid for the tab's lifetime). */
async function persist(sourceUri: string, width: number, height: number): Promise<string> {
  if (Platform.OS === 'web' || !ATTACHMENTS_DIR) return sourceUri;
  await ensureDir();

  const longEdge = Math.max(width || 0, height || 0);
  const actions =
    longEdge > MAX_EDGE_PX
      ? [width >= height
          ? { resize: { width: MAX_EDGE_PX } }
          : { resize: { height: MAX_EDGE_PX } }]
      : [];

  let processedUri = sourceUri;
  try {
    const r = await manipulateAsync(sourceUri, actions, { compress: 0.75, format: SaveFormat.JPEG });
    processedUri = r.uri;
  } catch {
    // If manipulation fails for any reason, fall back to the raw asset —
    // better a possibly-oversized photo than a crash on save.
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const target = `${ATTACHMENTS_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: processedUri, to: target });
  return target;
}

/** Pick a photo from the library. Returns the persistent file uri, or null
 *  if the user cancelled / permission was denied / an error occurred. */
export async function pickPhotoFromLibrary(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    const asset = result.assets[0];
    return await persist(asset.uri, asset.width ?? 0, asset.height ?? 0);
  } catch {
    return null;
  }
}

/** Capture a photo with the camera. Returns the persistent file uri, or null
 *  if the user cancelled / permission was denied / an error occurred. */
export async function takePhotoWithCamera(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    const asset = result.assets[0];
    return await persist(asset.uri, asset.width ?? 0, asset.height ?? 0);
  } catch {
    return null;
  }
}

/** Best-effort delete of a stored photo file. No-op on web. */
export async function deletePhotoFile(uri: string | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  if (!ATTACHMENTS_DIR || !uri.startsWith(ATTACHMENTS_DIR)) return; // don't touch external files
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}

/** Delete files in attachments/ that aren't referenced by any record's photo
 *  field. Safe to call on every startup — cheap when the directory is small
 *  and nothing to prune. */
export async function cleanupOrphanPhotos(activities: { photo?: string }[]): Promise<void> {
  if (Platform.OS === 'web' || !ATTACHMENTS_DIR) return;
  try {
    const info = await FileSystem.getInfoAsync(ATTACHMENTS_DIR);
    if (!info.exists) return;
    const files = await FileSystem.readDirectoryAsync(ATTACHMENTS_DIR);
    const referenced = new Set<string>();
    for (const a of activities) if (a.photo) referenced.add(a.photo);
    await Promise.all(
      files.map(async (name) => {
        const full = `${ATTACHMENTS_DIR}${name}`;
        if (referenced.has(full)) return;
        try {
          await FileSystem.deleteAsync(full, { idempotent: true });
        } catch {
          // ignore individual failures
        }
      }),
    );
  } catch {
    // best-effort
  }
}
