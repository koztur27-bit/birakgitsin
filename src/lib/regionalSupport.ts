export type Region = 'TR' | 'US' | 'GB' | 'EU' | 'JP' | 'GLOBAL';

export type SupportLine = {
  id: string;
  label: string;
  number: string;
  action: 'call' | 'info' | 'link';
  url?: string;
};

export function detectRegion(): Region {
  try {
    const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : '';
    const lower = String(tz || '').toLowerCase();
    if (lower.includes('istanbul') || lower === 'europe/istanbul') return 'TR';
    if (lower.startsWith('america/')) {
      // Treat North America default as US; could be refined later.
      return 'US';
    }
    if (lower === 'europe/london' || lower === 'europe/belfast' || lower === 'europe/jersey' || lower === 'europe/guernsey' || lower === 'europe/isle_of_man') {
      return 'GB';
    }
    if (lower.startsWith('europe/')) return 'EU';
    if (lower === 'asia/tokyo' || lower.startsWith('asia/tokyo')) return 'JP';
    // Locale fallback
    let locale = '';
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { NativeModules, Platform } = require('react-native') as any;
      if (Platform.OS === 'android') locale = NativeModules.I18nManager?.localeIdentifier || '';
      else if (Platform.OS === 'ios') {
        const s = NativeModules.SettingsManager?.settings;
        locale = s?.AppleLocale || (Array.isArray(s?.AppleLanguages) ? s.AppleLanguages[0] : '') || '';
      }
      if (!locale) locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    } catch {
      locale = '';
    }
    const lc = String(locale).toLowerCase();
    if (lc.startsWith('tr')) return 'TR';
    if (lc === 'en-us' || lc.startsWith('en-us')) return 'US';
    if (lc === 'en-gb' || lc.startsWith('en-gb')) return 'GB';
    if (lc.startsWith('ja')) return 'JP';
    if (lc.startsWith('en') ) {
      // default English outside known regions -> global
      return 'GLOBAL';
    }
    // EU language heuristics
    const euLangs = ['de','fr','es','it','nl','pt','pl','ro','sv','da','fi','el','cs','hu','sk','bg','hr','sl','et','lv','lt','mt','ga'];
    if (euLangs.some((l) => lc.startsWith(l))) return 'EU';
  } catch {
    // fall through
  }
  return 'GLOBAL';
}

export function supportLines(region: Region, locale: 'tr' | 'en'): SupportLine[] {
  const en = locale === 'en';
  if (region === 'TR') {
    return [
      { id: 'alo171', label: en ? 'ALO 171 Smoking Cessation Hotline' : 'ALO 171 Sigara Birakma Danisma Hatti', number: '171', action: 'call' },
      { id: 'yedam', label: en ? 'YEDAM (Green Crescent Counseling)' : 'YEDAM (Yesilay Danisma Merkezi)', number: '115', action: 'call' },
      { id: 'emergency', label: en ? 'Emergency Services' : 'Acil Servis', number: '112 / 183', action: 'call' },
    ];
  }
  if (region === 'US') {
    return [
      { id: 'quitnow', label: en ? '1-800-QUIT-NOW (CDC)' : '1-800-QUIT-NOW (CDC)', number: '1-800-784-8669', action: 'call' },
      { id: 'crisis', label: en ? 'Suicide & Crisis Lifeline' : 'Suicide & Crisis Lifeline', number: '988', action: 'call' },
      { id: 'emergency', label: en ? 'Emergency Services' : 'Acil Servis', number: '911', action: 'call' },
    ];
  }
  if (region === 'GB') {
    return [
      { id: 'smokefree', label: en ? 'NHS Smokefree' : 'NHS Smokefree', number: '0300 123 1044', action: 'call' },
      { id: 'emergency', label: en ? 'Emergency Services' : 'Acil Servis', number: '999 / 112', action: 'call' },
    ];
  }
  if (region === 'EU') {
    return [
      { id: 'national', label: en ? 'National Health Advice Line' : 'Ulusal Saglik Danisma Hatti', number: en ? 'See local health authority' : 'Ulusal saglik kurulusuna basvurun', action: 'info' },
      { id: 'emergency', label: en ? 'Emergency Services (EU)' : 'Acil Servis (AB)', number: '112', action: 'call' },
    ];
  }
  // GLOBAL fallback
  return [
    { id: 'who', label: en ? 'Find local help (WHO)' : 'Yerel yardim bul (DSO/WHO)', number: 'findahelpline.com', action: 'link', url: 'https://findahelpline.com' },
    { id: 'emergency', label: en ? 'Local Emergency Services' : 'Yerel Acil Servis', number: en ? 'Local emergency number' : 'Yerel acil numarasi', action: 'info' },
  ];
}

export function regionLabel(region: Region, locale: 'tr' | 'en'): string {
  const en = locale === 'en';
  switch (region) {
    case 'TR': return en ? 'Turkey' : 'Turkiye';
    case 'US': return 'United States';
    case 'GB': return 'United Kingdom';
    case 'EU': return en ? 'European Union' : 'Avrupa Birligi';
    case 'JP': return en ? 'Japan' : 'Japonya';
    default: return en ? 'Global' : 'Global';
  }
}

export type RegionalCurrencyDefaults = {
  currency: string;
  packPrice: number;
};

export function regionalCurrencyDefaults(region: Region): RegionalCurrencyDefaults {
  switch (region) {
    case 'TR':
      return { currency: '₺', packPrice: 100 };
    case 'US':
      return { currency: '$', packPrice: 10 };
    case 'GB':
      return { currency: '£', packPrice: 14 };
    case 'EU':
      return { currency: '€', packPrice: 8 };
    case 'JP':
      return { currency: '¥', packPrice: 600 };
    default:
      return { currency: '$', packPrice: 8 };
  }
}
