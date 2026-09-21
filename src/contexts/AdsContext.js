import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSubscription, PHOTO_BONUS_USAGE_KEY } from './SubscriptionContext';
import {
  isAdsAvailable,
  initAds,
  setNonPersonalizedAds,
  subscribeAdState,
  preloadInterstitial,
  isInterstitialLoaded,
  showInterstitial,
  preloadRewarded,
  isRewardedLoaded,
  showRewarded,
} from '../services/adsService';
import {
  getAdConsent,
  setAdConsent as persistAdConsent,
  requestTrackingPermission,
  getTrackingPermission,
  AD_NETWORK_NAME,
} from '../services/adConsentService';
import { hasReachedDailyLimit, incrementDailyUsage, addDailyBonus } from '../services/dailyUsageService';
import { AI_SEARCH_USAGE_KEY } from '../services/subscriptionService';
import { AppError, ERROR_CODES, logError } from '../services/errors';
import AdConsentModal from '../components/AdConsentModal';

/**
 * Reklam politikası (tek yer):
 *   • Reklam yalnızca ücretsiz planda (isSubscribed=false) ve native modül varsa.
 *   • İlk reklamdan önce KVKK rıza sheet'i; karar verilmeden reklam gösterilmez
 *     ama akış da bloklanmaz (o seferlik reklamsız devam).
 *   • Geçiş reklamı: günde en fazla INTERSTITIAL_PER_DAY, AI analizi yüklenirken.
 *   • Ödüllü reklam: günlük hak dolunca, özellik başına günde en fazla REWARDS_PER_DAY.
 */
const INTERSTITIAL_CAP_KEY = 'ad_interstitial';
const INTERSTITIAL_PER_DAY = 1;
const REWARD_CAP_PREFIX = 'ad_reward:';
export const REWARDS_PER_DAY = 2;

// Ödül kazanılınca artırılacak bonus anahtarı (kind → dailyUsageService key)
const REWARD_BONUS_KEY = {
  photo: PHOTO_BONUS_USAGE_KEY,
  food: AI_SEARCH_USAGE_KEY,
};

const EMPTY_CONSENT = { decided: false, personalized: false, date: null };
const AdsContext = createContext(null);

