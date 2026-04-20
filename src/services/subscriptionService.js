/**
 * Subscription Service — expo-iap v4.x üzerinden StoreKit 2 / Play Billing
 *
 * Ürünler App Store Connect'te tanımlanmış olmalıdır:
 *   com.esdiyet.app.premium.monthly   — Aylık
 *   com.esdiyet.app.premium.quarterly — 3 aylık
 *   com.esdiyet.app.premium.yearly    — Yıllık
 *
 * v4'te API değişti:
 *   getSubscriptions → fetchProducts({ skus, type: 'subs' })
 *   requestSubscription → requestPurchase({ request: { ios:{sku}, android:{skus} }, type: 'subs' })
 */

import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
} from 'expo-iap';
import { isTestEnv } from '../utils/environment';

export const PRODUCT_IDS = {
  monthly:   'com.esdiyet.app.premium.monthly',
  quarterly: 'com.esdiyet.app.premium.quarterly',
  yearly:    'com.esdiyet.app.premium.yearly',
};

export const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);

export const PLAN_META = [
  {
    id: PRODUCT_IDS.monthly,
    key: 'monthly',
    label: 'Aylık',
    duration: '1 Ay',
    monthlyRate: '₺249,99/ay',
    savingPct: null,
    highlight: false,
  },
  {
    id: PRODUCT_IDS.quarterly,
    key: 'quarterly',
    label: '3 Aylık',
    duration: '3 Ay',
    monthlyRate: '₺50/ay',
    savingPct: '80',
    highlight: false,
  },
  {
    id: PRODUCT_IDS.yearly,
    key: 'yearly',
    label: 'Yıllık',
    duration: '1 Yıl',
    monthlyRate: '₺7/ay',
    savingPct: '97',
    highlight: true,
  },
];

// ─── Bağlantı ──────────────────────────────────────────────────────────────

export async function initIAP() {
  try {
    await initConnection();
    return true;
  } catch (e) {
    console.warn('IAP initConnection:', e?.message);
    return false;
  }
}

export async function closeIAP() {
  try {
    await endConnection();
  } catch {
    /* ignore */
  }
}

// ─── Ürünleri yükle ─────────────────────────────────────────────────────────

export async function loadProducts() {
  try {
    const products = await fetchProducts({ skus: ALL_PRODUCT_IDS, type: 'subs' });
    return Array.isArray(products) ? products : [];
  } catch (e) {
    console.warn('IAP loadProducts:', e?.message);
    return [];
  }
}

// ─── Satın al ───────────────────────────────────────────────────────────────
// TestFlight ve simülatörde gerçek satın alma akışı devre dışı — sadece bilgi döner.

export async function purchaseSubscription(productId) {
  if (isTestEnv) {
    return {
      success: false,
      cancelled: false,
      testBlocked: true,
      message: 'Satın alma test ortamında devre dışı. App Store\'da yayınlandıktan sonra aktif olacak.',
    };
  }
  try {
    const request =
      Platform.OS === 'ios'
        ? { ios: { sku: productId } }
        : { android: { skus: [productId] } };

    await requestPurchase({ request, type: 'subs' });
    return { success: true };
  } catch (e) {
    const cancelled = e?.code === 'E_USER_CANCELLED' || /cancel/i.test(e?.message || '');
    if (cancelled) return { success: false, cancelled: true };
    throw e;
  }
}

// ─── Restore purchases ───────────────────────────────────────────────────────

export async function restorePurchases() {
  try {
    const purchases = await getAvailablePurchases();
    return purchases || [];
  } catch (e) {
    console.warn('IAP restorePurchases:', e?.message);
    return [];
  }
}

// ─── Aktif abonelik kontrolü ────────────────────────────────────────────────

export function isActivePurchase(purchase) {
  if (!purchase) return false;
  return ALL_PRODUCT_IDS.includes(purchase.productId);
}

// ─── Purchase listener yönetimi ─────────────────────────────────────────────

export function setupPurchaseListeners(onSuccess, onError) {
  const successSub = purchaseUpdatedListener(async (purchase) => {
    if (purchase?.transactionId || purchase?.id) {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        /* ignore */
      }
      onSuccess?.(purchase);
    }
  });

  const errorSub = purchaseErrorListener((error) => {
    const cancelled = error?.code === 'E_USER_CANCELLED';
    if (!cancelled) onError?.(error);
  });

  return () => {
    successSub?.remove?.();
    errorSub?.remove?.();
  };
}
