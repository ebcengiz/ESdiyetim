// AI Veri Paylaşımı Onay Servisi
// Apple App Store Review Guideline 5.1.2(i): kullanıcı verisi üçüncü taraf AI'a
// gönderilmeden önce sağlayıcı(lar) adıyla belirtilerek açık onay alınmalı ve
// bu onay kullanıcı tarafından istenildiği zaman geri çekilebilmelidir.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'esdiyet_ai_consent_v1';

export const AI_PROVIDER_NAMES = ['Google Gemini', 'Groq'];

let cached = null;

export class AIConsentRequiredError extends Error {
  constructor() {
    super('AI_CONSENT_REQUIRED');
    this.code = 'AI_CONSENT_REQUIRED';
  }
}

/** @returns {Promise<{granted: boolean, decided: boolean, date: string|null}>} */
export async function getAIConsent() {
  if (cached) return cached;
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    cached = raw ? JSON.parse(raw) : { granted: false, decided: false, date: null };
  } catch {
    cached = { granted: false, decided: false, date: null };
  }
  return cached;
}

export function getCachedAIConsent() {
  return cached;
}

export async function setAIConsent(granted) {
  cached = { granted: !!granted, decided: true, date: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn('[aiConsentService] Onay kaydedilemedi:', e?.message);
  }
  return cached;
}

/** providers.js'deki her sağlayıcı zincirinin başında çağrılır — onay yoksa ağa hiç çıkmadan durur. */
export async function assertAIConsent() {
  const consent = await getAIConsent();
  if (!consent.granted) {
    throw new AIConsentRequiredError();
  }
}
