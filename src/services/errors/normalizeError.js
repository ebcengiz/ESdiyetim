// Ham hata → AppError çevirici (tek giriş noktası).
//
// Kaynağa göre tanıma sırası:
//   1. Zaten AppError ise dokunma
//   2. AI onayı (AIConsentRequiredError)
//   3. Ağ / zaman aşımı (fetch, DNS, AbortError, Supabase "fetch failed")
//   4. Supabase Auth (GoTrue) mesajları
//   5. PostgREST / Postgres kodları
//   6. expo-iap
//   7. Bilinmeyen → UNKNOWN
//
// Buradan çıkan `userMessage` her zaman errorMessages.js sözlüğünden gelir;
// ham `error.message` hiçbir zaman kullanıcı mesajı olarak geçirilmez.

import { AppError, isAppError, ERROR_CODES } from './AppError';
import { getConnectionState } from './connectivity';

const NETWORK_RX =
  /network request failed|fetch failed|failed to fetch|networkerror|ENOTFOUND|ECONNREFUSED|ECONNRESET|ENETUNREACH|ETIMEDOUT|NSURLErrorDomain|the internet connection appears to be offline|could not connect to the server|dns|getaddrinfo|socket hang up|load failed/i;
const TIMEOUT_RX = /timeout|timed out|zaman aşımı/i;
const SERVER_RX = /\b(500|502|503|504)\b|bad gateway|service unavailable|gateway timeout|internal server error/i;

function rawMessage(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  return String(err.message || err.error_description || err.error || err.msg || '');
}

function rawStatus(err) {
  const s = err?.status ?? err?.statusCode ?? err?.response?.status ?? err?.meta?.status;
  return Number.isFinite(Number(s)) ? Number(s) : null;
}

/** Supabase Auth (GoTrue) hata mesajlarını tanır */
function fromSupabaseAuth(msg, status) {
  if (/invalid login credentials|invalid_credentials|invalid grant/i.test(msg))
    return ERROR_CODES.AUTH_INVALID_CREDENTIALS;
  if (/email not confirmed|email_not_confirmed/i.test(msg))
    return ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED;
  if (/already registered|user_already_exists|already been registered|already exists/i.test(msg))
    return ERROR_CODES.AUTH_ALREADY_REGISTERED;
  if (/password should be at least|weak_password|password is too short/i.test(msg))
    return ERROR_CODES.AUTH_WEAK_PASSWORD;
  if (/invalid email|unable to validate email|email address .* is invalid|validation_failed/i.test(msg))
    return ERROR_CODES.AUTH_INVALID_EMAIL;
  if (/rate limit|too many requests|over_email_send_rate_limit|over_request_rate_limit/i.test(msg) || status === 429)
    return ERROR_CODES.AUTH_RATE_LIMIT;
  if (/invalid refresh token|refresh token not found|refresh_token_not_found|jwt expired|session_not_found|not authenticated/i.test(msg))
    return ERROR_CODES.AUTH_SESSION_EXPIRED;
  return null;
}

/** PostgREST / Postgres hata kodları */
function fromPostgrest(err, msg) {
  const code = String(err?.code || '');
  if (code === '23505' || /duplicate key|unique constraint/i.test(msg)) return ERROR_CODES.DB_DUPLICATE;
  if (code === 'PGRST116') return ERROR_CODES.DB_NOT_FOUND;
  if (code === '42501' || /row-level security|permission denied|violates row-level/i.test(msg))
    return ERROR_CODES.DB_PERMISSION;
  if (/^PGRST\d+$/.test(code) || /^\d{5}$/.test(code)) return ERROR_CODES.DB_ERROR;
  return null;
}

/** expo-iap / StoreKit / Play Billing */
function fromIAP(err, msg) {
  const code = String(err?.code || '');
  if (code === 'E_USER_CANCELLED' || /user cancel|cancelled|canceled/i.test(msg)) return ERROR_CODES.IAP_CANCELLED;
  if (/cannot find native module|unavailabilityerror|not available|E_IAP_NOT_AVAILABLE|E_NOT_PREPARED|E_SERVICE_ERROR|billing unavailable/i.test(msg) || /E_NOT_PREPARED|E_SERVICE_ERROR|E_IAP_NOT_AVAILABLE/.test(code))
    return ERROR_CODES.IAP_UNAVAILABLE;
  if (/^E_/.test(code) || /storekit|skerror|purchase/i.test(msg)) return ERROR_CODES.IAP_FAILED;
  return null;
}

/**
 * @param {unknown} err
 * @param {object} [opts]
 * @param {string} [opts.context]  Log etiketi (ör. 'weightService.create')
 * @param {string} [opts.fallbackCode]  Tanınmayan hata için UNKNOWN yerine kullanılacak kod
 * @returns {AppError}
 */
