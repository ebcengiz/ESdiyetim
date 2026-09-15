// Uygulama genelinde tek hata modeli.
//
// Ham hatalar (Supabase, fetch, expo-iap, AI sağlayıcıları) kullanıcıya asla
// doğrudan ulaşmaz; normalizeError() ile AppError'a çevrilir ve ekranlar sadece
// `userMessage` / `code` ile ilgilenir. Teknik ayrıntı `detail` + `cause`
// alanlarında kalır ve yalnızca konsola yazılır.

import { ERROR_CODES, getErrorMessage } from '../../constants/errorMessages';

export class AppError extends Error {
  /**
   * @param {string} code  ERROR_CODES içinden bir kod
   * @param {object} [opts]
   * @param {string} [opts.userMessage]  Sözlükteki mesajı geçersiz kılar (kullanıcı dostu olmalı)
   * @param {string} [opts.title]
   * @param {string} [opts.detail]  Geliştirici ayrıntısı (HTTP kodu, sağlayıcı vb.) — sadece log
   * @param {unknown} [opts.cause]  Orijinal hata
   * @param {'info'|'warning'|'error'} [opts.severity]
   * @param {boolean} [opts.retryable]
   * @param {object} [opts.meta]  Ek veri (ör. { provider, status })
   */
  constructor(code, opts = {}) {
    const def = getErrorMessage(code);
    const userMessage = opts.userMessage || def.message;
    super(userMessage);
    this.name = 'AppError';
    this.isAppError = true;
    this.code = ERROR_CODES[code] ? code : ERROR_CODES.UNKNOWN;
    this.userMessage = userMessage;
    this.title = opts.title || def.title;
    this.severity = opts.severity || def.severity || 'error';
    this.retryable = typeof opts.retryable === 'boolean' ? opts.retryable : !!def.retryable;
    this.detail = opts.detail || '';
    this.cause = opts.cause ?? null;
    this.meta = opts.meta || {};
  }

  /** Aynı kodla, kullanıcı mesajı değişmeden, farklı detail/meta */
  withDetail(detail, meta) {
    this.detail = detail || this.detail;
    if (meta) this.meta = { ...this.meta, ...meta };
    return this;
  }

  toJSON() {
    return {
      code: this.code,
      userMessage: this.userMessage,
      severity: this.severity,
      retryable: this.retryable,
      detail: this.detail,
    };
  }
}

export function isAppError(err) {
  return !!err && (err instanceof AppError || err.isAppError === true);
}

export { ERROR_CODES };
