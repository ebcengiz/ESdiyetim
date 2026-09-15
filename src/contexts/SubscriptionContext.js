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
import { bypassPaywall, isTestEnv } from '../utils/environment';

const SUBSCRIPTION_CACHE_KEY = 'esdiyet_sub_status_v1';
// Supabase'e ulaşılamadığında (ağ hatası, projenin "paused" olması vb.) fotoğraf
// sayacının sıfıra dönüp ücretsiz limiti fiilen sınırsız hâle getirmesini önlemek
// için cihaz-yerel yedek kayıt — bkz. dailyUsageService.js'deki aynı desen.
const DAILY_PHOTO_CACHE_KEY = 'esdiyet_daily_photo_used_v1';
// Ücretsiz kullanıcılar günde 1 fotoğraf analizini deneyebilir (freemium tadımlık);
// premium kullanıcılar günde 5 hakka sahip.
const FREE_DAILY_LIMIT = 1;
const PREMIUM_DAILY_LIMIT = 5;

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

      // Test/Simulator: StoreKit güvenilir değil — cache'e güven.
      if (isTestEnv) return;

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
    const today = new Date().toISOString().split('T')[0];
    try {
      const credits = await userCreditsService.getOrInit();
      const used = credits?.daily_photo_used ?? 0;
      setDailyPhotoUsed(used);
      await AsyncStorage.setItem(DAILY_PHOTO_CACHE_KEY, JSON.stringify({ date: today, count: used }));
    } catch (e) {
      // Supabase'e ulaşılamadı (guest oturumu, ağ hatası, proje "paused" vb.) —
      // sayacı 0'a düşürüp limiti fiilen sınırsız yapmak yerine son bilinen
      // cihaz-yerel değeri kullan (bkz. DAILY_PHOTO_CACHE_KEY tanımı).
      console.warn('Daily credits load:', e?.message);
      try {
        const cached = await AsyncStorage.getItem(DAILY_PHOTO_CACHE_KEY);
        const parsed = cached ? JSON.parse(cached) : null;
        setDailyPhotoUsed(parsed?.date === today ? parsed.count : 0);
      } catch {
        setDailyPhotoUsed(0);
      }
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
  const dailyPhotoLimit = isSubscribed ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const canUsePhotoToday = bypassPaywall || dailyPhotoUsed < dailyPhotoLimit;

  // ─── Krediyi artır ───────────────────────────────────────────────────────
  const incrementDailyPhotoCredit = useCallback(async () => {
    if (bypassPaywall) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const newCount = await userCreditsService.increment();
      setDailyPhotoUsed(newCount);
      await AsyncStorage.setItem(DAILY_PHOTO_CACHE_KEY, JSON.stringify({ date: today, count: newCount }));
    } catch (e) {
      // Supabase'e yazılamadı — yine de bu oturum içinde limiti doğru uygulamak
      // için cihaz-yerel sayacı artır (aksi hâlde limit hiç devreye girmez).
      console.warn('Credit increment:', e?.message);
      setDailyPhotoUsed((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem(DAILY_PHOTO_CACHE_KEY, JSON.stringify({ date: today, count: next })).catch(() => {});
        return next;
      });
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

  // ─── Test/Simulator için sahte aktivasyon ────────────────────────────────
  // TestFlight ve simülatörde StoreKit açılamadığı için premium ekranları
  // önizleyebilmek amacıyla lokal olarak abonelik durumunu açar.
  const activateTestSubscription = useCallback(async () => {
    setIsSubscribed(true);
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, 'true');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        isSubscribed,
        canUsePhotoToday,
        dailyPhotoUsed,
        dailyLimit: dailyPhotoLimit,
        products,
        loadingSubscription,
        incrementDailyPhotoCredit,
        openPaywall,
        refreshSubscription,
        activateTestSubscription,
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
