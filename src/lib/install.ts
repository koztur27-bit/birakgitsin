import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(value: BeforeInstallPromptEvent | null) => void>();

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

if (isWeb) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(deferredPrompt));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(null));
  });
}

export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferredPrompt);

  useEffect(() => {
    const onChange = (value: BeforeInstallPromptEvent | null) => setAvailable(!!value);
    listeners.add(onChange);
    onChange(deferredPrompt);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
      listeners.forEach((listener) => listener(null));
      return true;
    }
    return false;
  };

  return { available, install, isWeb };
}
