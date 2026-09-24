// Supabase Edge Function — AI sağlayıcı proxy'si
//
// Neden: 1.4.1'e kadar Gemini/Groq anahtarları EXPO_PUBLIC_* ile uygulama paketine
// gömülüydü → IPA'dan çıkarılıp ortak ücretsiz kota tüketilebiliyordu. Artık anahtarlar
// yalnızca burada (Supabase secrets) ve her istek kullanıcı/gün bazlı tavana tabi.
//
// Dağıtım:
//   supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=...   (isteğe bağlı: COHERE_API_KEY, HUGGINGFACE_API_KEY)
//   supabase functions deploy ai-proxy --no-verify-jwt
// (JWT kod içinde doğrulanıyor; oturumsuz misafir isteği IP özetiyle sınırlanır.)
// Önkoşul: supabase/migrations/20260925120000_server_side_limits.sql (ai_usage_consume).
//
// İstek:  POST { kind: 'text', prompt }  |  { kind: 'vision', prompt, mime, b64 }
// Yanıt:  200 { text, provider }  |  4xx/5xx { error: <ERROR_CODE> }
// Hata kodları istemcideki ERROR_CODES ile aynı (src/constants/errorMessages.js).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Günlük tavanlar (Türkiye günü) ─────────────────────────────────────────
// Ücretsiz/Premium ayrımı StoreKit'te olduğu için burada doğrulanamıyor; bu değerler
// kötüye kullanıma karşı MUTLAK tavandır (Premium'un meşru kullanımını kesmeyecek kadar
// yüksek, anahtar sızıntısının zararını sınırlayacak kadar düşük).
//   vision: Premium günlük fotoğraf hakkı = 5 (SubscriptionContext.PREMIUM_DAILY_LIMIT)
const CAPS = {
  user: { text: 80, vision: 5 },
  guest: { text: 20, vision: 0 },
} as const;

const MAX_PROMPT_CHARS = 12_000;
const MAX_IMAGE_B64_CHARS = 6_000_000; // ~4.5 MB ham görsel
const DEADLINE_MS = 110_000; // Edge Function duvar saati sınırının altında kal

// Sunucu tarafı içerik kısıtı — istemci prompt'larındaki disclaimer'a ek güvence (App Store sağlık politikası)
const SYSTEM_RULES =
  "Sen ESdiyet uygulamasının beslenme ve yaşam tarzı asistanısın. Yalnızca beslenme, diyet, egzersiz, " +
  "kilo takibi ve genel sağlıklı yaşam konularında Türkçe, genel bilgilendirme amaçlı yanıt ver. " +
  "Tıbbi teşhis, ilaç veya kişisel tedavi planı verme; gerektiğinde hekime/diyetisyene yönlendir. " +
  "Bu konuların dışındaki istekleri kibarca reddet.";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const COHERE_KEY = Deno.env.get("COHERE_API_KEY") ?? "";
const HF_KEY = Deno.env.get("HUGGINGFACE_API_KEY") ?? "";

// 2026-09 doğrulandı (bkz. eski istemci src/services/ai/providers.js). Kota model başına → 429'da sıradaki.
const GEMINI_TEXT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
];
const GEMINI_VISION_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
];
const GROQ_TEXT_MODEL = "openai/gpt-oss-20b";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// ─── Hata tipi ──────────────────────────────────────────────────────────────
class ProxyError extends Error {
  constructor(public code: string, public status: number, detail = "") {
    super(detail || code);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function remaining(deadline: number) {
  return Math.max(deadline - Date.now(), 0);
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Sağlayıcı HTTP durumu → istemci hata kodu */
function codeForStatus(status: number) {
  if (status === 429) return "AI_RATE_LIMIT";
  if (status === 401 || status === 403) return "AI_NOT_CONFIGURED";
  return "AI_UNAVAILABLE";
}

// ─── Gemini ─────────────────────────────────────────────────────────────────
async function gemini(models: string[], parts: unknown[], temperature: number, maxTokens: number, deadline: number) {
  if (!GEMINI_KEY) throw new ProxyError("AI_NOT_CONFIGURED", 503, "GEMINI_API_KEY yok");
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_RULES }] },
    contents: [{ parts }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });
  let last = new ProxyError("AI_UNAVAILABLE", 502, "gemini: yanıt yok");
  for (const model of models) {
    if (remaining(deadline) < 5_000) break;
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
    let res: Response;
    try {
      res = await fetchWithTimeout(url, { method: "POST", headers: { "Content-Type": "application/json" }, body },
        Math.min(45_000, remaining(deadline)));
    } catch (e) {
      last = new ProxyError("AI_TIMEOUT", 504, `gemini ${model}: ${e}`);
      continue;
    }
    const raw = await res.text();
    if (!res.ok) {
      last = new ProxyError(codeForStatus(res.status), 502, `gemini ${model} HTTP ${res.status}: ${raw.slice(0, 300)}`);
      if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
      throw last;
    }
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      last = new ProxyError("AI_UNAVAILABLE", 502, `gemini ${model}: JSON değil`);
      continue;
    }
    const text = data?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text)?.text;
    if (text) return text as string;
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    if (reason && /SAFETY|BLOCK|PROHIBITED|RECITATION/i.test(String(reason))) {
      throw new ProxyError("AI_CONTENT_BLOCKED", 422, `gemini ${model}: ${reason}`);
    }
    last = new ProxyError("AI_EMPTY_RESPONSE", 502, `gemini ${model}: boş yanıt (${reason ?? "-"})`);
  }
  throw last;
}

