import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initIAP,
  closeIAP,
  loadProducts,
  restorePurchases,
  setupPurchaseListeners,
  isActivePurchase,
  ALL_PRODUCT_IDS,
} from '../services/subscriptionService';
import { userCreditsService } from '../services/supabase';
import { bypassPaywall } from '../utils/environment';

const SUBSCRIPTION_CACHE_KEY = 'esdiyet_sub_status_v1';
const DAILY_LIMIT = 3;

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [products, setProducts] = useState([]);
  const [dailyPhotoUsed, setDailyPhotoUsed] = useState(0);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const navigationRef = useRef(null);

  // ─── Abonelik durumunu yükle ─────────────────────────────────────────────
  const loadSubscriptionStatus = useCallback(async () => {
    try {
      // Önce cache'den oku (hızlı UI)
      const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (cached) setIsSubscribed(cached === 'true');

      // StoreKit'ten gerçek durumu doğrula
      const purchases = await restorePurchases();
      const active = purchases.some(isActivePurchase);
      setIsSubscribed(active);
      await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, String(active));
    } catch (e) {
      console.warn('Subscription status load:', e?.message);
    }
  }, []);

  // ─── Günlük kredi yükle ─────────────────────────────────────────────────
  const loadDailyCredits = useCallback(async () => {
    try {
      const credits = await userCreditsService.getOrInit();
      setDailyPhotoUsed(credits?.daily_photo_used ?? 0);
    } catch {
      // Oturum yoksa (guest) → 0
      setDailyPhotoUsed(0);
    }
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      setLoadingSubscription(true);
      await initIAP();

      // Purchase listener kur
      cleanup = setupPurchaseListeners(
        async (purchase) => {
          // Başarılı satın alma
          if (ALL_PRODUCT_IDS.includes(purchase?.productId)) {
            setIsSubscribed(true);
            await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, 'true');
            await loadDailyCredits();
          }
        },
        (error) => {
          console.warn('Purchase error:', error?.message);
        }
      );

      // Ürünleri ve abonelik durumunu paralel yükle
      const [prods] = await Promise.all([
        loadProducts(),
        loadSubscriptionStatus(),
        loadDailyCredits(),
      ]);
      setProducts(prods);
      setLoadingSubscription(false);
    })();

    return () => {
      cleanup();
      closeIAP();
    };
  }, []);

  // ─── Analiz hakkı ────────────────────────────────────────────────────────
  const canUsePhotoToday = bypassPaywall || (isSubscribed && dailyPhotoUsed < DAILY_LIMIT);

  // ─── Krediyi artır ───────────────────────────────────────────────────────
  const incrementDailyPhotoCredit = useCallback(async () => {
    if (bypassPaywall) return;
    try {
      const newCount = await userCreditsService.increment();
      setDailyPhotoUsed(newCount);
    } catch (e) {
      console.warn('Credit increment:', e?.message);
    }
  }, []);

  // ─── Paywall navigasyonu ─────────────────────────────────────────────────
  const openPaywall = useCallback(() => {
    navigationRef.current?.navigate('Paywall');
  }, []);

  // ─── Abonelik yenile (satın alma sonrası) ────────────────────────────────
  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionStatus();
    await loadDailyCredits();
  }, [loadSubscriptionStatus, loadDailyCredits]);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        canUsePhotoToday,
        dailyPhotoUsed,
        dailyLimit: DAILY_LIMIT,
        products,
        loadingSubscription,
        incrementDailyPhotoCredit,
        openPaywall,
        refreshSubscription,
        // navigationRef dışarıdan set edilir
        setNavigationRef: (ref) => { navigationRef.current = ref; },
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be inside SubscriptionProvider');
  return ctx;
}
