# hafıza.md — ESdiyet Proje Hafızası

> **Amaç:** Bu dosya, ESdiyet projesinde bugüne kadar yapılan işleri ve yapılması planlanan/önerilen işleri kronolojik olarak takip eder.
> **Kural:** Claude Code (veya başka bir ajan) bu projede **her yeni işlem/görev tamamladığında**, bu dosyayı günceller:
> 1. "Yapılanlar" bölümüne yeni bir tarihli girdi ekler (en üste, en yeni en üstte).
> 2. Eğer bir sorunu çözdüyse "Bilinen Sorunlar / Riskler" bölümünden kaldırır ya da "çözüldü" olarak işaretler.
> 3. "Yapılacaklar" bölümünü güncel tutar (biten maddeleri kaldırır, yeni ortaya çıkanları ekler).
> Detaylı mimari/konvansiyon bilgisi için **AGENTS.md / CLAUDE.md** dosyalarına bakılmalı — bu dosya onların yerine geçmez, sadece "ne oldu, sırada ne var" sorusuna cevap verir.

---

## 1. Proje Özeti (kısa)

- **Ne:** ESdiyet — Türkçe, iOS öncelikli (Android da destekli) diyet/kilo/VKİ takip ve AI destekli beslenme tavsiyesi uygulaması.
- **Stack:** Expo (React Native) + Supabase (Auth/DB) + expo-iap (abonelik) + AI provider zinciri (Gemini → Groq → Cohere → Hugging Face).
- **Proje kökü:** `/Users/enesbugracengiz/Desktop/ESdiyetim` (not: `ESdiyetim-master` klasörü artık yok, gerçek çalışma kopyası budur).
- **Git:** `master` branch, `origin` remote'a bağlı. Commit geçmişi çoğunlukla anlamsız "fix" mesajlı (97 commit, 2025-09-29 → 2026-04-21 arası). Yaklaşık 5 aydır yeni commit yok (bugüne kadar).
- **Supabase projesi:** `ESdiyet` (ref: `qyfagnhmhovhlpbllioq`), `ebcengiz` organizasyonu altında, **Free Plan**. Free plan'da 7 gün hareketsizlikte proje otomatik "paused" oluyor.

---

## 2. Yapılanlar (kronolojik, en yeni en üstte)

### 2026-09-10 — `PrivacyInfo.xcprivacy` App Store Connect beyanıyla eşleştirildi

Kalan son kritik App Store maddesi tamamlandı. Önce App Store Connect'e (`claude-in-chrome`, kullanıcının açık izniyle) girilip mevcut "App Privacy" beyanı okundu — **beklenenin aksine ASC tarafı zaten doğru ve eksiksizdi**: 6 veri tipi (Name, Email Address, Health, Fitness, Photos or Videos, User ID) hepsi "Linked to the user's identity" olarak, App Functionality + Product Personalization amaçlarıyla beyan edilmiş. Asıl sorun, uygulama içindeki (`.ipa`'ya gömülen) `PrivacyInfo.xcprivacy` dosyasının bu beyanla **tutarsız** olmasıydı (`NSPrivacyCollectedDataTypes: []`).

- İlk denemede özel bir config plugin (`plugins/with-ios-privacy-manifest.js`, `withDangerousMod`) yazıldı ama **çalışmadı**: debug loglarıyla doğrulandı ki Expo, `PrivacyInfo.xcprivacy` dosyasını kendi dahili `withPrivacyInfo` mod'uyla (bkz. `node_modules/@expo/config-plugins/build/ios/PrivacyInfo.js`) tüm dangerous mod'lardan **sonra** oluşturuyor — dosya, bizim mod çalıştığı anda henüz diskte yoktu.
- Doğru/kalıcı çözüm bulundu: Expo'nun **resmi, ilk sınıf desteklediği** `app.json` → `ios.privacyManifests` alanı (`@expo/config-plugins`'in `withPrivacyInfo`'su bu alanı otomatik işliyor, mevcut içerikle merge ediyor). Özel plugin silindi, yerine `app.json`'a ASC beyanıyla birebir eşleşen `privacyManifests.NSPrivacyCollectedDataTypes` (6 veri tipi, hepsi `Linked: true`, `Tracking: false`, uygun `Purposes`) eklendi.
- **Doğrulama:** `npx expo prebuild --clean -p ios` sonrası üretilen `ios/ESdiyet/PrivacyInfo.xcprivacy` artık ASC'deki 6 veri tipini birebir içeriyor (dosya okunarak teyit edildi). `npx expo export --platform ios` hatasız bundle etti.
- **Kalıcılık notu:** Bu, `ios/` klasörü gitignore'lu olduğu ve her `expo prebuild`'de sıfırlandığı için önemli — artık kaynak `app.json`'da olduğundan her prebuild'de otomatik doğru üretilecek, elle senkron tutmaya gerek yok.

