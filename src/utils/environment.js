/**
 * Ortam tespiti — Paywall her ortamda gösterilir
 *
 * bypassPaywall = false → Simulator, TestFlight ve Production'da paywall görünür
 *
 * Not: Geliştirme/test sırasında paywall'u geçici olarak atlamak istersen
 * EXPO_PUBLIC_BYPASS_PAYWALL=true ortam değişkenini kullan.
 */

export const isTestFlight = process.env.EXPO_PUBLIC_IS_TESTFLIGHT === 'true';

// Paywall artık TestFlight ve Simulator dahil tüm ortamlarda görünür.
// Yalnızca açıkça EXPO_PUBLIC_BYPASS_PAYWALL=true verilirse bypass edilir.
export const bypassPaywall = process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true';
