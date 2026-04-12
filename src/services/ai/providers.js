// AI Provider implementasyonları
// Her provider ayrı bir fetch fonksiyonu; aiService.js orkestrasyonu yapar.

const HUGGINGFACE_API_KEY = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || '';
const GROQ_API_KEY        = process.env.EXPO_PUBLIC_GROQ_API_KEY        || '';
const COHERE_API_KEY      = process.env.EXPO_PUBLIC_COHERE_API_KEY      || '';
const GEMINI_API_KEY      = process.env.EXPO_PUBLIC_GEMINI_API_KEY      || '';

const GROQ_VISION_MODEL   = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TEXT_MODEL     = 'llama-3.1-8b-instant';

/**
 * Google AI Studio (aistudio.google.com/apikey) — generativelanguage.googleapis.com
 * Kısa adlar (ör. gemini-2.0-flash) çoğu projede 404 verir; sürüm ekli / güncel kimlikler kullanılmalı.
 * @see https://ai.google.dev/gemini-api/docs/models
 * Not: `gemini-1.5-flash` (takma ad) bazı projelerde v1 ile 404 verir; sürümlü ad kullanın.
 */
const GEMINI_TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash-002',
];

/** Çok modlu (metin+görsel) — Flash ailesi (generateContent + görüntü girişi) */
const GEMINI_VISION_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash-002',
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
    if (!match) throw new Error('Besin verisi alınamadı. Lütfen tekrar deneyin.');
    try {
      return JSON.parse(match[0]);
    } catch {
      throw new Error('Besin verisi alınamadı. Lütfen tekrar deneyin.');
    }
  }
}

function mealCalorieResultFromParsed(parsed, provider) {
  const estimatedCalories = Number(parsed.estimatedCalories);
  if (Number.isNaN(estimatedCalories)) throw new Error('Tahmini kalori sayısı alınamadı.');
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
  if (!HUGGINGFACE_API_KEY) throw new Error('Hugging Face API key tanımlı değil');
  const response = await fetch(
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
  if (!response.ok) throw new Error(`Hugging Face API hatası (${response.status})`);
  const data = await response.json();
  if (data[0]?.generated_text) return data[0].generated_text;
  if (data.error) throw new Error(data.error);
  throw new Error('Yanıt alınamadı');
}

export async function callGroq(prompt) {
  if (!GROQ_API_KEY) throw new Error('Groq API key tanımlı değil');
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
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Groq zaman aşımı, lütfen tekrar deneyin.');
    throw new Error('Ağ bağlantısı kurulamadı, internet bağlantınızı kontrol edin.');
  }
  clearTimeout(timer);
  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('AI istek limiti doldu, lütfen biraz bekleyin.');
    if (status === 401) throw new Error('AI API anahtarı geçersiz.');
    throw new Error(`Groq API hatası (${status})`);
  }
  const data = await response.json();
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
  throw new Error('AI yanıt üretemedi.');
}

export async function callCohere(prompt) {
  if (!COHERE_API_KEY) throw new Error('Cohere API key tanımlı değil');
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
    if (e.name === 'AbortError') throw new Error('Cohere zaman aşımı.');
    throw e;
  }
  clearTimeout(timer);
  if (!response.ok) {
    if (response.status === 429) throw new Error('AI istek limiti doldu, lütfen biraz bekleyin.');
    throw new Error(`Cohere API hatası (${response.status})`);
  }
  const data = await response.json();
  if (data.generations?.[0]?.text) return data.generations[0].text;
  throw new Error('Yanıt alınamadı');
}

export async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key tanımlı değil');
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
  };
  let lastErr = 'Gemini yanıt veremedi.';
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
        lastErr = errDetail || `Gemini API hatası (${response.status})`;
        if (response.status === 429 || response.status === 404) continue;
        throw new Error(lastErr.slice(0, 200) || `Gemini API hatası (${response.status})`);
      }
      let data;
      try {
        data = await response.json();
      } catch {
        continue;
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = 'Gemini boş yanıt döndürdü.';
    } catch (e) {
      if (e.name === 'AbortError') {
        lastErr = 'Gemini zaman aşımı.';
        continue;
      }
      if (e.message?.includes('Network request failed')) {
        lastErr = 'Gemini ağ hatası.';
        continue;
      }
      throw e;
    }
  }
  if (/429|Resource exhausted|quota/i.test(String(lastErr))) {
    throw new Error('AI istek limiti doldu, lütfen biraz bekleyin.');
  }
  throw new Error(
    `${lastErr} — Model listesi güncellenemedi; https://ai.google.dev/gemini-api/docs/models adresinden geçerli model adlarını kontrol edin.`
  );
}

