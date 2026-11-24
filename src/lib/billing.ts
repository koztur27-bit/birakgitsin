import { Platform } from 'react-native';

export type ProductId = 'pro_monthly' | 'pro_yearly';

export type ProductInfo = {
  id: ProductId;
  title: string;
  priceLabel: string;
  description: string;
  popular?: boolean;
};

export const PRODUCT_IDS: ProductId[] = ['pro_monthly', 'pro_yearly'];
// Lifetime pro is discontinued/cancelled as a purchasable plan, but keep recognizing
// existing lifetime purchases for entitlement restore safety.
export const ENTITLEMENT_PRODUCT_IDS = ['pro_monthly', 'pro_yearly', 'pro_lifetime'];

export const FALLBACK_PRODUCTS: ProductInfo[] = [
  {
    id: 'pro_monthly',
    title: 'Aylık',
    priceLabel: '₺29,99 / ay',
    description: 'Esnek, istediğin zaman iptal et.',
  },
  {
    id: 'pro_yearly',
    title: 'Yıllık',
    priceLabel: '₺199,99 / yıl',
    description: 'En iyi değer. Yılda bir kez öde, tüm yıl PRO.',
    popular: true,
  },
];

type IapModule = {
  initConnection?: () => Promise<boolean>;
  endConnection?: () => Promise<void>;
  fetchProducts?: (args: { skus: string[]; type?: string }) => Promise<any[]>;
  getProducts?: (args: { skus: string[] }) => Promise<any[]>;
  requestPurchase?: (args: any) => Promise<any>;
  finishTransaction?: (args: { purchase: any; isConsumable?: boolean }) => Promise<void>;
  getAvailablePurchases?: () => Promise<any[]>;
  purchaseUpdatedListener?: (cb: (purchase: any) => void) => { remove: () => void };
  purchaseErrorListener?: (cb: (error: any) => void) => { remove: () => void };
};

let _iap: IapModule | null | undefined;

function getIap(): IapModule | null {
  if (_iap !== undefined) return _iap;
  if (Platform.OS === 'web') {
    _iap = null;
    return _iap;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-iap');
    _iap = (mod && (mod.default || mod)) as IapModule;
  } catch {
    _iap = null;
  }
  return _iap;
}

let connected = false;

export async function initBilling(): Promise<boolean> {
  const iap = getIap();
  if (!iap?.initConnection) return false;
  try {
    if (!connected) {
      await iap.initConnection();
      connected = true;
    }
    return true;
  } catch {
    return false;
  }
}

export async function endBilling(): Promise<void> {
  const iap = getIap();
  if (!iap?.endConnection) return;
  try {
    if (connected) {
      await iap.endConnection();
      connected = false;
    }
  } catch {
    // ignore
  }
}

function pickPriceLabel(p: any, fallback: string): string {
  if (!p) return fallback;
  return (
    p.displayPrice ||
    p.localizedPrice ||
    p.oneTimePurchaseOfferDetails?.formattedPrice ||
    p.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice ||
    p.price ||
    fallback
  );
}

export async function fetchProProducts(): Promise<ProductInfo[]> {
  const iap = getIap();
  if (!iap) return FALLBACK_PRODUCTS;
  try {
    await initBilling();
    let products: any[] = [];
    if (typeof iap.fetchProducts === 'function') {
      // react-native-iap v12+/v14+ style
      const subs = await iap
        .fetchProducts({ skus: ['pro_monthly', 'pro_yearly'], type: 'subs' })
        .catch(() => []);
      products = [...(subs || [])];
    } else if (typeof iap.getProducts === 'function') {
      products = await iap.getProducts({ skus: PRODUCT_IDS as unknown as string[] }).catch(() => []);
    }
    if (!products || products.length === 0) return FALLBACK_PRODUCTS;
    const map = new Map<string, any>();
    for (const p of products) {
      const id = p.productId || p.id || p.sku;
      if (id) map.set(String(id), p);
    }
    return FALLBACK_PRODUCTS.map((fb) => {
      const p = map.get(fb.id);
      if (!p) return fb;
      return {
        ...fb,
        title: p.title || p.name || fb.title,
        description: p.description || fb.description,
        priceLabel: pickPriceLabel(p, fb.priceLabel),
      };
    });
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

/** Yalnızca Play ödeme akışını başlatır; PRO yetkisi purchase listener ile verilir. */
export async function purchasePro(productId: ProductId): Promise<{ started: boolean; message?: string }> {
  const iap = getIap();
  if (Platform.OS === 'web' || !iap?.requestPurchase) {
    return {
      started: false,
      message: 'Satın alma bu ortamda kullanılamıyor. Google Play sürümünden deneyin.',
    };
  }
  try {
    await initBilling();
    await iap.requestPurchase({
      type: 'subs',
      request:
        Platform.OS === 'android'
          ? { skus: [productId], subscriptionOffers: [] }
          : { sku: productId },
    } as any);
    return { started: true };
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (/cancel/i.test(msg) || e?.code === 'E_USER_CANCELLED') {
      return { started: false, message: 'Satın alma iptal edildi.' };
    }
    return { started: false, message: msg || 'Satın alma başlatılamadı.' };
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; hasPro: boolean; message?: string }> {
  const iap = getIap();
  if (!iap?.getAvailablePurchases) {
    return { ok: false, hasPro: false, message: 'Satın alımlar bu ortamda geri yüklenemiyor.' };
  }
  try {
    await initBilling();
    const purchases = await iap.getAvailablePurchases();
    const hasPro = (purchases || []).some((p: any) => {
      const id = String(p.productId || p.id || p.sku || '');
      return ENTITLEMENT_PRODUCT_IDS.includes(id);
    });
    return { ok: true, hasPro };
  } catch (e: any) {
    return { ok: false, hasPro: false, message: e?.message || 'Satın alımlar geri yüklenemedi.' };
  }
}

export function addPurchaseListeners(
  onPurchased: (productId?: string) => void,
  onError: (message: string) => void,
): () => void {
  const iap = getIap();
  if (!iap?.purchaseUpdatedListener || !iap?.purchaseErrorListener) return () => {};
  const sub1 = iap.purchaseUpdatedListener(async (purchase: any) => {
    try {
      await iap.finishTransaction?.({ purchase, isConsumable: false });
    } catch {
      // ignore
    }
    const id = purchase?.productId || purchase?.id || purchase?.sku;
    onPurchased(id ? String(id) : undefined);
  });
  const sub2 = iap.purchaseErrorListener((error: any) => {
    if (error?.code === 'E_USER_CANCELLED' || /cancel/i.test(error?.message || '')) return;
    onError(error?.message || 'Satın alma sırasında bir sorun oluştu.');
  });
  return () => {
    try {
      sub1.remove();
    } catch {}
    try {
      sub2.remove();
    } catch {}
  };
}
