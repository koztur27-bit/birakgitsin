import { createAudioPlayer, preload, setAudioModeAsync } from 'expo-audio';
import { Platform, Vibration } from 'react-native';

const g = globalThis as any;

const ALARM_ASSET = require('../../assets/alarm.wav');

// Sesi önceden yükle ki ilk çalışta gecikmesiz çalsın (uygulama açılışında).
if (Platform.OS !== 'web') {
  preload(ALARM_ASSET).catch(() => {});
  // Medya sesi kapalı/sessiz olsa bile çalmayı dene.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
}

// Android deseni: [gecikme, titret, bekle, titret, bekle, ...] → 5 kez titretir.
export const FIVE_VIBRATION_PATTERN = [0, 300, 200, 300, 200, 300, 200, 300, 200, 300];

export function vibrateFive(): void {
  if (Platform.OS === 'web') {
    try {
      g.navigator?.vibrate?.(FIVE_VIBRATION_PATTERN);
    } catch {
      // ignore
    }
    return;
  }
  try {
    Vibration.vibrate(FIVE_VIBRATION_PATTERN);
  } catch {
    // ignore
  }
}

let nativePlayer: ReturnType<typeof createAudioPlayer> | null = null;
let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

export function playAlarm(): void {
  if (Platform.OS === 'web') {
    playWebAlarm();
    return;
  }
  try {
    if (!nativePlayer) {
      nativePlayer = createAudioPlayer(ALARM_ASSET);
    }
    nativePlayer.loop = true;
    nativePlayer.play();
  } catch {
    // audio unavailable
  }
}

/** Alarmı belirtilen süre (ms) çalar, sonra otomatik susar. */
export function playAlarmFor(ms: number): void {
  stopAlarm();
  playAlarm();
  if (autoStopTimer) clearTimeout(autoStopTimer);
  autoStopTimer = setTimeout(() => {
    autoStopTimer = null;
    stopAlarm();
  }, ms);
}

export function stopAlarm(): void {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (Platform.OS === 'web') {
    stopWebAlarm();
    return;
  }
  try {
    if (nativePlayer) {
      nativePlayer.pause();
      nativePlayer.seekTo(0);
    }
  } catch {
    // ignore
  }
}

function playWebAlarm(): void {
  try {
    const Ctor = g.AudioContext || g.webkitAudioContext;
    if (!Ctor) return;
    stopWebAlarm();
    const ctx: any = g._bgCtx || (g._bgCtx = new Ctor());
    if (ctx.state === 'suspended') ctx.resume();

    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 880;
    osc2.frequency.value = 1175;
    osc1.connect(gain);
    osc2.connect(gain);
    osc1.start();
    osc2.start();

    g._bgGain = gain;
    g._bgOscs = [osc1, osc2];
  } catch {
    // audio unavailable
  }
}

function stopWebAlarm(): void {
  try {
    (g._bgOscs || []).forEach((o: any) => {
      try {
        o.stop();
      } catch {
        // ignore
      }
    });
    if (g._bgGain) {
      try {
        g._bgGain.disconnect();
      } catch {
        // ignore
      }
    }
    g._bgOscs = null;
    g._bgGain = null;
  } catch {
    // ignore
  }
}