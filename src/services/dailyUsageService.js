// Genel amaçlı, cihaz-yerel günlük kullanım sayacı.
// Sunucu tarafı doğrulama gerektirmeyen, "yumuşak" freemium limitleri için
// (ör. ücretsiz kullanıcıların günde birkaç kez deneyebildiği AI özellikleri).
// Güvenlik sınırı değildir — sadece kullanım nazikçe sınırlandırılır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDateString } from '../utils/date';

const PREFIX = 'esdiyet_daily_usage_v1:';

// YEREL takvim günü — toISOString UTC olduğu için TR'de sayaçlar 03:00'te sıfırlanıyordu.
function todayStr() {
  return toDateString(new Date());
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

/**
 * Sayaç bugün için limiti aştıysa true döner. Ödüllü reklamla kazanılan
 * günlük bonus haklar (bkz. addDailyBonus) limite otomatik eklenir.
 */
export async function hasReachedDailyLimit(key, limit) {
  const [count, bonus] = await Promise.all([getDailyUsageCount(key), getDailyBonus(key)]);
  return count >= limit + bonus;
}

// ─── Ödüllü reklam bonusu ───────────────────────────────────────────────────
// Ücretsiz kullanıcı günlük hakkı dolunca ödüllü reklam izleyerek aynı gün için
// ek hak kazanır. Bonus da kullanım sayacı gibi cihaz-yerel ve gün bazlıdır;
// gün değişince sıfırlanır. Ayrı anahtar (`<key>:bonus`) tutulur ki kullanım
// sayacı ile karışmasın.
const BONUS_SUFFIX = ':bonus';

/** Bugün için kazanılmış bonus hak sayısı. */
export async function getDailyBonus(key) {
  const state = await readState(key + BONUS_SUFFIX);
  return state.count;
}

/** Bonus +1 artırır ve yeni bonus toplamını döner. */
export async function addDailyBonus(key) {
  return incrementDailyUsage(key + BONUS_SUFFIX);
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
