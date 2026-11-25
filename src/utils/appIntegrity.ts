import * as Application from 'expo-application';
import { NativeModules, Platform } from 'react-native';

import appConfig from '../../app.json';
import { RELEASE_CONFIG, isPlaceholder } from '../config/releaseConfig';
import { clockRollbackDetected } from '../lib/proEntitlementStore';

const OFFICIAL_ANDROID_PACKAGE: string =
  appConfig.expo.android?.package ?? 'com.birakgitsin.app';

const ALLOWED_SIGNATURES = RELEASE_CONFIG.appIntegrity.allowedSignatureSha256
  .filter((value) => !isPlaceholder(value))
  .map((value) => value.toLowerCase().replace(/:/g, ''));

let lastIntegrityResult: boolean | null = null;

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase().replace(/:/g, '') : '';
}

export function checkAppIntegrity(): boolean {
  if (__DEV__ || Platform.OS !== 'android') {
    lastIntegrityResult = true;
    return true;
  }

  let packageOk = false;
  let signatureOk = false;

  try {
    packageOk = Application.applicationId === OFFICIAL_ANDROID_PACKAGE;
    if (!packageOk) {
      console.error('[appIntegrity] Unexpected applicationId (repackaged build?)', {
        actual: Application.applicationId,
        expected: OFFICIAL_ANDROID_PACKAGE,
      });
    }
  } catch (error) {
    console.error('[appIntegrity] Package check failed', error);
  }

  try {
    const actual = normalize(NativeModules.SignatureCheck?.getSignatureSha256?.());
    signatureOk = !!actual && ALLOWED_SIGNATURES.includes(actual);
    if (!signatureOk) {
      console.error('[appIntegrity] Signature mismatch', {
        actual: actual || '(okunamadı)',
        allowedCount: ALLOWED_SIGNATURES.length,
        hint: 'Play App Signing etkinse SHA-256 değerini src/config/releaseConfig.ts içine ekleyin.',
      });
    }
  } catch (error) {
    console.error('[appIntegrity] Signature check failed', error);
  }

  lastIntegrityResult = packageOk && signatureOk;
  return lastIntegrityResult;
}

export function getLastIntegrityResult(): boolean | null {
  return lastIntegrityResult;
}

export function integrityClockRollbackDetected(): boolean {
  return clockRollbackDetected();
}
