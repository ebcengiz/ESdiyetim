/**
 * Ortam tespiti
 *
 * - `isTestFlight`: EXPO_PUBLIC_IS_TESTFLIGHT=true olduğunda true.
 * - `isDev`: Metro / simülator / development build (Expo Go / dev client dahil).
 * - `isTestEnv`: TestFlight VEYA development. Bu ortamda gerçek IAP satın alma akışı tetiklenmez.
 * - `bypassPaywall`: Paywall'u tamamen atlamak için. TestFlight ve Expo denemelerinde
 *   (dev/Expo Go) test edenlerin satın alma yapmadan tüm özellikleri deneyebilmesi için
 *   otomatik olarak true — ayrıca EXPO_PUBLIC_BYPASS_PAYWALL=true ile production build'de
 *   de manuel açılabilir.
 *
 * Not: App Store production build'de __DEV__ false'tur ve EXPO_PUBLIC_IS_TESTFLIGHT
 * ayarlanmadıysa `isTestEnv`/`bypassPaywall` false olur → StoreKit gerçek akış çalışır,
 * gerçek kullanıcılar normal ücretsiz/premium sınırlarına tabi olur.
 */

export const isTestFlight = process.env.EXPO_PUBLIC_IS_TESTFLIGHT === 'true';

export const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;

// TestFlight ve simülatörde gerçek ödeme akışını çalıştırma.
export const isTestEnv = isDev || isTestFlight;

// TestFlight/Expo denemelerinde tamamen ücretsiz; production'da manuel bayrakla açılabilir.
export const bypassPaywall = isTestEnv || process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true';
