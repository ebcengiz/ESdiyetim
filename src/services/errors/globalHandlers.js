// Global hata yakalayıcılar — yakalanmamış JS hataları ve promise reddedilmeleri.
//
// Geliştirmede (__DEV__) RN'nin RedBox/LogBox davranışı korunur (önceki handler
// çağrılır). Production'da:
//   • Fatal JS hatası → kullanıcı çökme yerine ErrorBoundary'nin "Bir şeyler ters
//     gitti" ekranını görür (notifyFatal ile).
//   • Yakalanmamış promise → sadece konsola yazılır; kullanıcıya hiçbir şey
//     yansımaz (ekranlar zaten kendi try/catch'leriyle toast gösteriyor).

import { normalizeError } from './normalizeError';

const fatalListeners = new Set();
let installed = false;

/** ErrorBoundary buradan abone olur */
export function onFatalError(fn) {
  fatalListeners.add(fn);
  return () => fatalListeners.delete(fn);
}

function notifyFatal(error) {
  fatalListeners.forEach((fn) => {
    try {
      fn(error);
    } catch {
      /* ignore */
    }
  });
}

export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  // ── Senkron / render dışı JS hataları ──────────────────────────────────
  const prevHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    const appErr = normalizeError(error, { context: 'global' });
    console.error(`💥 [global${isFatal ? ' FATAL' : ''}]`, appErr.detail || appErr.message);

    if (__DEV__) {
      // Geliştirmede RedBox'ı koru
      prevHandler?.(error, isFatal);
      return;
    }
    if (isFatal) notifyFatal(appErr);
  });

  // ── Yakalanmamış promise reddedilmeleri ─────────────────────────────────
  if (__DEV__) return; // Dev'de RN/LogBox zaten izliyor

  const onUnhandled = (_id, error) => {
    const appErr = normalizeError(error, { context: 'unhandledRejection' });
    console.warn('⚠️ [unhandledRejection]', appErr.detail || appErr.message);
  };

  try {
    if (global.HermesInternal?.enablePromiseRejectionTracker) {
      global.HermesInternal.enablePromiseRejectionTracker({ allRejections: true, onUnhandled });
      return;
    }
    // Hermes dışı (nadir): polyfill'in izleyicisi
    // eslint-disable-next-line global-require
    const tracking = require('promise/setimmediate/rejection-tracking');
    tracking.enable({ allRejections: true, onUnhandled });
  } catch {
    /* izleyici kurulamadı — sessiz geç */
  }
}
