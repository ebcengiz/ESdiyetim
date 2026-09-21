#!/usr/bin/env node
/**
 * .env içinde AI anahtarlarının tanımlı olup olmadığını kontrol eder (değerleri GÖSTERMEZ).
 * Kullanım: npm run env:check
 */
try {
  require('dotenv').config();
} catch (_) {
  /* ok */
}

const keys = [
  ['EXPO_PUBLIC_GEMINI_API_KEY', 'Google AI Studio (Gemini)'],
  ['EXPO_PUBLIC_GROQ_API_KEY', 'Groq (yedek)'],
];

function mask(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === '') return '— boş —';
  const s = String(v).trim();
  if (s.length <= 8) return '*** (kısa)';
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} karakter)`;
}

console.log('\nESdiyet — AI ortam kontrolü\n');
let anySet = false;
for (const [name, label] of keys) {
  const set = !!(process.env[name] && String(process.env[name]).trim());
  if (set) anySet = true;
  console.log(`  ${set ? '✓' : '○'} ${label}`);
  console.log(`      ${name}: ${mask(name)}\n`);
}

if (!anySet) {
  console.log(
    'En az GEMINI veya GROQ anahtarı gerekli. Proje kökünde `.env` oluşturun (şablon: `.env.example`).\n' +
      '  Gemini: https://aistudio.google.com/apikey\n' +
      '  Groq:   https://console.groq.com/keys\n' +
      'Sonra: npx expo start -c\n'
  );
  process.exit(1);
}

console.log('Tamam — en az bir AI anahtarı tanımlı.\n');

// ─── AdMob (opsiyonel; yoksa dev/TestFlight'ta Google test reklamları çalışır) ──
const adKeys = [
  ['EXPO_PUBLIC_ADMOB_IOS_APP_ID', 'AdMob iOS App ID (ca-app-pub-…~…) — build zamanı, Info.plist'],
  ['EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID', 'AdMob geçiş reklamı ad unit (ca-app-pub-…/…)'],
  ['EXPO_PUBLIC_ADMOB_REWARDED_ID', 'AdMob ödüllü reklam ad unit (ca-app-pub-…/…)'],
];
console.log('ESdiyet — AdMob ortam kontrolü (production build için gerekli)\n');
let adMissing = 0;
for (const [name, label] of adKeys) {
  const set = !!(process.env[name] && String(process.env[name]).trim());
  if (!set) adMissing += 1;
  console.log(`  ${set ? '✓' : '○'} ${label}`);
  console.log(`      ${name}: ${mask(name)}\n`);
}
if (adMissing) {
  console.log(
    'Not: Eksik AdMob değişkenleri dev/TestFlight build\'ini etkilemez (TestIds kullanılır).\n' +
      'Production build\'den önce üçünü de doldurun — aksi hâlde ücretsiz kullanıcıya reklam çıkmaz.\n' +
      'Rehber: REKLAM_ENTEGRASYON_REHBERI.md\n'
  );
}
process.exit(0);
