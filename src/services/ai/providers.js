// AI Provider implementasyonları
// Her provider ayrı bir fetch fonksiyonu; aiService.js orkestrasyonu yapar.

import { assertAIConsent } from '../aiConsentService';
import { AppError, ERROR_CODES, normalizeError } from '../errors';

// ─── Hata yardımcıları ───────────────────────────────────────────────────────
// Kural: sağlayıcı adı, HTTP kodu, env değişkeni, API gövdesi vb. teknik ayrıntı
// yalnızca AppError.detail'de (→ console) kalır; kullanıcı errorMessages.js'deki
// sakin metni görür.

/** Env anahtarı tanımsız — kullanıcı için "kullanılamıyor", log için hangi anahtar */
function notConfigured(envName) {
  return new AppError(ERROR_CODES.AI_NOT_CONFIGURED, { detail: `${envName} tanımlı değil` });
}

/** HTTP yanıt hatası → kod eşlemesi */
function httpError(provider, status, body = '') {
  const detail = `${provider} HTTP ${status}${body ? ': ' + String(body).slice(0, 300) : ''}`;
  if (status === 429) return new AppError(ERROR_CODES.AI_RATE_LIMIT, { detail, meta: { provider, status } });
  if (status === 401 || status === 403) return new AppError(ERROR_CODES.AI_NOT_CONFIGURED, { detail, meta: { provider, status } });
  return new AppError(ERROR_CODES.AI_UNAVAILABLE, { detail, meta: { provider, status } });
}

/** fetch() fırlattı (ağ / abort) */
function fetchError(provider, e) {
  if (e?.name === 'AbortError') {
    return new AppError(ERROR_CODES.AI_TIMEOUT, { detail: `${provider} zaman aşımı`, cause: e });
  }
  const n = normalizeError(e, { context: provider });
  // Ağ dışı bilinmeyen bir şeyse yine de AI kapsamında raporla
  return n.code === ERROR_CODES.UNKNOWN
    ? new AppError(ERROR_CODES.AI_UNAVAILABLE, { detail: `${provider}: ${e?.message || e}`, cause: e })
    : n;
}

function emptyResponse(provider, why = 'boş yanıt') {
  return new AppError(ERROR_CODES.AI_EMPTY_RESPONSE, { detail: `${provider}: ${why}`, meta: { provider } });
}

const HUGGINGFACE_API_KEY = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || '';
const GROQ_API_KEY        = process.env.EXPO_PUBLIC_GROQ_API_KEY        || '';
const COHERE_API_KEY      = process.env.EXPO_PUBLIC_COHERE_API_KEY      || '';
const GEMINI_API_KEY      = process.env.EXPO_PUBLIC_GEMINI_API_KEY      || '';

// 2026-09: Groq, Llama ailesini kaldırdı (llama-3.1-8b-instant / llama-4-scout → 404).
// Metin: gpt-oss-20b (reasoning modeli; reasoning_effort=low, content boş kalmasın diye).
// Görsel: Groq'ta artık vision modeli yok — zincir Gemini vision'a güvenir, bu yalnızca son çare.
const GROQ_VISION_MODEL   = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TEXT_MODEL     = 'openai/gpt-oss-20b';

/**
 * Google AI Studio (aistudio.google.com/apikey) — generativelanguage.googleapis.com
 * Kısa adlar (ör. gemini-2.0-flash) çoğu projede 404 verir; sürüm ekli / güncel kimlikler kullanılmalı.
 * @see https://ai.google.dev/gemini-api/docs/models
 * Not: `gemini-1.5-flash` (takma ad) bazı projelerde v1 ile 404 verir; sürümlü ad kullanın.
 */
// Ücretsiz kota model başına (tek anahtar, tüm kullanıcılar) — 429'da sıradakine geçilir,
// bu yüzden liste uzun tutuluyor. 2026-09 doğrulandı: hepsi 200 döndü.
const GEMINI_TEXT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
];

