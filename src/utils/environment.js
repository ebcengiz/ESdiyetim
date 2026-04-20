/**
 * Ortam tespiti
 *
 * - `isTestFlight`: EXPO_PUBLIC_IS_TESTFLIGHT=true olduğunda true.
 * - `isDev`: Metro / simülator / development build.
 * - `isTestEnv`: TestFlight VEYA development. Bu ortamda gerçek IAP satın alma akışı tetiklenmez.
 * - `bypassPaywall`: Paywall'u tamamen atlamak için (sadece lokal geliştirme).
 *
 * Not: App Store production build'de __DEV__ false'tur ve EXPO_PUBLIC_IS_TESTFLIGHT
 * ayarlanmadıysa `isTestEnv` false olur → StoreKit gerçek akış çalışır.
 */

export const isTestFlight = process.env.EXPO_PUBLIC_IS_TESTFLIGHT === 'true';

export const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;

// TestFlight ve simülatörde gerçek ödeme akışını çalıştırma.
export const isTestEnv = isDev || isTestFlight;

// Paywall'u tamamen atlamak istersen EXPO_PUBLIC_BYPASS_PAYWALL=true
export const bypassPaywall = process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true';
