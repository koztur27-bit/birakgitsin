export type TriggerTool = 'breath' | 'urge' | 'ground' | 'game';

export type TriggerAction = {
  title: string;
  body: string;
  seconds: number;
  tool: TriggerTool;
  toolLabel: string;
};

const ACTIONS: Record<string, TriggerAction> = {
  'Kahve/çay': {
    title: 'Bardağı masaya bırak',
    body: 'Bardağı elinden bırak, 10 adım yürü ve ağzını suyla çalkala. Kahveyi bu kez sigarasız içmeyi dene.',
    seconds: 60,
    tool: 'ground',
    toolLabel: 'Topraklama aracını aç',
  },
  'Yemek sonrası': {
    title: 'Dişini fırçala',
    body: 'Yemekten sonra doğrudan dişini fırçala veya sakız çiğne. Ağızdaki temiz tat, isteği zayıflatır.',
    seconds: 60,
    tool: 'ground',
    toolLabel: 'Topraklama aracını aç',
  },
  Stres: {
    title: '4-7-8 nefes',
    body: '4 saniye al, 7 saniye tut, 8 saniye ver. Üç tur yap. Stresin zirvesi genelde 60 saniyede düşer.',
    seconds: 60,
    tool: 'breath',
    toolLabel: 'Nefes aracını aç',
  },
  Sıkıntı: {
    title: 'Ellerini meşgul et',
    body: '20 saniyelik oyunu aç veya eline bir kalem al. Can sıkıntısı, sigaranın en sık bahanesidir.',
    seconds: 20,
    tool: 'game',
    toolLabel: 'Oyunu aç',
  },
  Alkol: {
    title: 'Bir bardak su',
    body: 'Alkolün yanına bir bardak su koy ve ilk yudumdan önce suyu iç. Sigarayı ertelemek için 5 dakika kazan.',
    seconds: 60,
    tool: 'urge',
    toolLabel: 'İstek sayacını aç',
  },
  Araba: {
    title: 'Arabayı durdur',
    body: 'Güvenli bir yerde dur, arabadan in ve 10 adım yürü. Sigara molası yerine kısa bir hareket molası ver.',
    seconds: 60,
    tool: 'ground',
    toolLabel: 'Topraklama aracını aç',
  },
  'Sosyal ortam': {
    title: '5 dakika ayrıl',
    body: 'Ortamdan kısa süre ayrıl, telefonundan birini ara veya lavaboya git. Geri döndüğünde istek genelde azalmış olur.',
    seconds: 60,
    tool: 'urge',
    toolLabel: 'İstek sayacını aç',
  },
  Telefon: {
    title: 'Telefonu ters çevir',
    body: 'Telefonu ters çevir, bildirimleri kapat ve 20 saniyeliğine oyunu aç. Elin meşgulken istek zayıflar.',
    seconds: 20,
    tool: 'game',
    toolLabel: 'Oyunu aç',
  },
  Diğer: {
    title: '3 dakika dayan',
    body: 'İsteğin gelgit gibi olduğunu unutma: yükselir, zirve yapar ve düşer. 3 dakikalık sayacı başlat.',
    seconds: 180,
    tool: 'urge',
    toolLabel: 'İstek sayacını aç',
  },
};

export function triggerAction(trigger?: string | null): TriggerAction {
  if (!trigger) return ACTIONS['Diğer'];
  return ACTIONS[trigger] ?? ACTIONS['Diğer'];
}
