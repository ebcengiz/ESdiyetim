// AI sağlayıcı katmanı — istemci tarafı
//
// Sağlayıcı zinciri (Gemini → Groq → Cohere → Hugging Face; görselde Gemini Vision → Groq
// Vision) artık Supabase Edge Function `ai-proxy` içinde çalışıyor
// (supabase/functions/ai-proxy/index.ts). API anahtarları yalnızca Supabase secrets'ta;
// uygulama paketinde hiçbir AI anahtarı yok. Proxy kullanıcı/gün bazlı tavan uygular.
//
// Kural (değişmedi): sağlayıcı adı, HTTP kodu, sunucu gövdesi yalnızca AppError.detail'de
// (→ console) kalır; kullanıcı errorMessages.js'deki sakin metni görür.

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { assertAIConsent } from '../aiConsentService';
import { AppError, ERROR_CODES, normalizeError } from '../errors';

const PROXY_FUNCTION = 'ai-proxy';
// Sunucu kendi zincirini ~110 sn'de keser; istemci biraz daha uzun bekler.
const TEXT_TIMEOUT_MS = 120000;
const VISION_TIMEOUT_MS = 120000;

/** Proxy'nin döndürebileceği kodlar — tanınmayan her şey AI_UNAVAILABLE'a düşer. */
const PROXY_CODES = new Set([
  ERROR_CODES.AI_NOT_CONFIGURED,
  ERROR_CODES.AI_RATE_LIMIT,
  ERROR_CODES.AI_TIMEOUT,
  ERROR_CODES.AI_UNAVAILABLE,
  ERROR_CODES.AI_EMPTY_RESPONSE,
  ERROR_CODES.AI_CONTENT_BLOCKED,
  ERROR_CODES.AI_IMAGE_INVALID,
  ERROR_CODES.AI_DAILY_LIMIT,
  ERROR_CODES.AUTH_SESSION_REQUIRED,
]);

/** Edge Function'a istek at; başarıda { text, provider } döner, aksi hâlde AppError fırlatır. */
async function invokeProxy(body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let result;
  try {
    result = await supabase.functions.invoke(PROXY_FUNCTION, { body, signal: controller.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === 'AbortError') {
      throw new AppError(ERROR_CODES.AI_TIMEOUT, { detail: `${PROXY_FUNCTION} zaman aşımı`, cause: e });
    }
    throw normalizeError(e, { context: PROXY_FUNCTION });
  }
  clearTimeout(timer);

  const { data, error } = result;
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const response = error.context;
      let code = null;
      try {
        code = (await response.json())?.error;
      } catch {
        /* gövde JSON değil (ör. gateway hatası) */
      }
      const status = response?.status;
      throw new AppError(PROXY_CODES.has(code) ? code : ERROR_CODES.AI_UNAVAILABLE, {
        detail: `${PROXY_FUNCTION} HTTP ${status}${code ? ` ${code}` : ''}`,
        meta: { status },
      });
    }
    if (error?.context?.name === 'AbortError' || error?.name === 'AbortError') {
      throw new AppError(ERROR_CODES.AI_TIMEOUT, { detail: `${PROXY_FUNCTION} zaman aşımı`, cause: error });
    }
    // FunctionsFetchError (ağ) / FunctionsRelayError → ağ veya sunucu kodu
    const n = normalizeError(error.context || error, { context: PROXY_FUNCTION });
    throw n.code === ERROR_CODES.UNKNOWN
      ? new AppError(ERROR_CODES.AI_UNAVAILABLE, { detail: `${PROXY_FUNCTION}: ${error.message}`, cause: error })
      : n;
  }

  const text = typeof data?.text === 'string' ? data.text : '';
  if (!text.trim()) {
    throw new AppError(ERROR_CODES.AI_EMPTY_RESPONSE, { detail: `${PROXY_FUNCTION}: boş yanıt` });
  }
  return { text, provider: data.provider || 'proxy' };
}

// ─── JSON parse yardımcısı ───────────────────────────────────────────────────
export function parseJsonObjectFromLlmText(text) {
  const str = String(text || '').trim();
  try {
    return JSON.parse(str);
  } catch {
    const match = str.match(/\{[\s\S]*\}/);
    if (!match) throw new AppError(ERROR_CODES.AI_PARSE_FAILED, { detail: 'LLM metninde JSON bulunamadı' });
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new AppError(ERROR_CODES.AI_PARSE_FAILED, { detail: 'LLM JSON parse edilemedi' });
    }
  }
}

function mealCalorieResultFromParsed(parsed, provider) {
  const estimatedCalories = Number(parsed.estimatedCalories);
  if (Number.isNaN(estimatedCalories)) throw new AppError(ERROR_CODES.AI_PARSE_FAILED, { detail: `${provider}: estimatedCalories sayı değil` });
  return {
    success: true,
    mealName: String(parsed.mealName || 'Yemek'),
    estimatedCalories,
    confidence: parsed.confidence || 'orta',
    items: Array.isArray(parsed.items) ? parsed.items : [],
    notes: String(parsed.notes || ''),
    provider,
  };
}

// ─── Metin ───────────────────────────────────────────────────────────────────
/** Metin üretimi — sunucudaki sağlayıcı zinciri. { text, provider } döner. */
export async function callTextWithProviderChain(prompt) {
  await assertAIConsent();
  return invokeProxy({ kind: 'text', prompt }, TEXT_TIMEOUT_MS);
}

// ─── Görsel ──────────────────────────────────────────────────────────────────
/** Fotoğraftan kalori — sunucuda Gemini Vision, olmazsa Groq Vision. */
export async function callMealCalorieVisionChain({ cleanMime, cleanB64, prompt }) {
  await assertAIConsent();
  const { text, provider } = await invokeProxy(
    { kind: 'vision', prompt, mime: cleanMime, b64: cleanB64 },
    VISION_TIMEOUT_MS
  );
  return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(text), provider);
}
