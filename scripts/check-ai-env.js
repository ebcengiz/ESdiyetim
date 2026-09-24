#!/usr/bin/env node
/**
 * .env kontrolü (değerleri GÖSTERMEZ). Kullanım: npm run env:check
 *
 * AI anahtarları 1.4.2'den itibaren uygulama paketinde DEĞİL — Supabase Edge Function
 * `ai-proxy` içinde (Supabase secrets). `.env`'deki GEMINI_API_KEY / GROQ_API_KEY
 * (ön eksiz) yalnızca `supabase secrets set` için yerel kopyadır; EXPO_PUBLIC_ ile
 * yazılırsa istemci paketine gömülebilir → bu script hata verir.
 */
/* eslint-disable expo/no-dynamic-env-var -- Node script'i, Metro bundle'ına girmez */
try {
  require('dotenv').config();
} catch (_) {
  /* ok */
}

function isSet(name) {
  return !!(process.env[name] && String(process.env[name]).trim());
}

function mask(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === '') return '— boş —';
  const s = String(v).trim();
  if (s.length <= 8) return '*** (kısa)';
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} karakter)`;
}

function printGroup(title, keys) {
  console.log(`${title}\n`);
  let missing = 0;
  for (const [name, label] of keys) {
    const set = isSet(name);
    if (!set) missing += 1;
    console.log(`  ${set ? '✓' : '○'} ${label}`);
    console.log(`      ${name}: ${mask(name)}\n`);
  }
  return missing;
}

let failed = false;

// ─── Supabase (zorunlu) ───────────────────────────────────────────────────────
const supabaseMissing = printGroup('ESdiyet — Supabase (zorunlu)', [
  ['EXPO_PUBLIC_SUPABASE_URL', 'Supabase proje URL'],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'Supabase anon (public) anahtarı'],
]);
if (supabaseMissing) {
  console.log('Supabase değişkenleri eksik — uygulama açılışta hata verir.\n');
  failed = true;
}

// ─── AI anahtarları: istemcide OLMAMALI ───────────────────────────────────────
const LEAKY_AI_KEYS = [
  'EXPO_PUBLIC_GEMINI_API_KEY',
  'EXPO_PUBLIC_GROQ_API_KEY',
  'EXPO_PUBLIC_COHERE_API_KEY',
  'EXPO_PUBLIC_HUGGINGFACE_API_KEY',
];
const leaky = LEAKY_AI_KEYS.filter(isSet);
if (leaky.length) {
  console.log(
    `✗ İstemciye gömülebilecek AI anahtarı bulundu: ${leaky.join(', ')}\n` +
      '  EXPO_PUBLIC_ ön ekini kaldırın (ör. GEMINI_API_KEY) — anahtarlar Supabase secrets\'ta tutulur.\n'
  );
  failed = true;
}

printGroup('ESdiyet — AI proxy secrets (yerel kopya, `supabase secrets set` için)', [
  ['GEMINI_API_KEY', 'Google AI Studio (Gemini) — https://aistudio.google.com/apikey'],
  ['GROQ_API_KEY', 'Groq (yedek) — https://console.groq.com/keys'],
]);
console.log(
  'Not: Uygulama bu değerleri OKUMAZ. Sunucuya yüklemek için:\n' +
    '  npx supabase secrets set GEMINI_API_KEY=… GROQ_API_KEY=…\n' +
    '  npx supabase functions deploy ai-proxy --no-verify-jwt\n'
);

// ─── AdMob (opsiyonel; yoksa dev/TestFlight'ta Google test reklamları çalışır) ──
const adMissing = printGroup('ESdiyet — AdMob ortam kontrolü (production build için gerekli)', [
  ['EXPO_PUBLIC_ADMOB_IOS_APP_ID', 'AdMob iOS App ID (ca-app-pub-…~…) — build zamanı, Info.plist'],
  ['EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID', 'AdMob geçiş reklamı ad unit (ca-app-pub-…/…)'],
  ['EXPO_PUBLIC_ADMOB_REWARDED_ID', 'AdMob ödüllü reklam ad unit (ca-app-pub-…/…)'],
]);
if (adMissing) {
  console.log(
    'Not: Eksik AdMob değişkenleri dev/TestFlight build\'ini etkilemez (TestIds kullanılır).\n' +
      'Production build\'den önce üçünü de doldurun — aksi hâlde ücretsiz kullanıcıya reklam çıkmaz.\n' +
      'Rehber: REKLAM_ENTEGRASYON_REHBERI.md\n'
  );
}

process.exit(failed ? 1 : 0);
