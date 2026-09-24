import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initIAP,
  closeIAP,
  loadProducts,
  restorePurchases,
  setupPurchaseListeners,
  isActivePurchase,
  syncSubscriptionWithServer,
  ALL_PRODUCT_IDS,
} from '../services/subscriptionService';
import { userCreditsService } from '../services/supabase';
import { useAuth } from './AuthContext';
import { getDailyBonus, addDailyBonus } from '../services/dailyUsageService';
import { bypassPaywall, isTestEnv } from '../utils/environment';
import { toDateString } from '../utils/date';
import { logError } from '../services/errors';
import { DAILY_PHOTO_CACHE_PREFIX } from '../services/localDataService';

const SUBSCRIPTION_CACHE_KEY = 'esdiyet_sub_status_v1';
// Supabase'e ulaşılamadığında (ağ hatası, projenin "paused" olması vb.) fotoğraf
// sayacının sıfıra dönüp ücretsiz limiti fiilen sınırsız hâle getirmesini önlemek
// için cihaz-yerel yedek kayıt — bkz. dailyUsageService.js'deki aynı desen.
// Kullanıcıya göre ayrı anahtar: aynı cihazda hesap değişince sayaç taşınmasın.
const dailyPhotoCacheKey = (userId) => DAILY_PHOTO_CACHE_PREFIX + (userId || 'guest');
// Ücretsiz kullanıcılar günde 1 fotoğraf analizini deneyebilir (freemium tadımlık);
// premium kullanıcılar günde 5 hakka sahip.
const FREE_DAILY_LIMIT = 1;
const PREMIUM_DAILY_LIMIT = 5;
// Ödüllü reklamla kazanılan ek fotoğraf hakları — dailyUsageService bonus anahtarı
// (cihaz-yerel, gün bazlı; AdsContext.watchRewardedFor('photo') artırır).
export const PHOTO_BONUS_USAGE_KEY = 'photo_analysis';

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [products, setProducts] = useState([]);
  const [dailyPhotoUsed, setDailyPhotoUsed] = useState(0);
  const [bonusPhotoCredits, setBonusPhotoCredits] = useState(0);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const navigationRef = useRef(null);
  // Satın alma listener'ı init effect'inde bir kez kurulur; güncel userId'li
  // loadDailyCredits'e ref üzerinden ulaşır (stale closure olmasın).
  const loadDailyCreditsRef = useRef(async () => {});
  // Son StoreKit sonucu — giriş yapılınca sunucuya (verify-subscription) gönderilir.
  const lastPurchasesRef = useRef([]);

  // ─── Abonelik durumunu yükle ─────────────────────────────────────────────
  const loadSubscriptionStatus = useCallback(async () => {
    try {
      // Önce cache'den oku (hızlı UI)
      const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (cached) setIsSubscribed(cached === 'true');

      // Test/Simulator: StoreKit güvenilir değil — cache'e güven.
      if (isTestEnv) return;

      // StoreKit'ten gerçek durumu doğrula. Mağazaya ulaşılamazsa (restorePurchases
      // fırlatır) cache'teki son bilinen durum korunur — Premium kullanıcı geçici bir
      // hatada ücretsize düşüp reklam/limit görmesin.
      const purchases = await restorePurchases();
      const active = purchases.some(isActivePurchase);
      setIsSubscribed(active);
      await AsyncStorage.setItem(SUBSCRIPTION_CACHE_KEY, String(active));
      lastPurchasesRef.current = purchases;
    } catch (e) {
      logError('subscription.status', e);
    }
  }, []);

  // ─── Günlük kredi yükle ─────────────────────────────────────────────────
  const loadDailyCredits = useCallback(async () => {
    const today = toDateString(new Date());
    const cacheKey = dailyPhotoCacheKey(userId);
    // Reklamla kazanılan bonus (gün değiştiyse servis 0 döner)
    getDailyBonus(PHOTO_BONUS_USAGE_KEY).then(setBonusPhotoCredits).catch(() => setBonusPhotoCredits(0));
    try {
      const credits = await userCreditsService.getOrInit();
      const used = credits?.daily_photo_used ?? 0;
      setDailyPhotoUsed(used);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ date: today, count: used }));
    } catch (e) {
      // Supabase'e ulaşılamadı (guest oturumu, ağ hatası, proje "paused" vb.) —
      // sayacı 0'a düşürüp limiti fiilen sınırsız yapmak yerine son bilinen
      // cihaz-yerel değeri kullan (bkz. DAILY_PHOTO_CACHE_PREFIX tanımı).
      console.warn('Daily credits load:', e?.message);
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        const parsed = cached ? JSON.parse(cached) : null;
        setDailyPhotoUsed(parsed?.date === today ? parsed.count : 0);
      } catch {
        setDailyPhotoUsed(0);
      }
    }
  }, [userId]);

  loadDailyCreditsRef.current = loadDailyCredits;

  // Abonelik sunucuda doğrulansın (ai-proxy Premium tavanı): StoreKit durumu yüklendikten
  // sonra ve kullanıcı değişince. Oturum yoksa sunucu kimliği bağlayamaz → atla.
  useEffect(() => {
    if (!userId || isTestEnv || loadingSubscription || !isSubscribed) return;
    syncSubscriptionWithServer(lastPurchasesRef.current);
  }, [userId, loadingSubscription, isSubscribed]);

  // Krediler kullanıcıya bağlı: giriş / çıkış / hesap değişiminde yeniden yükle
  // (eskiden yalnızca açılışta yükleniyordu → girişten sonra sayaç güncellenmiyordu).
  useEffect(() => {
    loadDailyCredits();
  }, [loadDailyCredits]);

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
            lastPurchasesRef.current = [purchase];
            syncSubscriptionWithServer([purchase]);
            await loadDailyCreditsRef.current();
          }
        },
        (error) => {
          console.warn('Purchase error:', error?.message);
        }
      );

      // Ürünleri ve abonelik durumunu paralel yükle (krediler ayrı effect'te, userId'ye bağlı)
      const [prods] = await Promise.all([
        loadProducts(),
        loadSubscriptionStatus(),
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
  // Premium'da bonus anlamsız (reklam yok); ücretsizde taban + ödüllü reklam bonusu.
  const dailyPhotoLimit = isSubscribed ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT + bonusPhotoCredits;
  const canUsePhotoToday = bypassPaywall || dailyPhotoUsed < dailyPhotoLimit;

  // ─── Ödüllü reklam bonusu (+1 fotoğraf hakkı, bugün için) ────────────────
  const addBonusPhotoCredit = useCallback(async () => {
    const next = await addDailyBonus(PHOTO_BONUS_USAGE_KEY);
    setBonusPhotoCredits(next);
    return next;
  }, []);

  // ─── Krediyi artır ───────────────────────────────────────────────────────
  const incrementDailyPhotoCredit = useCallback(async () => {
    if (bypassPaywall) return;
    const today = toDateString(new Date());
    const cacheKey = dailyPhotoCacheKey(userId);
    try {
      const newCount = await userCreditsService.increment();
      setDailyPhotoUsed(newCount);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ date: today, count: newCount }));
    } catch (e) {
      // Supabase'e yazılamadı — yine de bu oturum içinde limiti doğru uygulamak
      // için cihaz-yerel sayacı artır (aksi hâlde limit hiç devreye girmez).
      console.warn('Credit increment:', e?.message);
      setDailyPhotoUsed((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem(cacheKey, JSON.stringify({ date: today, count: next })).catch(() => {});
        return next;
      });
    }
  }, [userId]);

  // ─── Paywall navigasyonu ─────────────────────────────────────────────────
  const openPaywall = useCallback(() => {
    navigationRef.current?.navigate('Paywall');
  }, []);

  // Ekran dışından (global modallar) rota açmak için — ör. AdConsentModal → Gizlilik politikası
  const navigateTo = useCallback((route, params) => {
    navigationRef.current?.navigate(route, params);
  }, []);

  // ─── Abonelik yenile (satın alma sonrası) ────────────────────────────────
  const refreshSubscription = useCallback(async () => {
    await loadSubscriptionStatus();
    if (userId && !isTestEnv) await syncSubscriptionWithServer(lastPurchasesRef.current);
    await loadDailyCredits();
  }, [loadSubscriptionStatus, loadDailyCredits, userId]);

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
        freeDailyLimit: FREE_DAILY_LIMIT,
        bonusPhotoCredits,
        addBonusPhotoCredit,
        products,
        loadingSubscription,
        incrementDailyPhotoCredit,
        openPaywall,
        navigateTo,
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
