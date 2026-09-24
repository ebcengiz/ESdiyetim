/**
 * Ads Service — Google AdMob (react-native-google-mobile-ads) sarmalayıcı
 *
 * Yalnızca ÜCRETSİZ plandaki kullanıcıya iki format:
 *   • Geçiş (interstitial): AI analizi başlarken, günde en fazla 1 (cap AdsContext'te).
 *   • Ödüllü (rewarded):    günlük AI hakkı dolunca "reklam izle → +1 analiz".
 * Banner kullanılmaz.
 *
 * Kurallar:
 *   - Bu modül reklam ağına HİÇBİR kullanıcı/sağlık verisi göndermez: `keywords`,
 *     `contentUrl`, `customTargeting` gibi request alanları bilinçli olarak
 *     kullanılmaz (KVKK özel nitelikli veri + Apple 5.1.3 sağlık verisi kuralı).
 *   - Native modül Expo Go'da yok → connectivity.js'deki gibi modül kapsamında
 *     try/require; modül yoksa tüm fonksiyonlar no-op döner, uygulama çökmez.
 *   - Test ortamında (dev/TestFlight) daima Google TestIds kullanılır; gerçek
 *     ad unit ID'leri yalnızca production bundle'a `.env`'den girer. Gerçek ID ile
 *     test tıklaması AdMob hesabının askıya alınmasına yol açar.
 *   - Kişiselleştirme kararı (rıza + ATT) her reklam nesnesi oluşturulurken
 *     `requestNonPersonalizedAdsOnly` ile uygulanır; karar değişirse nesne
 *     yeniden oluşturulur.
 */
import { isTestEnv } from '../utils/environment';
import { AppError, ERROR_CODES } from './errors';

let Ads = null;
try {
  // eslint-disable-next-line global-require
  Ads = require('react-native-google-mobile-ads');
} catch (e) {
  console.warn('AdMob native modülü yok (Expo Go / build yenilenmeli):', String(e?.message || e).split('\n')[0]);
}

export const isAdsAvailable = !!Ads?.default && !!Ads?.InterstitialAd && !!Ads?.RewardedAd;

// Google'ın resmî test ad unit'leri; production'da .env'den okunur.
function resolveUnitIds() {
  if (!Ads) return { interstitial: null, rewarded: null };
  if (isTestEnv) return { interstitial: Ads.TestIds.INTERSTITIAL, rewarded: Ads.TestIds.REWARDED };
  return {
    interstitial: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || null,
    rewarded: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || null,
  };
}
export const AD_UNIT_IDS = resolveUnitIds();

// Başarısız yüklemeden sonra yeniden deneme için bekleme (no-fill'de ağı yorma)
const RETRY_COOLDOWN_MS = 60 * 1000;

let initPromise = null;
let nonPersonalized = true;

// Yüklenme durumu değişince AdsContext'e haber ver (UI "Reklam izle" butonunu
// yalnızca reklam gerçekten hazırken gösterir).
const stateListeners = new Set();
function notifyState() {
  stateListeners.forEach((fn) => {
    try { fn(); } catch { /* dinleyici hatası servisi durdurmasın */ }
  });
}
/** @returns {() => void} abonelikten çıkma */
export function subscribeAdState(fn) {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}

/**
 * SDK'yı bir kez başlatır. AdsContext bunu ücretsiz planda açılışta çağırır:
 * kişiselleştirme kararı yoksa genel (non-personalized) modda. Google'ın "rızadan
 * önce initialize etme" önerisi UMP/GDPR bölgeleri içindir; uygulama yalnızca
 * Türkiye'de ve genel reklamın dayanağı meşru menfaat (PRIVACY.md, KVKK m.5/2-f).
 */
export async function initAds({ nonPersonalizedAds = true, maxAdContentRating } = {}) {
  nonPersonalized = !!nonPersonalizedAds;
  if (!isAdsAvailable) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const mobileAds = Ads.default;
      await mobileAds().setRequestConfiguration({
        // App Store yaş derecelendirmesiyle uyumlu içerik seviyesi (sağlık uygulaması → muhafazakâr)
        maxAdContentRating: maxAdContentRating || Ads.MaxAdContentRating.PG,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await mobileAds().initialize();
      return true;
    } catch (e) {
      console.warn('[adsService] init:', e?.message);
      initPromise = null;
      return false;
    }
  })();
  return initPromise;
}