/** Çok modlu (metin+görsel) — Flash ailesi (generateContent + görüntü girişi) */
const GEMINI_VISION_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
];

/**
 * v1beta 404 dönerse aynı model için v1 dene (bazı anahtar/konfigürasyonlarda yol farkı).
 */
async function geminiGenerateContentFetch(model, body, signal) {
  const key = encodeURIComponent(GEMINI_API_KEY);
  const bases = ['v1beta', 'v1'];
  let last = null;
  for (const ver of bases) {
    const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    last = response;
    if (response.ok) return response;
    if (response.status !== 404) return response;
  }
  return last;
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

// ─── Metin üretimi ───────────────────────────────────────────────────────────
export async function callHuggingFace(prompt) {
  if (!HUGGINGFACE_API_KEY) throw notConfigured('EXPO_PUBLIC_HUGGINGFACE_API_KEY');
  let response;
  try {
    response = await fetch(
      'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 1536, temperature: 0.7, top_p: 0.9, return_full_text: false },
        }),
      }
    );
  } catch (e) {
    throw fetchError('huggingface', e);
  }
  if (!response.ok) throw httpError('huggingface', response.status);
  const data = await response.json();
  if (data[0]?.generated_text) return data[0].generated_text;
  if (data.error) throw emptyResponse('huggingface', String(data.error));
  throw emptyResponse('huggingface');
}

export async function callGroq(prompt) {
  if (!GROQ_API_KEY) throw notConfigured('EXPO_PUBLIC_GROQ_API_KEY');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: 'Sen bir diyet ve sağlık danışmanısın. Türkçe, samimi ve cesaretlendirici bir dille tavsiye veriyorsun.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        /* 512 Türkçe uzun yanıtta ortada kesiyordu; promptlar 250–350+ kelime isteyebiliyor */
        max_tokens: 4096,
        // gpt-oss reasoning modeli: düşük efor → düşünme token'ı azalır, content boş kalmaz
        reasoning_effort: 'low',
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw fetchError('groq', e);
  }
  clearTimeout(timer);
  if (!response.ok) throw httpError('groq', response.status);
  const data = await response.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  throw emptyResponse('groq');
}

export async function callCohere(prompt) {
  if (!COHERE_API_KEY) throw notConfigured('EXPO_PUBLIC_COHERE_API_KEY');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${COHERE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'command', prompt, max_tokens: 2048, temperature: 0.7 }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw fetchError('cohere', e);
  }
  clearTimeout(timer);
  if (!response.ok) throw httpError('cohere', response.status);
  const data = await response.json();
  if (data.generations?.[0]?.text) return data.generations[0].text;
  throw emptyResponse('cohere');
}

export async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw notConfigured('EXPO_PUBLIC_GEMINI_API_KEY');
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
  };
  // lastErr: yalnızca log için (kullanıcıya gitmez); lastStatus: kod eşlemesi için
  let lastErr = 'Gemini yanıt veremedi.';
  let lastStatus = 0;
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90000);
      const response = await geminiGenerateContentFetch(model, body, controller.signal);
      clearTimeout(timer);
      if (!response.ok) {
        let errDetail = '';
        try {
          const j = await response.clone().json();
          errDetail = j?.error?.message || '';
        } catch {
          errDetail = await response.text().catch(() => '');
        }
        lastErr = `${model}: ${errDetail || 'HTTP ' + response.status}`;
        lastStatus = response.status;
        if (response.status === 429 || response.status === 404) continue;
        throw httpError('gemini', response.status, errDetail);
      }
      let data;
      try {
        data = await response.json();
      } catch {
        continue;
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = `${model}: boş yanıt`;
    } catch (e) {
      if (e instanceof AppError) throw e;
      if (e.name === 'AbortError') {
        lastErr = `${model}: zaman aşımı`;
        continue;
      }
      if (e.message?.includes('Network request failed')) {
        lastErr = `${model}: ağ hatası`;
        continue;
      }
      throw fetchError('gemini', e);
    }
  }
  if (lastStatus === 429 || /Resource exhausted|quota/i.test(String(lastErr))) {
    throw new AppError(ERROR_CODES.AI_RATE_LIMIT, { detail: `gemini: ${lastErr}`, meta: { provider: 'gemini', status: 429 } });
  }
  if (lastStatus === 404) {
    // Model listesi eskimiş — geliştirici notu yalnızca log'a
    throw new AppError(ERROR_CODES.AI_UNAVAILABLE, {
      detail: `gemini: ${lastErr} — model listesi güncel değil, bkz. https://ai.google.dev/gemini-api/docs/models`,
      meta: { provider: 'gemini', status: 404 },
    });
  }
  throw new AppError(ERROR_CODES.AI_UNAVAILABLE, { detail: `gemini: ${lastErr}`, meta: { provider: 'gemini', status: lastStatus } });
}

