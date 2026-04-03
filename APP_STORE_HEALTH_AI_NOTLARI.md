# App Store — Sağlık, Gizlilik ve Yapay Zeka (Fotoğraftan kalori)

Bu dosya **App Store Connect** ve **App Privacy** sorularını doldururken kullanmak üzere hazırlanmıştır. ESdiyet’in güncel davranışına göre (Supabase, Groq, Google Gemini, yemek fotoğrafı analizi) uyumludur.

---

## 1. Gizlilik Politikası URL’si

- **Zorunlu:** App Store Connect’te **Privacy Policy URL** alanına, güncel `PRIVACY.md` içeriğinin yayınlandığı **herkese açık bir HTTPS adresi** girin.
- GitHub’da `PRIVACY.md` dosyasını raw veya GitHub Pages ile yayınlayabilirsiniz; mağaza politikası **erişilebilir bir web sayfası** ister.

---

## 2. App Privacy (Gizlilik — Veri toplama)

**App Store Connect → App → App Privacy → Get Started / Edit**

Aşağıdakileri, uygulamanın **gerçekten topladığı veya işlediği** verilere göre işaretleyin. Kullanıcı verisi üçüncü tarafa gidiyorsa o türü de ekleyin.

| Veri türü | Örnek kullanım | Bağlı özellik | Üçüncü taraf? |
|-----------|----------------|---------------|----------------|
| **Contact Info** — Email / Name | Hesap | Supabase Auth | Evet (Supabase) |
| **Health & Fitness** — Health (VKİ, kilo, boy vb.) | Kilo takibi, VKİ | Supabase | Evet |
| **User Content** — Photos | Galeri / kamera ile seçilen görsel | Profil + isteğe bağlı yemek fotoğrafı | Kısmen (yemek görseli analiz API’sine gider) |
| **Diagnostics** | (Varsa) çökme raporları | — | Expo / Apple sistem |

**Önemli — Yemek fotoğrafı:**

- Görsel **ESdiyet’in kendi veritabanında kalıcı saklanmıyorsa** bile, **analiz için Groq veya Google’a iletildiği** için App Privacy’de genellikle:
  - **Photos or Videos** veya **User Content** ile ilişkilendirilen veri,
  - **Linked to the user** (hesaplı kullanımda) veya **Not linked** (anonim API anahtarı ile ve hesap bağlantısı yoksa — uygulamanız hesaplı ise çoğunlukla linked),
  - **Used for App Functionality**,
  - Üçüncü taraf olarak **Groq** / **Google** bildirimi

Apple’ın güncel kategorilerine göre seçenekleri işaretleyin; yanıltıcı “veri toplamıyoruz” demeyin — **fotoğraf API’ye gidiyorsa** bunu ifade edin.

---

## 3. “Tracking” (İzleme)

- Reklam veya ATT (App Tracking Transparency) kullanmıyorsanız genelde **App does not track** veya tracking kapalı kalır.
- Groq/Gemini **kişiselleştirilmiş reklam** için kullanılmıyorsa tracking ile karıştırılmamalı; yine de **App Privacy** sorularını dürüst doldurun.

---

## 4. İnceleme notları (App Review Information → Notes)

İnceleyiciye İngilizce kısa not (kopyala-yapıştır):

```
Meal calorie estimation: User optionally selects a food photo. The image is sent from the device to Groq (primary) or Google Gemini (fallback) only when the user taps "Calculate estimated calories". Images are not stored on our Supabase backend. On first use, the user must accept an in-app health/AI disclaimer (not medical advice).

AI diet tips (optional): Text prompts may be sent to Groq or other configured providers per user settings; see Privacy Policy.

No HealthKit integration for the meal photo feature. Medical disclaimer is shown in-app.
```

Türkçe özet (kendi notlarınız için):

- Yemek fotoğrafı yalnızca kullanıcı onayıyla analiz için Groq/Gemini’ye gider; sunucuda saklanmaz.
- İlk kullanımda sağlık/yapay zeka bilgilendirmesi ve “Anladım” onayı var.
- Tıbbi tavsiye iddiası yok.

---

## 5. Kategori ve yaş derecelendirmesi

- Kategori: **Health & Fitness** veya **Food & Drink** — uygulamanın ana vurgusuna göre seçin (çoğu diyet takip uygulaması **Health & Fitness**).
- **Age Rating** sihirbazında şiddet / kumar vb. yoksa genelde **4+** kalır.

---

## 6. Apple’ın sağlık / güvenlik yönergeleri (özet)

- Uygulama **teşhis veya tedavi** vaat etmemeli; açıklama ve uygulama içi metinler bununla uyumlu olmalı (`PRIVACY.md` ve ekrandaki uyarılar).
- Yapay zeka içeriği için **yanlış veya zararlı tıbbi bilgi** riski; inceleme reddinde bu konu çıkarsa, **disclaimer** ve **insan denetimi olmadığını** net belirten metinleri güçlendirin.

---

## 7. Metadata metin önerileri (Türkçe)

**Promotional Text (170 karaktere kadar):**

```
Yapay zeka ile fotoğraftan tahmini kalori, hedef ve diyet takibi — tek uygulamada. Tıbbi tavsiye değildir; bilgi amaçlıdır.
```

**Description’a eklenecek kısa blok (AI + uyarı):**

```
YAPAY ZEKA — FOTOĞRAFTAN TAHMİNİ KALORİ
İsterseniz öğün fotoğrafı yükleyerek yaklaşık kalori ve öğe özeti alabilirsiniz. Sonuçlar tahminidir; gerçek değerler porsiyon ve içeriğe göre değişir. Tıbbi ölçüm veya kişisel diyet planı yerine geçmez. Özel sağlık durumlarınız için uzmanınıza danışın.
```

**Keywords’a eklenebilecek (100 karakter sınırı içinde):**

```
...,yapay zeka,ai,kalori tahmini,fotoğraf
```

---

## 8. Kontrol listesi (gönderim öncesi)

- [ ] Gizlilik politikası URL’si canlı ve HTTPS
- [ ] `PRIVACY.md` güncel (yemek fotoğrafı + Groq + Gemini)
- [ ] App Privacy’de fotoğraf / kullanıcı içeriği ve üçüncü taraflar doğru
- [ ] İnceleme notlarında AI + disclaimer + HealthKit yok bilgisi
- [ ] Demo hesap (giriş zorunluysa) App Review’da çalışıyor
- [ ] Ekran görüntülerinde mümkünse “Fotoğraftan kalori” ekranı da yer alsın

---

*Son güncelleme: Nisan 2026 — Uygulama özellikleri değiştikçe bu dosyayı ve `PRIVACY.md` dosyasını birlikte güncelleyin.*