export function normalizeError(err, { context = '', fallbackCode = ERROR_CODES.UNKNOWN } = {}) {
  if (isAppError(err)) return err;

  const msg = rawMessage(err);
  const status = rawStatus(err);
  const name = String(err?.name || '');
  let code = null;

  // 2. AI onayı
  if (err?.code === 'AI_CONSENT_REQUIRED' || name === 'AIConsentRequiredError') {
    code = ERROR_CODES.AI_CONSENT_REQUIRED;
  }
  // 3. Ağ / zaman aşımı
  else if (name === 'AbortError' || TIMEOUT_RX.test(msg)) {
    code = ERROR_CODES.TIMEOUT;
  } else if (NETWORK_RX.test(msg) || name === 'TypeError' && /fetch/i.test(msg)) {
    // Cihaz gerçekten çevrimdışıysa "offline", değilse (DNS/502 → Supabase paused vb.) "sunucu"
    code = getConnectionState().isConnected === false
      ? ERROR_CODES.NETWORK_OFFLINE
      : ERROR_CODES.SERVER_UNAVAILABLE;
  } else if (SERVER_RX.test(msg) || (status !== null && status >= 500)) {
    code = ERROR_CODES.SERVER_UNAVAILABLE;
  }
  // 4–6. Kaynak bazlı
  else {
    code = fromSupabaseAuth(msg, status) || fromPostgrest(err, msg) || fromIAP(err, msg);
  }

  if (!code) code = fallbackCode;

  const detail = [
    context && `[${context}]`,
    name && name !== 'Error' && name,
    status !== null && `status=${status}`,
    err?.code && `code=${err.code}`,
    msg && msg.slice(0, 300),
  ]
    .filter(Boolean)
    .join(' ');

  return new AppError(code, { cause: err, detail, meta: { status, rawCode: err?.code || null } });
}

/** Postgres unique ihlali (23505) — servislerde "bu kayıt zaten var" dalı için. */
export function isUniqueViolation(err) {
  return fromPostgrest(err, rawMessage(err)) === ERROR_CODES.DB_DUPLICATE;
}

/** ON CONFLICT hedefiyle eşleşen unique kısıt yok (42P10) — eski şemalarda upsert yerine insert'e düşmek için. */
export function isMissingConflictTarget(err) {
  return String(err?.code || '') === '42P10' || /no unique or exclusion constraint/i.test(rawMessage(err));
}

/** PostgREST: RPC fonksiyonu veritabanında yok (migration henüz uygulanmamış). */
export function isMissingRpc(err) {
  return String(err?.code || '') === 'PGRST202';
}

/** Kısa yol: sadece kullanıcı mesajı */
export function getUserMessage(err, fallbackCode) {
  return normalizeError(err, { fallbackCode }).userMessage;
}

/**
 * Hata loglama — ağ/kota/onay gibi beklenen durumlar WARN, gerisi ERROR.
 * (Metro günlüğünü kirletmemek için; CLAUDE.md §5 kuralı korunur.)
 */
const WARN_CODES = new Set([
  ERROR_CODES.NETWORK_OFFLINE,
  ERROR_CODES.SERVER_UNAVAILABLE,
  ERROR_CODES.TIMEOUT,
  ERROR_CODES.AI_RATE_LIMIT,
  ERROR_CODES.AI_TIMEOUT,
  ERROR_CODES.AI_CONSENT_REQUIRED,
  ERROR_CODES.AI_DAILY_LIMIT,
  ERROR_CODES.AUTH_RATE_LIMIT,
  ERROR_CODES.AUTH_INVALID_CREDENTIALS,
  ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED,
  ERROR_CODES.AUTH_ALREADY_REGISTERED,
  ERROR_CODES.AUTH_SESSION_REQUIRED,
  ERROR_CODES.AUTH_SESSION_EXPIRED,
  ERROR_CODES.DB_DUPLICATE,
  ERROR_CODES.DB_DUPLICATE_DATE,
  ERROR_CODES.DB_NOT_FOUND,
  ERROR_CODES.IAP_CANCELLED,
  ERROR_CODES.IAP_UNAVAILABLE,
  ERROR_CODES.AD_UNAVAILABLE,
  ERROR_CODES.VALIDATION,
]);

export function logError(context, err) {
  const appErr = normalizeError(err, { context });
  // Sessiz durumlar — kullanıcı akışının parçası, log gürültüsü yapma
  if (appErr.code === ERROR_CODES.IAP_CANCELLED || appErr.code === ERROR_CODES.AI_CONSENT_REQUIRED) return appErr;
  const line = `${context ? context + ' → ' : ''}${appErr.code}${appErr.detail ? ' | ' + appErr.detail : ''}`;
  if (WARN_CODES.has(appErr.code)) console.warn('⚠️', line);
  else console.error('💥', line, appErr.cause instanceof Error ? appErr.cause.stack : '');
  return appErr;
}