// ─── Görsel analiz ───────────────────────────────────────────────────────────
export async function callGroqVision(dataUrl, prompt) {
  if (!GROQ_API_KEY) throw notConfigured('EXPO_PUBLIC_GROQ_API_KEY');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
        temperature: 0.35,
        max_completion_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw fetchError('groq-vision', e);
  }
  clearTimeout(timer);
  const rawText = await response.text();
  if (!response.ok) throw httpError('groq-vision', response.status, rawText);
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new AppError(ERROR_CODES.AI_PARSE_FAILED, { detail: 'groq-vision: yanıt JSON değil' });
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw emptyResponse('groq-vision');
  return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(content), 'groq-vision');
}

export async function callGeminiVision(cleanMime, cleanB64, prompt) {
  if (!GEMINI_API_KEY) throw notConfigured('EXPO_PUBLIC_GEMINI_API_KEY');
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: cleanMime, data: cleanB64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.35, maxOutputTokens: 2048 },
  };
  let lastErr = '';
  let lastStatus = 0;
  for (const model of GEMINI_VISION_MODELS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await geminiGenerateContentFetch(model, body, controller.signal);
      clearTimeout(timer);
    } catch (e) {
      clearTimeout(timer);
      // Ağ hatası veya zaman aşımı → bu modeli atla, bir sonrakini dene
      if (e.name === 'AbortError') { lastErr = `${model}: zaman aşımı`; continue; }
      if (e.message?.includes('Network request failed')) { lastErr = `${model}: ağ hatası`; continue; }
      throw fetchError('gemini-vision', e);
    }
    const rawText = await response.text();
    lastStatus = response.status;
    if (!response.ok) {
      try {
        const j = JSON.parse(rawText);
        lastErr = j?.error?.message || rawText;
      } catch {
        lastErr = rawText;
      }
      // Kota veya model bulunamadı → sonraki modeli dene
      if (response.status === 429 || response.status === 404) continue;
      throw httpError('gemini-vision', response.status, lastErr);
    }
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      lastErr = `${model}: yanıt JSON değil`;
      continue;
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    if (!text) {
      const reason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
      if (reason && /SAFETY|BLOCK|PROHIBITED|RECITATION/i.test(String(reason))) {
        throw new AppError(ERROR_CODES.AI_CONTENT_BLOCKED, { detail: `gemini-vision: ${reason}` });
      }
      throw emptyResponse('gemini-vision', reason ? `finishReason=${reason}` : 'metin yok');
    }
    return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(text), 'gemini-vision');
  }
  // Tüm Gemini vision modelleri başarısız — callMealCalorieVisionChain Groq'a geçer
  if (lastStatus === 429 || /quota|exhausted/i.test(String(lastErr))) {
    throw new AppError(ERROR_CODES.AI_RATE_LIMIT, { detail: `gemini-vision: ${lastErr}`, meta: { provider: 'gemini-vision', status: 429 } });
  }
  throw new AppError(ERROR_CODES.AI_UNAVAILABLE, {
    detail: `gemini-vision (${lastStatus || '?'}): ${lastErr || 'bilinmeyen'}`,
    meta: { provider: 'gemini-vision', status: lastStatus },
  });
}

