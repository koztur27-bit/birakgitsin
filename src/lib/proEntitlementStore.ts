import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { AppData } from '../types';

/**
 * PRO hakları AsyncStorage'daki düz JSON yerine expo-secure-store'da saklanır.
 *
 * Güvenlik notu: İstemci tarafındaki HMAC yalnızca "düz metin okuma" ve
 * rastgele düzenlemeyi zorlaştırır; gerçek yetkilendirme için sunucu tarafı
 * doğrulama gerekir (bkz. PLAY-UYUM-RAPORU, teknik borç #3).
 *
 * Saat manipülasyonu: `lastKnownNow` yalnızca ileri yönde güncellenir.
 * Cihaz saati geri sarılırsa `proNow()` yüksek su işaretini döndürür ve
 * geri sarılmış zamana yeni PRO hakkı verilmez.
 */

const ENTITLEMENT_KEY = 'birakgitsin.pro.entitlement.v1';
const MAC_SECRET_KEY = 'birakgitsin.pro.mac-secret.v1';
const STATE_VERSION = 1;

export type ProEntitlementState = {
  v: number;
  proUnlockUntil: number;
  proTrialUsed: boolean;
  welcomeTrialGrantedAt: number;
  lastAdProGrantAt: number;
  isPremium: boolean;
  lastKnownNow: number;
};

let cachedState: ProEntitlementState | null = null;
let webFallback: { payload: string; signature: string } | null = null;
let webSecret = 'web-only-fallback-secret';

function isNativeSecure(): boolean {
  return Platform.OS !== 'web';
}

/** Geri sarılmış cihaz saatine karşı monotonic "şimdi". */
export function proNow(): number {
  const wall = Date.now();
  if (!cachedState) return wall;
  return Math.max(wall, cachedState.lastKnownNow);
}

export function clockRollbackDetected(): boolean {
  return !!cachedState && Date.now() < cachedState.lastKnownNow;
}

export function proEntitlementReady(): boolean {
  return cachedState !== null;
}

function fromData(data: AppData, lastKnownNow: number): ProEntitlementState {
  return {
    v: STATE_VERSION,
    proUnlockUntil: Number.isFinite(data.proUnlockUntil as any) ? Number(data.proUnlockUntil) : 0,
    proTrialUsed: !!data.proTrialUsed,
    welcomeTrialGrantedAt: Number.isFinite(data.welcomeTrialGrantedAt as any) ? Number(data.welcomeTrialGrantedAt) : 0,
    lastAdProGrantAt: Number.isFinite(data.lastAdProGrantAt as any) ? Number(data.lastAdProGrantAt) : 0,
    isPremium: !!data.isPremium,
    lastKnownNow,
  };
}

function toData(base: AppData, state: ProEntitlementState): AppData {
  return {
    ...base,
    proUnlockUntil: state.proUnlockUntil,
    proTrialUsed: state.proTrialUsed,
    welcomeTrialGrantedAt: state.welcomeTrialGrantedAt,
    lastAdProGrantAt: state.lastAdProGrantAt,
    isPremium: state.isPremium,
  };
}

async function getOrCreateSecret(): Promise<string> {
  if (!isNativeSecure()) return webSecret;
  let secret = await SecureStore.getItemAsync(MAC_SECRET_KEY);
  if (!secret) {
    secret = `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
    await SecureStore.setItemAsync(MAC_SECRET_KEY, secret);
  }
  return secret;
}

async function sign(payload: string, secret: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${secret}:${payload}`);
}

/**
 * SecureStore'u okur, imzayı doğrular ve PRO alanlarını `fallback` üzerine uygular.
 * Bozuk/uyuşmaz imza durumunda fallback korunur; hak genişletilmez.
 */
export async function loadProState(fallback: AppData): Promise<AppData> {
  const now = Date.now();
  const secureAvailable = isNativeSecure();

  let raw: string | null = null;
  let storedSignature: string | null = null;
  try {
    if (secureAvailable) {
      raw = await SecureStore.getItemAsync(ENTITLEMENT_KEY);
    } else {
      raw = webFallback?.payload ?? null;
      storedSignature = webFallback?.signature ?? null;
    }
  } catch (error) {
    console.error('[proEntitlement] SecureStore okunamadı', error);
  }

  if (raw) {
    try {
      const secret = await getOrCreateSecret();
      const parsed = JSON.parse(raw) as { payload?: string; signature?: string };
      if (!parsed.payload || !parsed.signature) throw new Error('invalid envelope');
      if (!storedSignature) storedSignature = parsed.signature;
      const expected = await sign(parsed.payload, secret);
      if (expected !== storedSignature) throw new Error('signature mismatch');
      const state = JSON.parse(parsed.payload) as ProEntitlementState;
      if (state.v !== STATE_VERSION) throw new Error('unsupported version');
      cachedState = state;
      return toData(fallback, state);
    } catch (error) {
      console.error('[proEntitlement] Hak imzası geçersiz, fallback kullanılacak', error);
    }
  }

  // İlk kurulum veya imza bozulması: mevcut alanlardan yeni imzalı kayıt oluştur.
  const state = fromData(fallback, now);
  await saveProState(toData(fallback, state));
  return toData(fallback, state);
}

/** PRO alanlarını imzalayarak SecureStore'a yazar. Her persist çağrısında çağrılır. */
export async function saveProState(data: AppData): Promise<void> {
  const effective = proNow();
  const state = fromData(data, Math.max(effective, cachedState?.lastKnownNow ?? 0));
  const payload = JSON.stringify(state);
  try {
    const secret = await getOrCreateSecret();
    const signature = await sign(payload, secret);
    if (isNativeSecure()) {
      await SecureStore.setItemAsync(ENTITLEMENT_KEY, JSON.stringify({ payload, signature }));
    } else {
      webFallback = { payload, signature };
    }
    cachedState = state;
  } catch (error) {
    console.error('[proEntitlement] SecureStore yazılamadı', error);
  }
}

export async function clearProState(): Promise<void> {
  cachedState = null;
  webFallback = null;
  try {
    if (isNativeSecure()) await SecureStore.deleteItemAsync(ENTITLEMENT_KEY);
  } catch (error) {
    console.error('[proEntitlement] SecureStore temizlenemedi', error);
  }
}