**Sonuç: Önceki oturumdaki her iki KRİTİK App Store riski de (5.1.2(i) onay akışı + Privacy Manifest tutarsızlığı) kapatıldı.**

### 2026-09-10 — `expo-font` eksikliği giderildi + Guideline 5.1.2(i) AI onay akışı uygulandı

Önceki günlük girdideki iki açık maddeden ikisi de bu oturumda tamamlandı:

1. **`expo-font` eksik peer dependency giderildi:** `npx expo install expo-font` ile eklendi (`~57.0.3`). `npx expo-doctor` artık 21 kontrolden 20'sini geçiyor (kalan tek uyarı bilinen yanlış-pozitif, bkz. Bilinen Sorunlar).
2. **App Store Guideline 5.1.2(i) — AI veri paylaşımı onay akışı uygulandı:**
   - **`src/services/aiConsentService.js`** (yeni): AsyncStorage tabanlı onay durumu (`granted`, `decided`, `date`), `AIConsentRequiredError` sınıfı, `assertAIConsent()` — onay yoksa ağa hiç çıkmadan hata fırlatır.
   - **`src/services/ai/providers.js`**: `callTextWithProviderChain` ve `callMealCalorieVisionChain` — yani **tüm** AI çağrılarının geçtiği iki merkezi giriş noktası — başında `await assertAIConsent()` eklendi. Hiçbir ekran bu kontrolü atlayamaz.
   - **`src/services/aiService.js`**: 6 `get*Advice`/`get*Bullets` metodunun catch bloğu, onay hatasını (`AIConsentRequiredError`) genel ağ/kota hatalarından ayırt edecek şekilde güncellendi — loglanmaz, mevcut statik fallback içerik döner ama artık `consentRequired: true` bayrağı taşır (ekranlar isterse ayrıca gösterebilir, mevcut ekranlar değiştirilmeden de çökmeden çalışır).
   - **`src/contexts/AIConsentContext.js`** (yeni) + **`src/components/AIConsentModal.js`** (yeni): Kullanıcı giriş yaptıktan sonra, daha önce hiç karar vermemişse (`decided: false`) bir kerelik onay modalı gösterir — **"Google Gemini" ve "Groq"u adıyla belirtir**, kabul/"Şimdi Değil" seçenekleri sunar. `App.js`'e `AuthProvider` içine, `SubscriptionProvider`'ın dışına eklendi.
   - **`src/screens/ProfileScreen.js`**: "Uygulama" bölümüne, "Gizlilik politikası" öğesinin altına **"Yapay Zeka Veri Paylaşımı"** satırı + `Switch` eklendi — onay istendiği zaman **geri çekilebilir** (Guideline 5.1.2(i)'nin 3. şartı).
   - **`src/screens/MealCalorieScreen.js`**: Fotoğraf analizi sırasında `AI_CONSENT_REQUIRED` hatası yakalanırsa (örn. kullanıcı daha önce reddetmişse) onay modalını tekrar açar, genel hata mesajı yerine anlamlı bir uyarı gösterir.
   - **Doğrulama:** Tüm yeni/değişen dosyalar Babel ile sözdizimi kontrolünden geçirildi; `npx expo export --platform ios` 1061 modülle hatasız bundle etti; `npx expo run:ios --device "iPhone 17 Pro"` ile simulator'de gerçek build yapıldı, uygulama çökmeden login ekranına geldi (guest/misafir modunda `AIConsentProvider` `user=null` olduğu için modal tetiklenmiyor, beklenen davranış). **Not:** Onay modalının giriş yapılmış bir hesapla uçtan uca (modal görünümü, kabul/red, Profil'den geri çekme) tıklanarak test edilmesi — TestFlight/gerçek hesapla — kullanıcının kendi takibine bırakıldı (test hesabı/kimlik bilgisi ajan tarafından girilemez).

