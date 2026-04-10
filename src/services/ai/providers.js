// AI Provider implementasyonları
// Her provider ayrı bir fetch fonksiyonu; aiService.js orkestrasyonu yapar.

const HUGGINGFACE_API_KEY = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || '';
const GROQ_API_KEY        = process.env.EXPO_PUBLIC_GROQ_API_KEY        || '';
const COHERE_API_KEY      = process.env.EXPO_PUBLIC_COHERE_API_KEY      || '';
const GEMINI_API_KEY      = process.env.EXPO_PUBLIC_GEMINI_API_KEY      || '';

const GROQ_VISION_MODEL   = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TEXT_MODEL     = 'llama-3.1-8b-instant';

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
        parameters: { max_new_tokens: 512, temperature: 0.7, top_p: 0.9, return_full_text: false },
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
  const timer = setTimeout(() => controller.abort(), 15000);
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
        max_tokens: 512,
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
  const response = await fetch('https://api.cohere.ai/v1/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${COHERE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'command', prompt, max_tokens: 512, temperature: 0.7 }),
  });
  if (!response.ok) throw new Error(`Cohere API hatası (${response.status})`);
  const data = await response.json();
  if (data.generations?.[0]?.text) return data.generations[0].text;
  throw new Error('Yanıt alınamadı');
}

export async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API key tanımlı değil');
  // gemini-pro deprecated — güncel modelleri sırayla dene
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash-002', 'gemini-1.5-flash'];
  let lastErr = 'Gemini yanıt veremedi.';
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        lastErr = `Gemini API hatası (${response.status})`;
        if (response.status === 429 || response.status === 404) continue;
        throw new Error(lastErr);
      }
      let data;
      try { data = await response.json(); } catch { continue; }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = 'Gemini boş yanıt döndürdü.';
    } catch (e) {
      if (e.name === 'AbortError') { lastErr = 'Gemini zaman aşımı.'; continue; }
      if (e.message?.includes('Network request failed')) { lastErr = 'Gemini ağ hatası.'; continue; }
      throw e;
    }
  }
  throw new Error(lastErr);
}

// ─── Görsel analiz ───────────────────────────────────────────────────────────
export async function callGroqVision(dataUrl, prompt) {
  if (!GROQ_API_KEY) throw new Error('Groq API key tanımlı değil');
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      temperature: 0.35,
      max_completion_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });
  const rawText = await response.text();
  if (!response.ok) throw new Error(`Groq ${response.status}: ${rawText.slice(0, 400)}`);
  const data = JSON.parse(rawText);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq boş yanıt verdi.');
  return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(content), 'groq-vision');
}

export async function callGeminiVision(cleanMime, cleanB64, prompt) {
  if (!GEMINI_API_KEY) throw new Error('Gemini API anahtarı yok. .env içinde EXPO_PUBLIC_GEMINI_API_KEY tanımlayın.');
  const visionModels = ['gemini-2.0-flash', 'gemini-1.5-flash-002', 'gemini-2.5-flash'];
  const body = {
    contents: [{ parts: [{ inline_data: { mime_type: cleanMime, data: cleanB64 } }, { text: prompt }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 1024 },
  };
  let lastErr = '';
  let lastStatus = 0;
  for (const model of visionModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const rawText = await response.text();
    lastStatus = response.status;
    if (!response.ok) {
      try { const e = JSON.parse(rawText); lastErr = e?.error?.message || rawText; } catch { lastErr = rawText; }
      if (response.status === 404 || response.status === 429) continue;
      throw new Error(`Gemini API (${response.status}). ${lastErr || 'Anahtar veya kota kontrol edin.'}`);
    }
    let data;
    try { data = JSON.parse(rawText); } catch { throw new Error('Sunucu yanıtı okunamadı.'); }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    if (!text) {
      const reason = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;
      throw new Error(reason ? `İstek reddedildi: ${reason}` : 'Model yanıt üretemedi.');
    }
    return mealCalorieResultFromParsed(parseJsonObjectFromLlmText(text), 'gemini-vision');
  }
  if (lastStatus === 429 || String(lastErr).includes('quota'))
    throw new Error('Gemini ücretsiz kota veya dakika limiti dolmuş olabilir.');
  if (lastStatus === 404) throw new Error(`Gemini görsel modeli bulunamadı. ${lastErr || ''}`);
  throw new Error(`Gemini API (${lastStatus || '?'}). ${lastErr || 'Bilinmeyen hata.'}`);
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

export { GROQ_API_KEY, GEMINI_API_KEY };
