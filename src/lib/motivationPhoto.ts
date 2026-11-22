import * as FileSystem from 'expo-file-system/legacy';

export async function persistMotivationPhoto(sourceUri: string): Promise<string> {
  try {
    const base = FileSystem.documentDirectory;
    if (!base) return sourceUri;
    const dir = base + 'motivation/';
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    const ext = (sourceUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const dest = dir + 'photo.' + safeExt;
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  } catch {
    return sourceUri;
  }
}