/** Rıza/ATT değişince çağrılır; mevcut önyüklenmiş reklamlar yeni ayarla yeniden oluşturulur. */
export function setNonPersonalizedAds(value) {
  const next = !!value;
  if (next === nonPersonalized) return;
  nonPersonalized = next;
  interstitial.reset();
  rewarded.reset();
}

// ─── Tam ekran reklam slotu (interstitial / rewarded ortak makine) ──────────
function createSlot(kind) {
  const slot = {
    ad: null,
    loaded: false,
    loading: false,
    lastFailAt: 0,
    unsubscribe: null,
    reset() {
      if (slot.unsubscribe) slot.unsubscribe();
      slot.ad = null;
      slot.loaded = false;
      slot.loading = false;
      slot.unsubscribe = null;
      notifyState();
    },
  };

  function build() {
    const unitId = AD_UNIT_IDS[kind];
    if (!isAdsAvailable || !unitId) return null;
    const AdClass = kind === 'rewarded' ? Ads.RewardedAd : Ads.InterstitialAd;
    // DİKKAT: keywords / contentUrl / customTargeting eklenmez (bkz. dosya başı).
    return AdClass.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: nonPersonalized });
  }

  slot.preload = function preload() {
    if (!isAdsAvailable) return;
    if (slot.loaded || slot.loading) return;
    if (Date.now() - slot.lastFailAt < RETRY_COOLDOWN_MS) return;
    if (!slot.ad) {
      slot.ad = build();
      if (!slot.ad) return;
    }
    slot.loading = true;
    const loadedEvent = kind === 'rewarded' ? Ads.RewardedAdEventType.LOADED : Ads.AdEventType.LOADED;
    const onLoaded = () => { slot.loaded = true; slot.loading = false; notifyState(); };
    const onError = (err) => {
      slot.lastFailAt = Date.now();
      // no-fill / ağ hatası beklenen durum → warn (Metro gürültüsü yapma)
      console.warn(`[adsService] ${kind} yüklenemedi:`, err?.message || err);
      slot.reset();
    };
    const offLoaded = slot.ad.addAdEventListener(loadedEvent, onLoaded);
    const offError = slot.ad.addAdEventListener(Ads.AdEventType.ERROR, onError);
    slot.unsubscribe = () => { offLoaded(); offError(); };
    try {
      slot.ad.load();
    } catch (e) {
      onError(e);
    }
  };

  slot.isLoaded = () => !!(slot.loaded && slot.ad?.loaded);

  /**
   * Reklamı gösterir; kapanınca çözülür. Ödüllü reklamda ödül kazanıldıysa true.
   * Yüklü değilse AppError(AD_UNAVAILABLE) fırlatır.
   */
  slot.show = function show() {
    if (!slot.isLoaded()) {
      return Promise.reject(new AppError(ERROR_CODES.AD_UNAVAILABLE, { detail: `${kind} not loaded` }));
    }
    const ad = slot.ad;
    return new Promise((resolve, reject) => {
      let earned = false;
      const subs = [];
      const done = (fn) => {
        subs.forEach((off) => off());
        // Bir sonraki gösterim için yeni nesne gerekir (tam ekran reklamlar tek kullanımlık)
        slot.reset();
        fn();
      };
      if (kind === 'rewarded') {
        subs.push(ad.addAdEventListener(Ads.RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      }
      subs.push(ad.addAdEventListener(Ads.AdEventType.CLOSED, () => done(() => resolve(earned))));
      subs.push(ad.addAdEventListener(Ads.AdEventType.ERROR, (err) => done(() => reject(new AppError(ERROR_CODES.AD_UNAVAILABLE, { detail: `${kind} show`, cause: err })))));
      ad.show().catch((err) => done(() => reject(new AppError(ERROR_CODES.AD_UNAVAILABLE, { detail: `${kind} show()`, cause: err }))));
    });
  };

  return slot;
}

const interstitial = createSlot('interstitial');
const rewarded = createSlot('rewarded');

export const preloadInterstitial = () => interstitial.preload();
export const isInterstitialLoaded = () => interstitial.isLoaded();
/** @returns {Promise<boolean>} her zaman false (ödül yok); kapanınca çözülür */
export const showInterstitial = () => interstitial.show();

export const preloadRewarded = () => rewarded.preload();
export const isRewardedLoaded = () => rewarded.isLoaded();
/** @returns {Promise<boolean>} kullanıcı ödülü kazandıysa true */
export const showRewarded = () => rewarded.show();
