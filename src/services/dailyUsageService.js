// Genel amaçlı, cihaz-yerel günlük kullanım sayacı.
// Sunucu tarafı doğrulama gerektirmeyen, "yumuşak" freemium limitleri için
// (ör. ücretsiz kullanıcıların günde birkaç kez deneyebildiği AI özellikleri).
// Güvenlik sınırı değildir — sadece kullanım nazikçe sınırlandırılır.
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'esdiyet_daily_usage_v1:';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

async function readState(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return { date: todayStr(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayStr()) return { date: todayStr(), count: 0 };
    return parsed;
  } catch {
    return { date: todayStr(), count: 0 };
  }
}

/** Bugünkü kullanım sayısını döner (gün değiştiyse otomatik sıfırlanmış kabul edilir). */
export async function getDailyUsageCount(key) {
  const state = await readState(key);
  return state.count;
}

/** Sayaç bugün için limiti aştıysa true döner. */
export async function hasReachedDailyLimit(key, limit) {
  const count = await getDailyUsageCount(key);
  return count >= limit;
}

/** Sayaç +1 artırır ve yeni değeri döner. */
export async function incrementDailyUsage(key) {
  const state = await readState(key);
  const next = { date: todayStr(), count: state.count + 1 };
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(next));
  } catch {
    /* best-effort — yumuşak limit, hata sessizce yutulur */
  }
  return next.count;
}