**Kalan kritik madde (henüz yapılmadı):** `PrivacyInfo.xcprivacy` ve App Store Connect "App Privacy" beyanının gerçek veri toplama pratiğiyle eşleştirilmesi — bu, App Store Connect panelinde manuel form doldurma gerektiriyor (kullanıcı kararı/onayı gerekli, bkz. Yapılacaklar).

### 2026-09-10 — Modernizasyon/App Store analiz raporu + iki düşük riskli düzeltme (mikrofon izni, eas.json submit)

Kullanıcı; mimari, AI maliyet/performans, Türkiye pazarı, UI/UX, Kaggle entegrasyonu ve Apple App Store uyumluluğu konularında kapsamlı bir analiz istedi. 3 paralel keşif ajanı + güncel (Eylül 2026) web araştırması sonucunda bir yol haritası hazırlandı (Acil / Orta Vadeli / Kaçınılması Gereken Hatalar). En kritik iki bulgu **henüz düzeltilmedi** (kullanıcı kararı/onayı gerektiriyor):

1. **App Store Guideline 5.1.2(i)** (Kasım 2025'ten beri yürürlükte): Uygulama Gemini/Groq'a kullanıcı verisi (yemek fotoğrafı, sağlık verisi) gönderirken sağlayıcı adını belirten açık onay almıyor, ayarlardan geri çekme seçeneği yok — App Store red/kaldırılma riski taşıyor.
2. **`ios/ESdiyet/PrivacyInfo.xcprivacy`** boş veri beyanı yapıyor (`NSPrivacyCollectedDataTypes: []`) ama uygulama fiilen e-posta/sağlık verisi/fotoğraf topluyor ve bunları AI sağlayıcılarına iletiyor — App Store Connect'teki "App Privacy" beyanıyla tutarsız.

Bu oturumda tamamlanan iki düşük riskli madde:

1. **Kullanılmayan mikrofon izni kaldırıldı:** `Info.plist`'teki `NSMicrophoneUsageDescription` placeholder metni ("Allow $(PRODUCT_NAME) to access your microphone") elle girilmemiş, `expo-image-picker` plugin'inin video-çekim desteği için varsayılan eklediği bir izindi (uygulama video kullanmıyor, sadece fotoğraf). `app.json`'daki `expo-image-picker` plugin config'ine `"microphonePermission": false` eklendi, `npx expo prebuild --clean -p ios` ile doğrulandı — üretilen `Info.plist`'te bu anahtar artık yok.
2. **`eas.json` → `submit.production` dolduruldu:** Önceden boştu (`{}`), `eas submit --platform ios` çalıştırılamıyordu. Kullanıcının açık izniyle App Store Connect'e (`claude-in-chrome`, zaten giriş yapılmış oturum üzerinden) girilip gerçek değerler alındı: **Apple ID** `enesbugracengiz@icloud.com`, **ASC App ID** `6753659091` (ESdiyet → App Information), **Apple Team ID** `AVL8UT8FA8` (Edit Profile → Team ID). Artık `eas submit` bu bilgilerle otomatik çalışabilir.

`npx expo-doctor` çalıştırılırken **yeni bir bulgu** ortaya çıktı (henüz düzeltilmedi): `@expo/vector-icons` için `expo-font` peer dependency eksik — development build/production'da çökme riski var (`npx expo install expo-font` ile tek satırda çözülür).

**Önemli kullanıcı kararı:** Hiçbir ücretli AI/servis katmanına geçilmeyecek — mevcut ücretsiz Gemini/Groq kotası korunacak. Analiz raporundaki "AI'yı düşük maliyetli ücretli katmana taşı" önerisi kullanıcı tarafından reddedildi, bundan sonraki tüm önerilerde bu kısıt göz önünde bulundurulmalı.

### 2026-09-10 — `eas.json` build image düzeltmesi + yerel dev build doğrulaması
"Yapılacaklar" listesindeki iki maddeye de girişildi:

1. **`eas.json` build image (ÖNEMLİ, çözüldü):** Web araştırmasıyla doğrulandı — Expo SDK 57 / RN 0.86 için önerilen EAS build image'ı **`macos-tahoe-26.5-xcode-26.6`** (Xcode 26.6), eski pin ise **`macos-sequoia-15.3-xcode-16.2`** (Xcode 16.2) idi — SDK 57 minimum Xcode 26.4 gerektiriyor, yani eski pin bir sonraki EAS build'i **kesin kırardı**. `eas.json`'daki `preview` ve `production` profillerinin `ios.image` alanı `macos-tahoe-26.5-xcode-26.6` olarak güncellendi. Yerel Xcode sürümü de zaten 26.6 (`xcodebuild -version`) — tutarlı. Kaynak: Expo build-reference/infrastructure dokümantasyonu.
2. **`expo-iap` yerel doğrulaması (kısmen tamamlandı, beklenenden iyi sonuç):** "Gerçek cihazda satın alma tamamlama" (Apple sandbox hesabına giriş + "Satın Al" dokunuşu) fiziksel cihaz + insan etkileşimi gerektirdiği için ajan tarafından yapılamaz (Apple hesabına kimlik bilgisi girmek zaten yasak bir eylem). Onun yerine: `ios/` klasörü `npx expo prebuild --clean -p ios` ile SDK 57/RN 0.86'ya göre yeniden üretildi, CocoaPods kuruldu, `npx expo run:ios --device "iPhone 17 Pro"` ile **development build simulator'de derlendi (0 hata, 2 zararsız uyarı — duplicate `-lc++` ve `UIDeviceFamily` Info.plist uyarısı)**. Uygulama çökmeden açıldı (login ekranı normal render oldu). `xcrun simctl spawn booted log stream` ile yakalanan gerçek sistem logları şunu **doğruladı**:
   - `🟢 Registering module 'ExpoIap'` + `🟢 Creating JS object for module 'ExpoIap'` — native modül Expo Go'nun aksine gerçekten yükleniyor.
   - `[ExpoIap] fetchProducts payload: {"skus":["com.esdiyet.app.premium.monthly","com.esdiyet.app.premium.quarterly","com.esdiyet.app.premium.yearly"],"type":"subs"}` ve ardından **`storekitd` üzerinden gerçek Apple sandbox StoreKit isteği** atıldı, **gerçek ürün verisiyle** (`"ESdiyet 3-Month Premium"`, `"displayPrice":"$9.99"` vb.) sonuç döndü.
   - Uygulama loglarında `error`/`uncaught`/`fatal`/`exception` araması **temiz** çıktı (sadece normal ATS/localhost networking gürültüsü var, ATS local networking simulator dev-mode'da beklenen bir şey).
   
   **Sonuç:** SDK 57 yükseltmesi sonrası `expo-iap` entegrasyonu (native modül yükleme + ürün listeleme) **çalışıyor**, App Store Connect'teki ürünler doğru yapılandırılmış. Kalan tek adım — gerçek satın alma tamamlama + restore akışının uçtan uca tıklanarak test edilmesi — hâlâ kullanıcının TestFlight/gerçek cihazda kendisinin yapması gereken manuel bir adım.

### 2026-09-10 — Oturum değişiklikleri commit + push edildi
SDK 57 yükseltmesi + IAP/Supabase düzeltmeleri + AGENTS.md/CLAUDE.md/hafiza.md güncellemeleri tek commit'te birleştirildi: `2551437` — "Expo SDK 54'ten 57'ye yükselt, IAP crash ve Supabase config sorunlarını düzelt". 8 dosya değişti: `AGENTS.md` (yeni), `hafiza.md` (yeni), `CLAUDE.md`, `app.json`, `package.json`, `package-lock.json`, `src/services/subscriptionService.js`, `src/services/supabase.js`. `origin/master`'a push edildi (`17fc30c..2551437`). Bu hafiza.md güncellemesi (bu girdi + commit-durumu/TODO düzeltmeleri) ayrı bir takip commit'i olarak eklenecek.

### 2026-09-10 — AGENTS.md / CLAUDE.md güncellendi
Bir önceki SDK 57 yükseltmesinden beri bu iki dosya eskiydi (hâlâ SDK 54 / deploymentTarget 15.1 / hardcoded Supabase bilgisi yazıyordu). İkisi de (içerikleri aynı) güncellendi:
- Teknoloji tablosu: Expo SDK 57, RN 0.86.3, React 19.2.3, TypeScript ~6.0.3.
- `newArchEnabled` alanının kaldırıldığı, `splash`'ın `expo-splash-screen` plugin'ine taşındığı, `android.edgeToEdgeEnabled`'ın kaldırıldığı not edildi.
- "Veri Katmanı" bölümü: Supabase URL/key artık env'den okunuyor (hardcoded değil) + Free Plan otomatik pause riski eklendi.
- "Kritik Uyarılar"a madde 8 olarak `expo-iap` / Expo Go kısıtı eklendi.
- `@expo/vector-icons` ve `expo-blur`'un artık explicit dependency olduğu teknoloji tablosuna eklendi.
- CLAUDE.md'nin "Daha Fazla Bilgi" listesine `hafiza.md` referansı eklendi.

**Not:** Aşağıdaki "Yapılacaklar" listesindeki ilgili madde bu işlemle kapatıldı.

### 2026-09-10 — Expo SDK 54 → 57 yükseltmesi + kritik hata düzeltmeleri
Kullanıcının telefonunda Expo Go SDK 57 kullanıyordu, proje SDK 54'teydi → uyumsuzluk. Kullanıcı "projeyi SDK 57'ye yükselt" seçeneğini seçti. Yapılanlar:

1. **`package.json`** — `expo` `~54.0.37` → `^57.0.0`. `npx expo install --fix` ile tüm SDK-bağımlı paketler uyumlu sürümlere çekildi: `react` 19.2.3, `react-native` 0.86.3, `expo-image-picker` ~57.0.16, `expo-build-properties` ~57.0.17, `expo-linear-gradient` ~57.0.1, `expo-status-bar` ~57.0.1, `react-native-safe-area-context` ~5.7.0, `react-native-screens` ~4.26.0, `@react-native-community/datetimepicker` 9.1.0, `typescript` ~6.0.3, `@types/react` ~19.2.4, `babel-preset-expo` ~57.0.0.
2. **`app.json`** şema değişiklikleri (SDK 57'de eski alanlar kaldırıldı):
   - `ios.deploymentTarget`: `15.1` → `16.4` (SDK 57 zorunlu minimum).
   - `newArchEnabled: true` alanı **kaldırıldı** (artık her zaman aktif, şemadan çıkarıldı).
   - Top-level `splash` alanı kaldırılıp **`expo-splash-screen`** plugin'ine taşındı (paket eklendi, aynı görsel/renk ayarlarıyla).
   - `android.edgeToEdgeEnabled: true` **kaldırıldı** (artık zorunlu/varsayılan, alan geçersiz).
3. **Eksik bağımlılıklar eklendi** — kod içinde import edilip package.json'da tanımsız olan paketler (muhtemelen `expo` paketinin eski sürümlerinde transitive/bundled geliyordu, SDK 57'de değil):
   - `@expo/vector-icons@^15.0.2` (24 dosyada kullanılıyor, `Ionicons` vb.)
   - `expo-blur@~57.0.2` (`src/components/PremiumGate.js`)
4. **`npx expo-doctor`** 21 kontrolün 20'sini geçiyor. Kalan tek uyarı gerçek değil (bkz. Bilinen Sorunlar).
5. **Expo Go hesap eşleşme sorunu** çözüldü: proje EAS'a bağlı (`extra.eas.projectId`), terminal CLI `enesbugracengiz` hesabıyla login, telefonda Expo Go aynı hesaba login edilerek çözüldü (kullanıcı kendi yaptı).
6. **Supabase 502/DNS hatası kök nedeni bulundu ve çözüldü:** `qyfagnhmhovhlpbllioq.supabase.co` DNS'te bulunamıyordu (NXDOMAIN). Sebep: proje **silinmemiş, sadece Free Plan'ın 7 günlük hareketsizlik sonrası otomatik "pause" özelliği** yüzünden duraklatılmış. Kullanıcının Chrome'daki mevcut Supabase oturumu (`claude-in-chrome`) kullanılarak dashboard'dan **"Resume project"** tıklanıp proje restore edildi (kullanıcı Pro plana geçmek istemedi — bilinçli tercih, bkz. aşağı).
7. **`src/services/supabase.js` düzeltildi:** Önceden `SUPABASE_URL`/`SUPABASE_ANON_KEY` **hardcoded** idi (AGENTS.md/CLAUDE.md'de de bu şekilde belgeliydi). Artık `process.env.EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` okunuyor; eksikse anlamlı bir hata fırlatıyor. **Not: AGENTS.md/CLAUDE.md'deki "hardcoded, silme" notu artık güncel değil — bu dosyalar henüz güncellenmedi (bkz. Yapılacaklar).**
8. **`src/services/subscriptionService.js` — `setupPurchaseListeners` fonksiyonu try/catch ile sarmalandı.** Kök neden: `expo-iap`'in `purchaseUpdatedListener`/`purchaseErrorListener` fonksiyonları native modül yokken (Expo Go'da her zaman, çünkü `expo-iap` custom native modül — dev client/EAS build gerektirir) **senkron throw** ediyor (`node_modules/expo-iap/build/ExpoIapModule.js` → `UnavailabilityError`). Bu throw, `SubscriptionContext.js`'deki async IIFE içinde yakalanmadığı için `Uncaught (in promise, id: 0)` hatasına yol açıyordu. Artık hata yakalanıp uyarı loglanıyor, no-op cleanup dönülüyor — uygulama çökmüyor.

**Çözülmeden kalan / kullanıcıya bildirilen:** `expo-iap` (satın alma) Expo Go'da hiçbir zaman gerçek çalışmaz — bu Expo Go'nun temel kısıtı, kod tarafında giderilemez. Gerçek IAP testi için **development build** (`npx expo run:ios` / EAS build) gerekiyor.

**Commit durumu:** Commit + push edildi — bkz. üstteki "2026-09-10 — Oturum değişiklikleri commit + push edildi" girdisi (`2551437`, `origin/master`).

---

## 3. Bilinen Sorunlar / Riskler

- **[Düşük öncelik, gerçek sorun değil]** `npx expo-doctor` şu uyarıyı veriyor: *"You have an app.json file in your project, but your app.config.js is not using the values from it."* — Yanlış pozitif: `app.config.js` zaten `module.exports = require('./app.json')` yapıyor, doctor'ın statik analizi bunu tanıyamıyor. Yükseltmeden bağımsız, önceden de vardı.
- **[ÇÖZÜLDÜ]** ~~`@expo/vector-icons` için `expo-font` peer dependency eksik~~ (2026-09-10 tamamlandı, `npx expo install expo-font`).
- **[ÇÖZÜLDÜ]** ~~Guideline 5.1.2(i) — AI sağlayıcılarına veri gönderirken açık onay + geri çekme seçeneği yok~~ (2026-09-10 tamamlandı — bkz. yukarıdaki günlük girdisi: `aiConsentService.js`, `AIConsentContext.js`, `AIConsentModal.js`, ProfileScreen'de geri çekme anahtarı). Uçtan uca tıklama testi kullanıcıya bırakıldı.
- **[ÇÖZÜLDÜ]** ~~`PrivacyInfo.xcprivacy` boş veri beyanı yapıyordu, ASC beyanıyla tutarsızdı~~ (2026-09-10 tamamlandı — `app.json` → `ios.privacyManifests`, bkz. yukarıdaki günlük girdisi).
- **Supabase Free Plan otomatik pause:** Proje 7 gün API trafiği almazsa tekrar duraklar (kullanıcı Pro'ya geçmek istemedi). Uzun süre geliştirme arası verilirse aynı DNS/502 hatası tekrar yaşanabilir — çözüm her seferinde dashboard'dan "Resume project" (veri kaybı yok, birkaç dakika sürüyor).
- **`expo-iap` Expo Go kısıtı:** Expo Go'da IAP her zaman "Cannot find native module" uyarısı verecek (artık crash etmiyor, sadece log). Gerçek satın alma testi sadece development build/TestFlight/production'da mümkün.
- **`supabase/functions/delete-account/index.ts`** proje kök `tsc --noEmit` taramasına dahil oluyor ve Deno globalleri (`Deno`, esm.sh import'ları) yüzünden tip hatası veriyor. Fonksiyonel bir sorun değil (Deno edge function, ayrı runtime), ama `tsconfig.json`'da `exclude` ile ayrılması temiz olur.

---

## 4. Yapılacaklar / Öneriler (öncelik sırasız)

- [x] ~~AGENTS.md ve CLAUDE.md dosyalarını bugünkü SDK 57 / deploymentTarget 16.4 / env-based Supabase config değişiklikleriyle güncelle.~~ (2026-09-10 tamamlandı)
- [x] ~~Bu oturumdaki değişiklikleri commit'le ve push et.~~ (2026-09-10 tamamlandı, commit `2551437`, `origin/master`'a push edildi)
- [x] ~~`eas.json` build image'ının SDK 57/RN 0.86 ile uyumluluğunu doğrula.~~ (2026-09-10 tamamlandı — `macos-sequoia-15.3-xcode-16.2` → `macos-tahoe-26.5-xcode-26.6` olarak güncellendi, bkz. yukarı)
- [x] ~~Kullanılmayan mikrofon izni placeholder'ını kaldır.~~ (2026-09-10 tamamlandı — `app.json` → `expo-image-picker` plugin config'ine `microphonePermission: false`)
- [x] ~~`eas.json` → `submit.production` alanını doldur.~~ (2026-09-10 tamamlandı — App Store Connect'ten Apple ID/ASC App ID/Team ID alındı)
- [x] ~~AI veri paylaşımı onay akışını Guideline 5.1.2(i)'ye uygun hale getir.~~ (2026-09-10 tamamlandı — bkz. yukarıdaki günlük girdisi. Uçtan uca elle test: kullanıcının TestFlight/gerçek hesapla yapması gerekiyor.)
- [x] ~~`PrivacyInfo.xcprivacy` ve App Store Connect "App Privacy" beyanını eşleştir.~~ (2026-09-10 tamamlandı — `app.json` → `ios.privacyManifests`)
- [x] ~~`npx expo install expo-font` ile eksik peer dependency'yi gider.~~ (2026-09-10 tamamlandı)
- [ ] `IOS_APP_STORE_YAYINLAMA_REHBERI.md` içindeki eski versiyon (1.0.0) / minimum iOS (13.4) bilgilerini güncelle (kozmetik, gerçek değerler: 1.2 / 16.4).
- [ ] Orta vadeli: AI yanıtları için caching + öncelikli istek kuyruğu, kalan ekranlarda (ProfileScreen, PaywallScreen, MealCalorieScreen) skeleton screen, AI yanıtlarında simüle streaming efekti + haptic feedback, büyük ekran dosyalarının (DietPlanScreen, FoodLogScreen, HomeScreen) katmanlara ayrıştırılması. Detaylar için ~/.claude/plans/ altındaki analiz raporuna bakılabilir — proje dışı, kalıcı değil, gerekirse tekrar üretilmeli.
- [ ] Bir sonraki EAS/TestFlight build'inde uçtan uca elle doğrulanması gerekenler: (a) AI onay modalının gerçek bir hesapla görünmesi/kabul-red/Profil'den geri çekme akışı, (b) App Store Connect'teki App Privacy beyanının hâlâ koddaki `ios.privacyManifests` ile birebir uyumlu olduğunun App Review öncesi son kez gözle kontrolü.

**Not:** Hiçbir ücretli AI/servis katmanına geçilmeyecek — kullanıcı talebi, kalıcı kısıt.

---

## 5. Hızlı Referans

- Ana proje dizini: `/Users/enesbugracengiz/Desktop/ESdiyetim`
- Mimari/konvansiyon detayları: `AGENTS.md`, `CLAUDE.md` (içerik aynı, ikisi de var)
- Supabase proje ref: `qyfagnhmhovhlpbllioq` (org: `ebcengiz`, Free Plan)
- Başlatma: `npx expo start` (Metro), sorun olursa önce `npx expo-doctor` çalıştır.
