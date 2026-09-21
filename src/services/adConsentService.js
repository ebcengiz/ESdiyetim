// Reklam Rızası Servisi (KVKK + Apple ATT)
//
// Ücretsiz plandaki kullanıcıya ilk reklam gösterilmeden önce bir kez sorulur:
//   • "Kişiselleştirilmiş reklamlar" → iOS ATT (App Tracking Transparency) sistem
//     izni istenir; izin verilirse reklam kimliği (IDFA) kullanılabilir.
//   • "Sadece genel reklamlar"       → ATT sorulmaz, her reklam isteği
//     `requestNonPersonalizedAdsOnly: true` ile gider.
//
// KVKK m.5 açık rıza ölçütleri: karar ayrı ve bilgilendirilmiş alınır, tarihiyle
// saklanır, hizmet şartı değildir (ret → uygulama tam çalışır) ve Profil'den
// her an geri çekilebilir. Apple 5.1.2: ATT'yi reddeden kullanıcıya hiçbir
// özellik kapatılmaz, teşvik verilmez.
//
// Desen aiConsentService.js ile aynı (AsyncStorage + modül-içi cache).
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'esdiyet_ad_consent_v1';
// Aydınlatma metni değişirse artır → kullanıcıya yeniden sorulur.
export const AD_CONSENT_VERSION = 1;

export const AD_NETWORK_NAME = 'Google AdMob';

// expo-tracking-transparency native modüldür; Expo Go'da / eski binary'de eksik
// olabilir. connectivity.js'deki gibi MODÜL KAPSAMINDA try/require (runtime
// require hatasını Metro try/catch'e vermez).
let TrackingTransparency = null;
try {
  // eslint-disable-next-line global-require
  TrackingTransparency = require('expo-tracking-transparency');
} catch (e) {
  console.warn('expo-tracking-transparency modülü yok (build yenilenmeli):', String(e?.message || e).split('\n')[0]);
}

const EMPTY = { decided: false, personalized: false, date: null, version: AD_CONSENT_VERSION };
let cached = null;

/** @returns {Promise<{decided: boolean, personalized: boolean, date: string|null, version: number}>} */
export async function getAdConsent() {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    // Eski sürüm rıza → yeniden sorulmalı
    cached = parsed && parsed.version === AD_CONSENT_VERSION ? parsed : { ...EMPTY };
  } catch {
    cached = { ...EMPTY };
  }
  return cached;
}

export function getCachedAdConsent() {
  return cached;
}

/** Kararı tarihiyle kaydeder (KVKK: rızanın ispatı). */
export async function setAdConsent(personalized) {
  cached = { decided: true, personalized: !!personalized, date: new Date().toISOString(), version: AD_CONSENT_VERSION };
  try {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn('[adConsentService] Rıza kaydedilemedi:', e?.message);
  }
  return cached;
}

/**
 * iOS ATT sistem izni. Yalnızca kullanıcı "kişiselleştirilmiş" seçtiyse çağrılır.
 * @returns {Promise<'granted'|'denied'|'unavailable'>}
 */
export async function requestTrackingPermission() {
  if (!TrackingTransparency?.requestTrackingPermissionsAsync) return 'unavailable';
  try {
    if (typeof TrackingTransparency.isAvailable === 'function' && !TrackingTransparency.isAvailable()) {
      return 'unavailable';
    }
    const res = await TrackingTransparency.requestTrackingPermissionsAsync();
    return res?.granted ? 'granted' : 'denied';
  } catch (e) {
    console.warn('[adConsentService] ATT izni alınamadı:', e?.message);
    return 'unavailable';
  }
}

/** Mevcut ATT durumu (prompt açmadan). */
export async function getTrackingPermission() {
  if (!TrackingTransparency?.getTrackingPermissionsAsync) return 'unavailable';
  try {
    const res = await TrackingTransparency.getTrackingPermissionsAsync();
    return res?.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
