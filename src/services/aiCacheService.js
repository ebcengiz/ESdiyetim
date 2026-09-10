// AI Yanıt Önbelleği
// Aynı prompt (dolayısıyla aynı kullanıcı verisi) için kısa süreli önbellekleme —
// ekran yeniden mount olduğunda veya kullanıcı aynı veriyle geri döndüğünde
// gereksiz AI çağrısı/kota tüketimini önler.
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'esdiyet_ai_cache_v1:';
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 saat

/** Basit, hızlı, bağımlılıksız string hash (kriptografik değil — sadece cache key için). */
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function cacheKeyForPrompt(prompt) {
  return hashString(String(prompt || ''));
}

export async function getCached(key) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { value, expiresAt } = JSON.parse(raw);
    if (!value || Date.now() > expiresAt) {
      AsyncStorage.removeItem(CACHE_PREFIX + key).catch(() => {});
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Ateşle-unut — önbellek yazımı ana akışı asla bloklamamalı/bozmamalı. */
export function setCached(key, value, ttlMs = DEFAULT_TTL_MS) {
  AsyncStorage.setItem(
    CACHE_PREFIX + key,
    JSON.stringify({ value, expiresAt: Date.now() + ttlMs })
  ).catch(() => {
    /* önbellek best-effort, hatayı yut */
  });
}
