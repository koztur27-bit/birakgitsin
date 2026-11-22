import * as FileSystem from 'expo-file-system/legacy';

const LOG_FILE = 'error-log.txt';

function logPath(): string | null {
  const base = FileSystem.documentDirectory;
  return base ? base + LOG_FILE : null;
}

export async function logError(error: { message: string; stack?: string }): Promise<void> {
  const path = logPath();
  if (!path) return;
  try {
    const stamp = new Date().toISOString();
    const entry = `[${stamp}] ${error.message}\n${error.stack || ''}\n---\n`;
    const info = await FileSystem.getInfoAsync(path);
    const prev = info.exists ? await FileSystem.readAsStringAsync(path) : '';
    await FileSystem.writeAsStringAsync(path, (prev + entry).slice(-20000));
  } catch {
    // ignore
  }
}

export async function readErrorLog(): Promise<string> {
  const path = logPath();
  if (!path) return '';
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return '';
    return await FileSystem.readAsStringAsync(path);
  } catch {
    return '';
  }
}

export async function clearErrorLog(): Promise<void> {
  const path = logPath();
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // ignore
  }
}