// ─── Provider seçici ─────────────────────────────────────────────────────────
export const AVAILABLE_PROVIDERS = ['huggingface', 'groq', 'cohere', 'gemini'];

export async function callProvider(providerName, prompt) {
  switch (providerName) {
    case 'huggingface': return callHuggingFace(prompt);
    case 'groq':        return callGroq(prompt);
    case 'cohere':      return callCohere(prompt);
    case 'gemini':      return callGemini(prompt);
    default:            throw new AppError(ERROR_CODES.AI_NOT_CONFIGURED, { detail: `Geçersiz AI provider: ${providerName}` });
  }
}

/**
 * Ücretsiz katmanlar: kota dolunca sıradakine geçer.
 * Sıra: Gemini → Groq → Cohere → Hugging Face (yalnızca ilgili EXPO_PUBLIC_* anahtarı tanımlıysa).
 */
export async function callTextWithProviderChain(prompt) {
  await assertAIConsent();
  const steps = [
    { id: 'gemini', hasKey: !!GEMINI_API_KEY, run: () => callGemini(prompt) },
    { id: 'groq', hasKey: !!GROQ_API_KEY, run: () => callGroq(prompt) },
    { id: 'cohere', hasKey: !!COHERE_API_KEY, run: () => callCohere(prompt) },
    { id: 'huggingface', hasKey: !!HUGGINGFACE_API_KEY, run: () => callHuggingFace(prompt) },
  ];

  let lastError = null;
  const tried = [];
  for (const step of steps) {
    if (!step.hasKey) continue;
    tried.push(step.id);
    try {
      const text = await step.run();
      if (text && String(text).trim()) {
        return { text: String(text), provider: step.id };
      }
      lastError = emptyResponse(step.id);
    } catch (e) {
      lastError = normalizeError(e, { context: `ai.${step.id}` });
      console.warn(`⚠️ AI [${step.id}] atlandı:`, lastError.code, lastError.detail || lastError.message);
    }
  }

  if (!tried.length) {
    throw new AppError(ERROR_CODES.AI_NOT_CONFIGURED, {
      detail: 'Hiçbir AI anahtarı tanımlı değil (.env: EXPO_PUBLIC_GEMINI_API_KEY | GROQ | COHERE | HUGGINGFACE)',
    });
  }
  throw lastError || new AppError(ERROR_CODES.AI_UNAVAILABLE, { detail: 'Tüm AI sağlayıcıları başarısız oldu' });
}

/**
 * Fotoğraftan kalori: önce Gemini Vision, kota/hata olursa Groq Vision.
 */
export async function callMealCalorieVisionChain({ cleanMime, cleanB64, dataUrl, prompt }) {
  await assertAIConsent();
  let lastError = null;

  if (GEMINI_API_KEY) {
    try {
      return await callGeminiVision(cleanMime, cleanB64, prompt);
    } catch (e) {
      lastError = normalizeError(e, { context: 'ai.gemini-vision' });
      console.warn('⚠️ Gemini vision (kalori) atlandı:', lastError.code, lastError.detail || lastError.message);
    }
  }

  if (GROQ_API_KEY) {
    try {
      return await callGroqVision(dataUrl, prompt);
    } catch (e) {
      lastError = normalizeError(e, { context: 'ai.groq-vision' });
      console.warn('⚠️ Groq vision (kalori) atlandı:', lastError.code, lastError.detail || lastError.message);
    }
  }

  if (lastError) throw lastError;
  throw new AppError(ERROR_CODES.AI_NOT_CONFIGURED, {
    detail: 'Görsel analiz için EXPO_PUBLIC_GEMINI_API_KEY veya EXPO_PUBLIC_GROQ_API_KEY gerekli',
  });
}

export { GROQ_API_KEY, GEMINI_API_KEY, COHERE_API_KEY, HUGGINGFACE_API_KEY };
