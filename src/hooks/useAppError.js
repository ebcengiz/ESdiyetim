import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { normalizeError, logError, ERROR_CODES } from '../services/errors';

/**
 * Ekranlarda hata gösterimi için TEK yol.
 *
 *   const { handleError } = useAppError();
 *   try { ... } catch (e) { handleError(e, { context: 'weight.save' }); }
 *
 * - Ham hatayı AppError'a çevirir, teknik ayrıntıyı konsola yazar.
 * - Kullanıcıya yalnızca errorMessages.js'deki sakin/yönlendirici metni gösterir.
 * - Döndürdüğü AppError ile ekran özel akış kurabilir (ör. AI_CONSENT_REQUIRED → onay modalı).
 *
 * @param {unknown} err
 * @param {object} [opts]
 * @param {string} [opts.context]   Log etiketi
 * @param {string} [opts.fallbackCode]  Tanınmayan hata için kod (UNKNOWN yerine)
 * @param {string} [opts.message]   Bu ekrana özel kullanıcı mesajı (sözlüğü geçersiz kılar)
 * @param {boolean} [opts.silent]   Toast gösterme, sadece logla ve döndür
 * @param {string[]} [opts.silentCodes]  Bu kodlarda toast gösterme (ekran kendisi ele alır)
 * @param {function} [opts.onRetry]  Verilirse ve hata "retryable" ise toast'ta "Tekrar dene" butonu çıkar
 */
export function useAppError() {
  const { showToast } = useToast();

  const handleError = useCallback(
    (err, { context = '', fallbackCode, message, silent = false, silentCodes = [], onRetry } = {}) => {
      const appErr = normalizeError(err, { context, fallbackCode });
      logError(context, appErr);

      const skip =
        silent ||
        silentCodes.includes(appErr.code) ||
        appErr.code === ERROR_CODES.IAP_CANCELLED;

      if (!skip) {
        const toastType = appErr.severity === 'info' ? 'info' : appErr.severity === 'warning' ? 'warning' : 'error';
        const action = onRetry && appErr.retryable ? { label: 'Tekrar dene', onPress: onRetry } : undefined;
        showToast(message || appErr.userMessage, toastType, { action });
      }
      return appErr;
    },
    [showToast]
  );

  return { handleError };
}

export default useAppError;
