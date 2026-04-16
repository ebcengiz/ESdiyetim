/**
 * Ortam tespiti — TestFlight ve Simulator için paywall bypass
 *
 * bypassPaywall = true  → Simulator (__DEV__) veya TestFlight (preview EAS build)
 * bypassPaywall = false → Production build (App Store)
 */

export const isTestFlight = process.env.EXPO_PUBLIC_IS_TESTFLIGHT === 'true';

// __DEV__ = true hem simulator'da hem de development client'ta
export const bypassPaywall = __DEV__ || isTestFlight;