// ─── Groq (OpenAI uyumlu) ───────────────────────────────────────────────────
async function groq(model: string, content: unknown, extra: Record<string, unknown>, deadline: number) {
  if (!GROQ_KEY) throw new ProxyError("AI_NOT_CONFIGURED", 503, "GROQ_API_KEY yok");
  let res: Response;
  try {
    res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_RULES }, { role: "user", content }],
        ...extra,
      }),
    }, Math.min(60_000, remaining(deadline)));
  } catch (e) {
    throw new ProxyError("AI_TIMEOUT", 504, `groq: ${e}`);
  }
  const raw = await res.text();
  if (!res.ok) throw new ProxyError(codeForStatus(res.status), 502, `groq HTTP ${res.status}: ${raw.slice(0, 300)}`);
  const text = JSON.parse(raw)?.choices?.[0]?.message?.content;
  if (!text) throw new ProxyError("AI_EMPTY_RESPONSE", 502, "groq: boş yanıt");
  return text as string;
}

// ─── Cohere / Hugging Face (yalnızca secret tanımlıysa) ─────────────────────
async function cohere(prompt: string, deadline: number) {
  const res = await fetchWithTimeout("https://api.cohere.ai/v1/generate", {
    method: "POST",
    headers: { Authorization: `Bearer ${COHERE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "command", prompt: `${SYSTEM_RULES}\n\n${prompt}`, max_tokens: 2048, temperature: 0.7 }),
  }, Math.min(20_000, remaining(deadline)));
  if (!res.ok) throw new ProxyError(codeForStatus(res.status), 502, `cohere HTTP ${res.status}`);
  const text = (await res.json())?.generations?.[0]?.text;
  if (!text) throw new ProxyError("AI_EMPTY_RESPONSE", 502, "cohere: boş yanıt");
  return text as string;
}

async function huggingface(prompt: string, deadline: number) {
  const res = await fetchWithTimeout(
    "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: `${SYSTEM_RULES}\n\n${prompt}`,
        parameters: { max_new_tokens: 1536, temperature: 0.7, top_p: 0.9, return_full_text: false },
      }),
    },
    Math.min(30_000, remaining(deadline)),
  );
  if (!res.ok) throw new ProxyError(codeForStatus(res.status), 502, `huggingface HTTP ${res.status}`);
  const text = (await res.json())?.[0]?.generated_text;
  if (!text) throw new ProxyError("AI_EMPTY_RESPONSE", 502, "huggingface: boş yanıt");
  return text as string;
}

// ─── Zincirler ──────────────────────────────────────────────────────────────
type Step = { id: string; enabled: boolean; run: () => Promise<string> };

async function runChain(steps: Step[]) {
  let last: ProxyError | null = null;
  for (const step of steps) {
    if (!step.enabled) continue;
    try {
      const text = await step.run();
      if (text.trim()) return { text, provider: step.id };
    } catch (e) {
      // İçerik engeli sağlayıcı değiştirerek aşılmaya çalışılmaz
      if (e instanceof ProxyError && e.code === "AI_CONTENT_BLOCKED") throw e;
      last = e instanceof ProxyError ? e : new ProxyError("AI_UNAVAILABLE", 502, String(e));
      console.warn(`ai-proxy [${step.id}] atlandı:`, last.code, last.message);
    }
  }
  throw last ?? new ProxyError("AI_NOT_CONFIGURED", 503, "Hiçbir sağlayıcı anahtarı tanımlı değil");
}

function textChain(prompt: string, deadline: number) {
  return runChain([
    { id: "gemini", enabled: !!GEMINI_KEY, run: () => gemini(GEMINI_TEXT_MODELS, [{ text: prompt }], 0.7, 8192, deadline) },
    {
      id: "groq",
      enabled: !!GROQ_KEY,
      run: () => groq(GROQ_TEXT_MODEL, prompt, { temperature: 0.7, max_tokens: 4096, reasoning_effort: "low" }, deadline),
    },
    { id: "cohere", enabled: !!COHERE_KEY, run: () => cohere(prompt, deadline) },
    { id: "huggingface", enabled: !!HF_KEY, run: () => huggingface(prompt, deadline) },
  ]);
}

function visionChain(prompt: string, mime: string, b64: string, deadline: number) {
  return runChain([
    {
      id: "gemini-vision",
      enabled: !!GEMINI_KEY,
      run: () => gemini(GEMINI_VISION_MODELS, [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }], 0.35, 2048, deadline),
    },
    {
      id: "groq-vision",
      enabled: !!GROQ_KEY,
      run: () =>
        groq(
          GROQ_VISION_MODEL,
          [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }],
          { temperature: 0.35, max_completion_tokens: 2048, response_format: { type: "json_object" } },
          deadline,
        ),
    },
  ]);
}

// ─── Kimlik + tavan ─────────────────────────────────────────────────────────
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveSubject(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data } = await userClient.auth.getUser();
    if (data?.user) return { subject: `user:${data.user.id}`, tier: "user" as const };
  }
  // Misafir (anon anahtarı) → ham IP saklamadan özetle sınırla
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  return { subject: `ip:${await sha256(`esdiyet:${ip}`)}`, tier: "guest" as const };
}

// ─── Handler ────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "BAD_REQUEST" }, 405);
  const deadline = Date.now() + DEADLINE_MS;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "BAD_REQUEST" }, 400);
  }
  const kind = body?.kind === "vision" ? "vision" : body?.kind === "text" ? "text" : null;
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (!kind || !prompt || prompt.length > MAX_PROMPT_CHARS) return json({ error: "BAD_REQUEST" }, 400);

  let mime = "image/jpeg";
  let b64 = "";
  if (kind === "vision") {
    mime = /^image\/[a-z0-9.+-]+$/i.test(String(body?.mime)) ? String(body.mime) : "image/jpeg";
    b64 = typeof body?.b64 === "string" ? body.b64.replace(/^data:image\/\w+;base64,/, "") : "";
    if (!b64 || b64.length > MAX_IMAGE_B64_CHARS) return json({ error: "AI_IMAGE_INVALID" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { subject, tier } = await resolveSubject(req, supabaseUrl, anonKey);
  const cap = CAPS[tier][kind];
  const { data: used, error: capErr } = await admin.rpc("ai_usage_consume", {
    p_subject: subject, p_kind: kind, p_cap: cap, p_delta: 1,
  });
  if (capErr) {
    console.error("ai-proxy: ai_usage_consume", capErr.message);
    return json({ error: "AI_UNAVAILABLE" }, 503);
  }
  if (used === -1) {
    return json({ error: tier === "guest" && kind === "vision" ? "AUTH_SESSION_REQUIRED" : "AI_DAILY_LIMIT" }, 429);
  }

  try {
    const result = kind === "vision" ? await visionChain(prompt, mime, b64, deadline) : await textChain(prompt, deadline);
    return json(result);
  } catch (e) {
    // Yanıt üretilemediyse hak iade edilir (kullanıcı başarısız deneme için sayılmasın)
    await admin.rpc("ai_usage_consume", { p_subject: subject, p_kind: kind, p_cap: cap, p_delta: -1 });
    const err = e instanceof ProxyError ? e : new ProxyError("AI_UNAVAILABLE", 502, String(e));
    console.warn("ai-proxy başarısız:", err.code, err.message);
    return json({ error: err.code }, err.status);
  }
});
