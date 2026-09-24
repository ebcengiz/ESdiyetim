// Cihazda tutulan, kullanıcıya ait yerel veriler — çıkış / hesap silmede temizlenir.
// Aynı cihazda başka bir hesap açıldığında (ya da misafir modda) önceki kullanıcının
// sağlık verisi içeren AI yanıtları ve günlük sayaçları görünmesin (KVKK).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAICache } from './aiCacheService';

// SubscriptionContext'in kullanıcı bazlı fotoğraf sayacı önbelleği (+ userId).
export const DAILY_PHOTO_CACHE_PREFIX = 'esdiyet_daily_photo_used_v2:';
// v1 kullanıcıdan bağımsızdı — eski kurulumlarda kalan kaydı da sil.
const LEGACY_KEYS = ['esdiyet_daily_photo_used_v1'];

/** Çıkış yapan kullanıcının yerel verilerini sil (best-effort, hata fırlatmaz). */
export async function clearUserLocalData(userId) {
  try {
    await clearAICache();
    const keys = [...LEGACY_KEYS];
    if (userId) keys.push(DAILY_PHOTO_CACHE_PREFIX + userId);
    await AsyncStorage.multiRemove(keys);
  } catch {
    /* yerel temizlik başarısız olsa bile çıkış akışı bozulmamalı */
  }
}
