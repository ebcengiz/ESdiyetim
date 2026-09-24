# AI Kurulumu (Gemini + Groq) — `ai-proxy` Edge Function

> **1.4.2'den itibaren AI anahtarları uygulamada DEĞİL.** Uygulama yalnızca Supabase Edge
> Function `ai-proxy`'yi çağırır; anahtarlar Supabase secrets'ta durur. Anahtarı kaynak koda
> ya da `EXPO_PUBLIC_*` değişkenine yazmak onu uygulama paketine gömer (IPA'dan okunabilir) —
> **yapmayın.** `npm run env:check` böyle bir değişken görürse hata verir.

## 1. Anahtarları al (ücretsiz)

| Sağlayıcı | Adres | Secret adı |
|---|---|---|
| Google Gemini (birincil) | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Groq (yedek) | https://console.groq.com/keys | `GROQ_API_KEY` |
| Cohere (opsiyonel) | https://dashboard.cohere.com/api-keys | `COHERE_API_KEY` |
| Hugging Face (opsiyonel) | https://huggingface.co/settings/tokens | `HUGGINGFACE_API_KEY` |

İsterseniz yerel kopya olarak `.env`'e **ön eksiz** yazın (`GEMINI_API_KEY=…`); uygulama bunları okumaz.

## 2. Sunucuya yükle

```bash
npx supabase login                         # tarayıcıda bir kez
npx supabase link --project-ref qyfagnhmhovhlpbllioq
npx supabase db push                       # supabase/migrations (ai_usage + ai_usage_consume gerekli)
npx supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=...
npx supabase functions deploy ai-proxy --no-verify-jwt
npx supabase functions deploy verify-subscription --no-verify-jwt   # Premium tavanı için
```

CLI yerine Dashboard da kullanılabilir: **SQL Editor** → `supabase/migrations/20260925120000_server_side_limits.sql`
çalıştır; **Edge Functions → Secrets** → anahtarları ekle; **Edge Functions → Deploy a new function**
→ adı `ai-proxy`, içerik `supabase/functions/ai-proxy/index.ts`, "Verify JWT" kapalı.

## 3. Doğrula

- Uygulamada Tips ekranında aşağı çek → yeni tavsiye gelmeli.
- Dashboard → Edge Functions → `ai-proxy` → Logs: `200` görmelisiniz.
- `select * from ai_usage order by updated_at desc limit 5;` → sayaçlar artıyor olmalı.

## Günlük tavan

`supabase/functions/ai-proxy/index.ts` → `CAPS`. Premium (sunucuda doğrulanmış abonelik): metin 80 / görsel 5;
ücretsiz: metin 80 / görsel 3; misafir (IP özeti): metin 20 / görsel 0. Tavan dolunca uygulama "Günlük hak doldu" mesajını gösterir.

## Model güncellemesi

Gemini/Groq bir modeli kaldırırsa (404) yalnızca Edge Function'daki `GEMINI_TEXT_MODELS` /
`GEMINI_VISION_MODELS` / `GROQ_*_MODEL` güncellenip yeniden deploy edilir — uygulama güncellemesi gerekmez.

## Anahtar rotasyonu

1.4.1 ve öncesi sürümler anahtarları paket içinde taşıyor. Yayındaki kullanıcıların çoğu 1.4.2+'ya
geçtikten sonra Gemini/Groq anahtarlarını **yenileyip** yalnızca Supabase secrets'a yazın; eski
sürümlerde AI o andan itibaren yedek (statik) içeriğe düşer.