export function AdsProvider({ children }) {
  const { isSubscribed, addBonusPhotoCredit, navigateTo } = useSubscription();
  const [consent, setConsent] = useState(EMPTY_CONSENT);
  const [trackingStatus, setTrackingStatus] = useState('unavailable');
  const [promptVisible, setPromptVisible] = useState(false);
  const [rewardedReady, setRewardedReady] = useState(false);
  const consentRef = useRef(consent);
  consentRef.current = consent;

  const adsEnabled = isAdsAvailable && !isSubscribed;

  // ─── Rıza + ATT durumunu yükle ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [c, att] = await Promise.all([getAdConsent(), getTrackingPermission()]);
      if (cancelled) return;
      setConsent(c);
      setTrackingStatus(att);
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── SDK init + ön yükleme (yalnızca ücretsiz + karar verilmiş) ──────────
  useEffect(() => {
    if (!adsEnabled || !consent.decided) return undefined;
    let cancelled = false;
    (async () => {
      const nonPersonalized = !(consent.personalized && trackingStatus === 'granted');
      setNonPersonalizedAds(nonPersonalized);
      await initAds({ nonPersonalizedAds: nonPersonalized });
      if (cancelled) return;
      // Günlük geçiş reklamı zaten gösterildiyse boşuna istek atma; ödüllü her zaman hazır dursun.
      if (!(await hasReachedDailyLimit(INTERSTITIAL_CAP_KEY, INTERSTITIAL_PER_DAY))) preloadInterstitial();
      preloadRewarded();
    })();
    return () => { cancelled = true; };
  }, [adsEnabled, consent.decided, consent.personalized, trackingStatus]);

  // Reklam yüklenme durumunu UI'a yansıt
  useEffect(() => {
    if (!adsEnabled) { setRewardedReady(false); return undefined; }
    const sync = () => setRewardedReady(isRewardedLoaded());
    sync();
    return subscribeAdState(sync);
  }, [adsEnabled]);

  // ─── Rıza kararları ──────────────────────────────────────────────────────
  const choosePersonalized = useCallback(async () => {
    setPromptVisible(false);
    // Apple 5.1.2: sistem ATT prompt'u ancak kullanıcı bunu seçtiğinde açılır.
    const att = await requestTrackingPermission();
    setTrackingStatus(att);
    const c = await persistAdConsent(true);
    setConsent(c);
  }, []);

  const chooseGeneral = useCallback(async () => {
    setPromptVisible(false);
    const c = await persistAdConsent(false);
    setConsent(c);
  }, []);

  /** Profil switch'i. true → ATT sorulur (daha önce reddedildiyse iOS tekrar sormaz; Ayarlar'dan açılır). */
  const setPersonalizedAds = useCallback(async (value) => {
    if (value) {
      const att = await requestTrackingPermission();
      setTrackingStatus(att);
    }
    const c = await persistAdConsent(!!value);
    setConsent(c);
    return c;
  }, []);

  const requestAdConsentPrompt = useCallback(() => setPromptVisible(true), []);

  const openPrivacyFromPrompt = useCallback(() => {
    // Sheet bir Modal; altındaki navigasyon görünmez → önce kapat, karar verilmediği
    // için bir sonraki reklam uygun anında yeniden sorulur.
    setPromptVisible(false);
    navigateTo('PrivacyPolicy');
  }, [navigateTo]);

  // ─── Geçiş reklamı ───────────────────────────────────────────────────────
  /**
   * AI isteği gönderildikten hemen sonra çağrılır; uygun değilse anında false döner.
   * Kullanıcı reklamı kapatınca çözülür — çağıran taraf AI sonucunu bundan sonra await eder.
   * @returns {Promise<boolean>} reklam gösterildi mi
   */
  const showInterstitialIfEligible = useCallback(async () => {
    if (!adsEnabled) return false;
    if (!consentRef.current.decided) { setPromptVisible(true); return false; }
    try {
      if (await hasReachedDailyLimit(INTERSTITIAL_CAP_KEY, INTERSTITIAL_PER_DAY)) return false;
      if (!isInterstitialLoaded()) { preloadInterstitial(); return false; }
      await incrementDailyUsage(INTERSTITIAL_CAP_KEY);
      await showInterstitial();
      return true;
    } catch (e) {
      logError('ads.interstitial', e);
      return false;
    } finally {
      preloadInterstitial();
    }
  }, [adsEnabled]);

  // ─── Ödüllü reklam ───────────────────────────────────────────────────────
  /** LimitReachedSheet "Reklam izle" butonunu göstermeden önce: yüklü mü + günlük ödül cap'i dolmadı mı. */
  const getRewardedAvailability = useCallback(async (kind) => {
    if (!adsEnabled || !consentRef.current.decided) return false;
    if (!isRewardedLoaded()) { preloadRewarded(); return false; }
    return !(await hasReachedDailyLimit(REWARD_CAP_PREFIX + kind, REWARDS_PER_DAY));
  }, [adsEnabled]);

  /**
   * Ödüllü reklamı gösterir; kullanıcı sonuna kadar izlediyse ilgili özelliğe
   * bugün için +1 hak ekler.
   * @param {'photo'|'food'} kind
   * @returns {Promise<boolean>} ödül verildi mi
   */
  const watchRewardedFor = useCallback(async (kind) => {
    if (!adsEnabled || !consentRef.current.decided) return false;
    const bonusKey = REWARD_BONUS_KEY[kind];
    if (!bonusKey) throw new Error(`Bilinmeyen ödül türü: ${kind}`);
    if (await hasReachedDailyLimit(REWARD_CAP_PREFIX + kind, REWARDS_PER_DAY)) {
      throw new AppError(ERROR_CODES.AD_UNAVAILABLE, {
        userMessage: 'Bugünlük reklamla ek hak kazanma sınırına ulaştınız. Yarın tekrar deneyebilirsiniz.',
        severity: 'info',
      });
    }
    try {
      const earned = await showRewarded();
      if (!earned) return false;
      await incrementDailyUsage(REWARD_CAP_PREFIX + kind);
      if (kind === 'photo') await addBonusPhotoCredit();
      else await addDailyBonus(bonusKey);
      return true;
    } finally {
      preloadRewarded();
    }
  }, [adsEnabled, addBonusPhotoCredit]);

  return (
    <AdsContext.Provider
      value={{
        adsEnabled,
        adNetworkName: AD_NETWORK_NAME,
        adConsent: consent,
        trackingStatus,
        rewardedReady,
        requestAdConsentPrompt,
        setPersonalizedAds,
        showInterstitialIfEligible,
        getRewardedAvailability,
        watchRewardedFor,
      }}
    >
      {children}
      <AdConsentModal
        visible={promptVisible && adsEnabled}
        onPersonalized={choosePersonalized}
        onGeneral={chooseGeneral}
        onOpenPrivacy={openPrivacyFromPrompt}
      />
    </AdsContext.Provider>
  );
}

export function useAds() {
  const ctx = useContext(AdsContext);
  if (!ctx) throw new Error('useAds must be inside AdsProvider');
  return ctx;
}