// ─── Görsel analiz ───────────────────────────────────────────────────────────
export async function callGroqVision(dataUrl, prompt) {
  if (!GROQ_API_KEY) throw new Error('Groq API key tanımlı değil');
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
    if (e.name === 'AbortError') throw new Error('Groq görsel zaman aşımı.');
    throw e;
  }
  clearTimeout(timer);
  const rawText = await response.text();
  if (!response.ok) {
    if (response.status === 429) throw new Error('AI istek limiti doldu, lütfen biraz bekleyin.');
    if (response.status === 401) throw new Error('Groq API anahtarı geçersiz.');
    throw new Error(`Groq görsel API hatası (${response.status}): ${rawText.slice(0, 400)}`);
  }
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Groq yanıtı okunamadı.');
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq boş yanıt verdi.');
  return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(content), 'groq-vision');
}

export async function callGeminiVision(cleanMime, cleanB64, prompt) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API anahtarı yok. .env içinde EXPO_PUBLIC_GEMINI_API_KEY tanımlayın.');
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
      if (e.name === 'AbortError') { lastErr = 'Gemini görsel zaman aşımı.'; continue; }
      if (e.message?.includes('Network request failed')) { lastErr = 'Gemini görsel ağ hatası.'; continue; }
      throw e;
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
      throw new Error(`Gemini API (${response.status}). ${lastErr || 'Anahtar veya kota kontrol edin.'}`);
    }
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      lastErr = 'Gemini yanıtı okunamadı.';
      continue;
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    if (!text) {
      const reason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
      throw new Error(reason ? `İstek reddedildi: ${reason}` : 'Model yanıt üretemedi.');
    }
    return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(text), 'gemini-vision');
  }
  // Tüm Gemini vision modelleri başarısız — callMealCalorieVisionChain Groq'a geçer
  if (lastStatus === 429 || /quota|exhausted/i.test(String(lastErr))) {
    throw new Error('Gemini görsel kota doldu.');
  }
  throw new Error(`Gemini görsel başarısız (${lastStatus || '?'}). ${lastErr || 'Bilinmeyen hata.'}`);
}

// ─── Provider seçici ─────────────────────────────────────────────────────────
export const AVAILABLE_PROVIDERS = ['huggingface', 'groq', 'cohere', 'gemini'];

export async function callProvider(providerName, prompt) {
  switch (providerName) {
    case 'huggingface': return callHuggingFace(prompt);
    case 'groq':        return callGroq(prompt);
    case 'cohere':      return callCohere(prompt);
    case 'gemini':      return callGemini(prompt);
    default:            throw new Error(`Geçersiz AI provider: ${providerName}`);
  }
}

/**
 * Ücretsiz katmanlar: kota dolunca sıradakine geçer.
 * Sıra: Gemini → Groq → Cohere → Hugging Face (yalnızca ilgili EXPO_PUBLIC_* anahtarı tanımlıysa).
 */
export async function callTextWithProviderChain(prompt) {
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
      lastError = new Error(`${step.id} boş yanıt döndürdü.`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message || '';
      console.warn(`⚠️ AI [${step.id}] atlandı:`, msg);
    }
  }

  if (!tried.length) {
    throw new Error(
      'Hiçbir AI anahtarı tanımlı değil. .env içinde en az biri: EXPO_PUBLIC_GEMINI_API_KEY, EXPO_PUBLIC_GROQ_API_KEY, EXPO_PUBLIC_COHERE_API_KEY, EXPO_PUBLIC_HUGGINGFACE_API_KEY'
    );
  }
  throw lastError || new Error('Tüm AI sağlayıcıları başarısız oldu.');
}

/**
 * Fotoğraftan kalori: önce Gemini Vision, kota/hata olursa Groq Vision.
 */
export async function callMealCalorieVisionChain({ cleanMime, cleanB64, dataUrl, prompt }) {
  let lastError = null;

  if (GEMINI_API_KEY) {
    try {
      return await callGeminiVision(cleanMime, cleanB64, prompt);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn('⚠️ Gemini vision (kalori) atlandı:', lastError.message);
    }
  }

  if (GROQ_API_KEY) {
    try {
      return await callGroqVision(dataUrl, prompt);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn('⚠️ Groq vision (kalori) atlandı:', lastError.message);
    }
  }

  if (lastError) throw lastError;
  throw new Error(
    'Görsel analiz için EXPO_PUBLIC_GEMINI_API_KEY veya EXPO_PUBLIC_GROQ_API_KEY tanımlayın.'
  );
}

export { GROQ_API_KEY, GEMINI_API_KEY, COHERE_API_KEY, HUGGINGFACE_API_KEY };
