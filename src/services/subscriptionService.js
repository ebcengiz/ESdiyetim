/**
 * Subscription Service — expo-iap üzerinden StoreKit 2
 *
 * Ürünler App Store Connect'te tanımlanmış olmalıdır:
 *   com.esdiyet.app.premium.monthly   — $4.99/ay
 *   com.esdiyet.app.premium.quarterly — $7.49/3 ay
 *   com.esdiyet.app.premium.yearly    — $23.99/yıl
 */

import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
} from 'expo-iap';

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
    monthlyRate: '$4.99/ay',
    savingPct: null,
    highlight: false,
  },
  {
    id: PRODUCT_IDS.quarterly,
    key: 'quarterly',
    label: '3 Aylık',
    duration: '3 Ay',
    monthlyRate: '$2.50/ay',
    savingPct: '50%',
    highlight: false,
  },
  {
    id: PRODUCT_IDS.yearly,
    key: 'yearly',
    label: 'Yıllık',
    duration: '1 Yıl',
    monthlyRate: '$2.00/ay',
    savingPct: '60%',
    highlight: true,   // "En İyi Değer" badge
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
    const products = await getSubscriptions({ skus: ALL_PRODUCT_IDS });
    return products || [];
  } catch (e) {
    console.warn('IAP loadProducts:', e?.message);
    return [];
  }
}

// ─── Satın al ───────────────────────────────────────────────────────────────

export async function purchaseSubscription(productId) {
  try {
    await requestSubscription({ sku: productId });
    return { success: true };
  } catch (e) {
    const cancelled = e?.code === 'E_USER_CANCELLED' || e?.message?.includes('cancel');
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
  // transactionDate mevcutsa expiry kontrolü yapmak için StoreKit receipt lazım.
  // Burada sadece ürün ID'si kontrolü yapıyoruz; gerçek validation StoreKit tarafından yönetilir.
  return ALL_PRODUCT_IDS.includes(purchase.productId);
}

// ─── Purchase listener yönetimi ─────────────────────────────────────────────

export function setupPurchaseListeners(onSuccess, onError) {
  const successSub = purchaseUpdatedListener(async (purchase) => {
    if (purchase?.transactionId) {
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
    successSub?.remove();
    errorSub?.remove();
  };
}
