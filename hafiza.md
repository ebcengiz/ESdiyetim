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

### 2026-09-16 — UI/UX yenileme programı Adım 1: Global hata yönetimi altyapısı (teknik uyarılar artık kullanıcıya sızmıyor)

**Bağlam:** Kullanıcı üç adımlı bir program onayladı: (1) hata yönetimi altyapısı, (2) tasarım sistemi + ortak UI kiti + Toast v2 + tab bar, (3) ekranların sırayla yenilenmesi (Login/Register → Home → DietPlan → Kilo&VKİ → Goals → Tips → Profile → MealCalorie/FoodLog → Paywall). **iPad için hiçbir şey yapılmayacak** (kullanıcı kararı; `UIDeviceFamily: [1]` korunuyor). Bu girdi Adım 1'i kapsar.

**Sorun:** Canlıda ham teknik hatalar ekrana yansıyordu — `showToast(e.message)` kalıbı 9 noktada Supabase (`fetch failed`, `JSON object requested…`), AI sağlayıcı (`Gemini API (429)…`, `Groq görsel API hatası (500): <400 karakter gövde>`, `.env içinde EXPO_PUBLIC_GEMINI_API_KEY tanımlayın`), expo-iap (`Cannot find native module`) ve `deleteAccount`'taki geliştirici talimatını (`supabase functions deploy…`) olduğu gibi kullanıcıya gösteriyordu. Ayrıca ErrorBoundary yoktu (render hatası → beyaz ekran / çökme).

**Yapılanlar:**
1. **Yeni katman `src/services/errors/`:** `AppError` (code/userMessage/severity/retryable/detail/cause), `normalizeError()` (ham hata → AppError: ağ/DNS/502, GoTrue auth mesajları, PostgREST/Postgres kodları, expo-iap kodları, AI onayı), `logError()` (beklenen durumlar WARN, gerisi ERROR — CLAUDE.md §5 kuralı korunuyor), `connectivity.js` (netinfo sarmalayıcı; "çevrimdışı" ile "sunucuya ulaşılamıyor" ayrımı), `globalHandlers.js` (`ErrorUtils.setGlobalHandler` + Hermes promise rejection tracker; dev'de RedBox korunur, prod'da fatal → ErrorBoundary ekranı).
2. **`src/constants/errorMessages.js`:** Tüm kullanıcı mesajlarının TEK kaynağı (~40 kod; Türkçe, sakin, yönlendirici). Teknik ayrıntı asla buraya yazılmaz.
3. **`src/components/ErrorBoundary.js`** + `App.js`'e eklendi (SafeAreaProvider → ErrorBoundary → AuthProvider…; provider sırası değişmedi). Yalnızca `__DEV__`'de teknik ayrıntı kutusu görünür.
4. **`src/hooks/useAppError.js`:** ekranlarda hata gösterimi için tek yol — `handleError(err, { context, fallbackCode, message, silent, silentCodes })`; AppError döndürür (ör. `AI_CONSENT_REQUIRED` için ekran kendi akışını kurar).
5. **`providers.js` temizlendi:** tüm `throw new Error(...)` → `AppError`; HTTP kodu/gövde/env adı yalnızca `detail` (→ console). 429→`AI_RATE_LIMIT`, 401/403→`AI_NOT_CONFIGURED`, 5xx→`AI_UNAVAILABLE`, abort→`AI_TIMEOUT`, safety block→`AI_CONTENT_BLOCKED`, JSON parse→`AI_PARSE_FAILED`.
6. **`aiService.js`:** fallback yanıtlarında `error` artık kod, `errorMessage` kullanıcı mesajı (ham `error.message` kaldırıldı). `logProviderError` → `fallbackResult()` + `logError`.
7. **`AuthContext`:** `signUp/signIn/signOut/updateProfile/deleteAccount` normalize edilmiş AppError döndürüyor; ekranlar `error.code` ile karar veriyor (`error.message.includes(...)` kalktı). Hesap silme geliştirici notu artık sadece log'da.
8. **`supabase.js`:** ortak `requireUser()` (24 tekrar kaldırıldı, `AUTH_SESSION_REQUIRED` AppError); `DUPLICATE_DATE` → `DB_DUPLICATE_DATE`.
9. **9 sızıntı noktası `handleError` ile değiştirildi:** Login, Register, MealCalorie, Profile (deleteAccount), Paywall (purchase/restore; `Alert.alert` kaldırıldı), WeightTracker, WeightPanel, FoodSearchModal, MealFoodPickerSection.
10. `hooks/useAlert.js` **silindi** (kullanılmıyordu, emoji'li `Alert.alert`); `hooks/useDataFetch.js` `Alert.alert`'siz yeniden yazıldı.
11. `@react-native-community/netinfo@12.0.1` eklendi (`npx expo install`; Expo Go'da gömülü, dev build'de prebuild ile gelir).

**Yan bulgu (gerçek bug, düzeltildi):** `supabase.js` içindeki `userCreditsService.getOrInit/increment` **tanımsız `getCurrentUser()`** çağırıyordu → her çağrı `ReferenceError` ile düşüyor, fotoğraf kredisi hiç Supabase'e yazılamıyor, `SubscriptionContext` sessizce cihaz-yerel sayaca düşüyordu (2026-09-16 premium limit düzeltmesinin bir bacağı fiilen çalışmıyordu). Artık `requireUser()` kullanıyor.

**Doğrulama:** 24 dosya babel ile syntax-check; `normalizeError` 21 gerçek hata örneğiyle (GoTrue, PostgREST, RN fetch, expo-iap) Node'da test edildi — tümü doğru koda eşlendi, `userMessage` içinde HTTP kodu/env/sağlayıcı adı sızmıyor; provider zinciri mock fetch ile 429/500/401/ağ/başarı senaryolarında test edildi. Cihazda uçtan uca deneme kullanıcıya bırakıldı.

**Kalan (Adım 3'te ekran ekran):** `GoalsScreen`, `BMIPanel`, `HomeScreen` vb. hâlâ `console.error + sabit toast` kalıbında (sızıntı yok ama `handleError`'a taşınacak). Offline banner Adım 2'de.

### 2026-09-16 — Canlıda premium/ücretsiz limitleri fiilen çalışmıyordu (kullanıcı bildirdi) — 3 gerçek hata bulundu ve düzeltildi

**Belirti (kullanıcı):** "Canlı sürümde premium ile ilgili hiçbir şey çalışmıyor" — somut örnek: ücretsiz kullanıcı günde 1 fotoğraf hakkına sahip olması gerekirken istediği kadar fotoğraf analizi yapabiliyor; "AI ile sınırsız besin analizi" ücretsiz planda günde 3 olması gerekirken 3'ten fazla kullanılabiliyor.

**Kök nedenler (kod incelemesiyle doğrulandı, cihaz gerektirmedi):**
1. **`src/components/dietPlan/MealFoodPickerSection.js`** (DiyetPlanı ekranındaki öğün düzenleme panelinin "AI ile tam analiz (Türkçe)" butonu) `getFoodNutritionAI`'ı **hiçbir abonelik/günlük limit kontrolü olmadan** doğrudan çağırıyordu — `FoodSearchModal.js`'deki aynı özellik doğru şekilde `dailyUsageService` + `isSubscribed` ile günde 3'e sınırlıyken, bu ikinci giriş noktası tamamen açık kalmıştı. Bu, "AI analizi sınırsız yapılabiliyor" şikâyetinin doğrudan nedeniydi.
2. **`src/contexts/SubscriptionContext.js`** — fotoğraf kredisi tamamen Supabase'e (`user_credits` tablosu) bağımlıydı; `loadDailyCredits`/`incrementDailyPhotoCredit` içinde herhangi bir hata (ağ, RLS, ya da CLAUDE.md'de zaten bilinen "Supabase Free Plan 7 günde paused olur" durumu) **sessizce "0 kullanıldı"ya düşüp limiti fiilen sınırsız hâle getiriyordu** (fail-open). Artırma işlemi Supabase'e yazılamasa bile artık oturum içinde cihaz-yerel sayaç (`DAILY_PHOTO_CACHE_KEY`, AsyncStorage) doğru artıyor; yükleme başarısız olursa 0 yerine son bilinen cihaz-yerel değere dönülüyor.
3. **`src/screens/PaywallScreen.js`** — `getPriceLabel` Store fiyatını `p.productId`/`storeProduct.localizedPrice` alanlarından okumaya çalışıyordu; `expo-iap` v4.2.0'da bu alanlar `id`/`displayPrice` olarak değişmiş (`node_modules/expo-iap/build/types.d.ts` ile doğrulandı) — paywall gerçek Store fiyatını hiç göstermiyor, her zaman sabit yedek fiyata (`FALLBACK_PRICE_LABELS`) düşüyordu. Düzeltildi.

**Doğrulama:** `npx expo export --platform ios` iki kez temiz derlendi (1078 modül, 0 hata). `eas env:list --environment production/preview` ile `EXPO_PUBLIC_IS_TESTFLIGHT`/`EXPO_PUBLIC_BYPASS_PAYWALL`'ın production'a sızmadığı doğrulandı (ayrı bir olası kök neden elendi). `user_credits` tablosunun canlı Supabase'de gerçekten var olduğu REST API ile doğrulandı (migration uygulanmış).

**Not:** Satın alma akışının kendisi (`initConnection`/`fetchProducts`/`requestPurchase`/`getAvailablePurchases`) `expo-iap` v4.2.0 kaynak koduyla satır satır karşılaştırıldı, doğru kullanılıyor — asıl sorun satın almada değil, ücretsiz limitlerin uygulanmamasındaymış.

### 2026-09-15 — Xcode 27 ile yerel build açılışta çöküyordu: "UIScene life cycle is required" → UIScene yaşam döngüsü config plugin'i ile eklendi

**Belirti:** Xcode 27.0 (27A266a) ile cihaza kurulan geliştirme build'i açılır açılmaz `EXC_BREAKPOINT` ile duruyordu: `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption ... Application failed to launch: UIScene life cycle is required for apps built with this SDK.`

**Kök neden:** iOS 27 SDK ile derlenen uygulamalarda Apple, scene tabanlı yaşam döngüsünü (UIScene / `UIApplicationSceneManifest`) **zorunlu** kıldı. Expo SDK 57'nin prebuild şablonu (57.0.22 dahil) hâlâ eski AppDelegate + `UIWindow(frame:)` modelini üretiyor; UIScene desteği ancak Expo SDK 58'de (şu an preview, RN 0.88-rc) geldi. Canlı uygulamayı preview SDK'ya taşımak riskli olduğu için SDK 58 şablonu (`ExpoAppSceneDelegate` + `SceneEventForwarder`) referans alınarak SDK 57'ye uyarlanmış bir config plugin yazıldı.

**Yapılanlar:**
1. `plugins/with-ios-uiscene-lifecycle.js` (yeni) — `withInfoPlist` ile `UIApplicationSceneManifest` (tek scene, `$(PRODUCT_MODULE_NAME).SceneDelegate`) ekler; `withAppDelegate` ile `didFinishLaunching` içindeki `window = UIWindow(...)` + `factory.startReactNative(...)` bloğunu kaldırır ve dosya sonuna `SceneDelegate: UIResponder, UIWindowSceneDelegate` sınıfını ekler. SceneDelegate: `scene(_:willConnectTo:)` içinde `UIWindow(windowScene:)` oluşturup RN'i başlatır, soğuk başlatma URL'lerini `launchOptions`'a çevirir (RN `Linking.getInitialURL()` için), `sceneDidBecomeActive/WillResignActive/WillEnterForeground/DidEnterBackground` ile URL/userActivity olaylarını `ExpoAppDelegate`'e iletir (expo-splash-screen ve expo-iap'ın `OnsideAppDelegateSubscriber`'ı `applicationDidBecomeActive` kullanıyor — bu iletim olmasa sessizce çalışmazlardı). Şablon değişirse plugin anlamlı hata fırlatır (`MARKER` ile idempotent).
2. `app.json` → `plugins` listesine `./plugins/with-ios-uiscene-lifecycle.js` eklendi (fmt fix plugin'inden hemen sonra).
3. `npx expo prebuild --platform ios` + `pod install` yeniden çalıştırıldı; üretilen `Info.plist` ve `AppDelegate.swift` doğrulandı.

**Notlar:**
- EAS build image'ı hâlâ `macos-tahoe-26.5-xcode-26.6` (iOS 26 SDK) → EAS/TestFlight build'lerinde bu zorunluluk yoktu, sorun yalnızca yerel Xcode 27 build'inde çıkıyordu. Plugin her iki SDK'da da çalışır (scene API'leri iOS 13+). EAS image'ı ileride Xcode 27'ye çekilirse bu plugin sayesinde sorun yaşanmaz.
- **Expo SDK 58'e geçildiğinde bu plugin kaldırılmalı** — SDK 58 şablonu kendi `SceneDelegate.swift`'ini üretiyor, ikisi çakışır.

### 2026-09-15 — Apple'a resmi bildirimler yapıldı (Support Case + Feedback Assistant) + TestFlight'sız ad-hoc build başlatıldı

Kullanıcı "commit/push et ve Apple'a talebi sen gönder, ad-hoc dağıtımı sen yap" dedi. Yapılanlar:

1. **Commit + push:** `0a789b4` — hafiza.md kök neden girdisi + `APPLE_SUPPORT_TALEBI_TESTFLIGHT.md` (`origin/master`).
2. **Apple Developer Support talebi gönderildi** (`claude-in-chrome`, developer.apple.com/contact → Distribution → TestFlight → Email): **Case ID 102963350199**. Form alanları: App ID 6753659091, build'ler 1.3.2 (6)/(1), 1.3.1 (1), 1.3 (4), platform iOS, tarih 2026-09-15, repro adımları + tam İngilizce metin (Team ID, sözleşme durumları, 422 hata JSON'u, forum thread referansları). Yanıt `enesbugracengiz@icloud.com` adresine e-posta ile gelecek.
3. **Feedback Assistant kaydı gönderildi:** **FB24778484** (Developer Tools & Resources → TestFlight → Incorrect/Unexpected Behavior; iOS + App Store Connect işaretli). Ek: `ESdiyet_BETA_CONTRACT_MISSING_evidence.txt` (istek/yanıt dökümü, build ID'leri, ASC GET sonuçları; bir kopyası `~/Desktop`'ta). "Eksik dosyalar" (sysdiagnose) uyarısı bilinçli olarak atlandı — backend sorunu için tanı dosyası anlamsız. Takip: https://feedbackassistant.apple.com/feedback/24778484
4. **EAS ad-hoc (`preview`) build başlatıldı** — `eas build --platform ios --profile preview --non-interactive --no-wait`, build id `0af0622c-66b3-427e-8df4-447a4cf6af7c`, versiyon 1.3.2 build 6 (remote autoIncrement). Mevcut ad-hoc provisioning profile (`R35H4B8DCG`, 16 Mart 2027'ye kadar geçerli) yalnızca kullanıcının iPhone'unu (`00008120-000A34D414600032`, EAS'ta zaten kayıtlı) içeriyor. **Kısıt:** Diğer tester'ların cihazlarını eklemek için `npx eas device:create` Apple ID + 2FA girişi istiyor → ajan yapamıyor; kullanıcı kendi terminalinden çalıştırıp "Website" seçeneğiyle kayıt linkini tester'lara göndermeli, sonra `eas build --profile preview` tekrar alınmalı (yeni profil cihazları kapsar).
5. **Ad-hoc build tamamlandı ve telefona kuruldu:** EAS build `finished` (00:32). IPA: https://expo.dev/artifacts/eas/C9xzy5jfCqDTtYXRYbYZAozdIn73r96-tAnW_76Dqgg.ipa (build sayfası: https://expo.dev/accounts/enesbugracengiz/projects/esdiyet/builds/0af0622c-66b3-427e-8df4-447a4cf6af7c). `embedded.mobileprovision` içindeki ProvisionedDevices doğrulandı (yalnızca kullanıcının iPhone'u). `xcrun devicectl device install app` ile Wi-Fi üzerinden eşli iPhone 15'e (iOS 27.0) kuruldu — önceki Xcode geliştirici kopyasının üzerine yazıldı, `com.esdiyet.app` 1.3.2 (6). TestFlight'a hiç dokunmadan gerçek cihazda test artık mümkün.
6. **Yapılamayan:** "Apple resolved deyince yeni build yükle" adımı doğası gereği Apple yanıtını bekliyor.

### 2026-09-15 — TestFlight kurulum hatasının KÖK NEDENİ KESİNLEŞTİ: Apple backend'inde "Beta Contract" kaydı kopuk (`ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING`) — kod/konfig sorunu DEĞİL

**Bağlam:** Bir önceki girdide (2026-09-14) ASC/Developer Portal üzerindeki tüm görünür kontroller temiz çıkmış, kök neden bulunamamıştı. Bu oturumda proje + yerel makine + cihaz + ASC API + web araştırması birlikte ele alındı.

**Yerel/cihaz bulguları (elenenler):**
- Üretilen `ios/ESdiyet/Info.plist`, entitlements (boş dict), `TARGETED_DEVICE_FAMILY=1`, `IPHONEOS_DEPLOYMENT_TARGET=16.4`, `UIRequiredDeviceCapabilities=[arm64]` — hepsi normal. `app.json`'un v1.2 (`17fc30c`) → HEAD farkı yalnızca: deploymentTarget 15.1→16.4, `privacyManifests`, splash plugin'e taşınma, `microphonePermission:false`. Hiçbiri kurulumu engelleyecek türden değil.
- Yerel makine artık **macOS 27.0 + Xcode 27.0 (27A266a), yalnızca iOS 27.0 SDK** kurulu (muhtemelen otomatik güncelleme). Kullanıcının iPhone 15'i de **iOS 27.0** (`xcrun devicectl`) — ASC tester listesindeki "iOS 26.3–26.4" bilgisi son kurulum anına (Mayıs) ait, güncel değil. Min iOS 16.4 sorunu yok.
- ASC API'den (`buildBundles`) çalışan 1.2 (1) ile çalışmayan 1.3.x build'lerinin metadata'sı karşılaştırıldı: entitlements (4 anahtar, aynı), `arm64`, `isIosBuildMacAppStoreCompatible`, `deviceProtocols`, `locales` **birebir aynı**; tek fark SDK (`23E237` → `23F81a`) ve minOS. Tüm 1.3.x build'leri `processingState: VALID`, `internalBuildState: IN_BETA_TESTING`, `expired: false`. Not: 1.3.1 (5) `EXPIRED` durumunda ve ASC'de **1.3.2 (6)** diye 14 Eylül 20:14'te (TR) yüklenmiş ek bir build daha var (bu oturum yüklemedi).
- Telefondaki ESdiyet 1.3.2 (1) kopyası `builtByDeveloper: true` — TestFlight'tan değil, Xcode/`expo run:ios --device` ile kurulmuş; TestFlight sorunuyla ilgisi yok ama temiz test için silinmesi önerilir.
- App kaydı: `removed: false`, `appStoreLegacyStatus: AVAILABLE_FOR_SALE`; Free/Paid Apps sözleşmeleri `InEffect` (175 ülke, TUR dahil, `ExpireSoon` alt durumu = 6 Ekim üyelik yenilemesi yaklaşıyor); `contractMessages` boş. Program License Agreement 18 Ağustos 2026'da yayınlanıp 24 Ağustos'ta kabul edilmiş (Mayıs'taki son başarılı kurulum ile Eylül'deki ilk başarısız build arasında — muhtemel tetikleyici, ama Apple tarafı).

**Kesin kanıt (kullanıcının açık izniyle yapılan prob):** ASC web oturumundan `POST /iris/v1/betaAppReviewSubmissions` (build 1.3.2 (6), id `941dbf0d-c02e-492b-8f77-90443db0d5e2`) → **HTTP 422 `ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING` — "Beta contract is missing for the app."** (hata id `c8b86c83-d2b4-4eb1-bb60-f0f94726ba4a`). Yan etki yok (submission oluşmadı). Bu hata, Apple Developer Forums'ta 2026 boyunca (Şubat→Eylül) yüzlerce geliştiricinin bildirdiği, belirtileri birebir aynı olan (build'ler Valid + tüm sözleşmeler Active + internal tester'lar "The requested app is not available or doesn't exist") **Apple backend sorunudur**; TestFlight'ın app/team başına tuttuğu iç "beta contract" kaydı düşüyor. Public API ile oluşturulamıyor/sıfırlanamıyor; **yalnızca Apple mühendisinin manuel re-provision etmesiyle** çözülüyor (thread 814565/815885: "The issue should be resolved now. Please upload another build after 48 hours."). Bilinen hiçbir self-service çözüm yok (yeni build, tester silme/ekleme, TestFlight yeniden kurma, sözleşme yeniden kabul — hiçbiri işe yaramıyor). App Store dağıtımı etkilenmiyor (1.3.1/1.3.2 App Store'a normal gitti).

**Çıktı:** `APPLE_SUPPORT_TALEBI_TESTFLIGHT.md` oluşturuldu — kanıt JSON'u, nereye yazılacağı (developer.apple.com/contact → App Store Connect → TestFlight **ve** Feedback Assistant, HAR ekiyle), kopyala-yapıştır İngilizce destek metni (Team ID, App ID, build'ler, tarihler, sözleşme durumları dahil) ve Apple düzeltene kadar TestFlight'sız test yolu (EAS `preview` profili = ad-hoc internal distribution, `eas device:create` ile UDID kaydı).

**Sırada (kullanıcı):** 1) Destek talebini ve Feedback Assistant kaydını gönder. 2) Apple "resolved" deyince (genelde 48 saat sonra) yeni bir build yükle (`eas build` → `eas submit`); mevcut build'ler kendiliğinden düzelmeyebilir. 3) Tester'lara bu sürede EAS internal (ad-hoc) build linki ver.

### 2026-09-14 — TestFlight "İstenilen uygulama kullanılamıyor veya yok" kurulum hatası — kapsamlı ASC/Developer Portal analizi (kök neden hâlâ tam netleşmedi, iOS-sürüm teorisi elendi)

**Bağlam:** Kullanıcı gerçek iPhone'unda ESdiyet'i TestFlight'tan yükleyemiyor ("ESdiyet yüklenemedi. İstenilen uygulama kullanılamıyor veya yok."), ekran görüntüsü paylaştı. v1.2 TestFlight'ta sorunsuz yükleniyordu, SDK 54→57 yükseltmesinden (2026-09-10) sonraki hiçbir build (v1.3, v1.3.1, v1.3.2) yüklenemiyor.

**Elenen teoriler (kanıtla):**
1. **Mac TestFlight / Catalyst kurulum sorunu** (2026-09-14'ün önceki girdisindeki teori) — kullanıcı bunun gerçek bir iPhone olduğunu doğruladı, ekran görüntüsü de iOS durum çubuğu (saat/pil) gösteriyor. **Elendi.**
2. **`deploymentTarget` 15.1→16.4 artışı nedeniyle test cihazının iOS sürümü yetersiz kalıyor** — ilk başta en güçlü teori gibi görünüyordu (SDK 56/57'nin zorunlu minimumu, web araştırmasıyla da doğrulandı: bu hata mesajının en yaygın nedeni). **Ancak ASC → TestFlight → "ESdiyet Test" grubu → Testers listesi kontrol edildi: 5 testerin 4 farklı gerçek iPhone'u (12, 13, 15, 16 Pro Max) hepsi iOS 26.3.1–26.4.1 çalıştırıyor** (16.4'ün çok üzerinde) — **kesin olarak elendi.**
3. **Export Compliance / "Missing Compliance" bayrağı** — Build 1.3.2'nin "Build Metadata" sekmesinde `App Uses Non-Exempt Encryption: No` doğru şekilde işlenmiş görünüyor, build satırında/sayfasında hiçbir uyarı ikonu/banner yok. **Elendi.**
4. **Provisioning profile / sertifika süresi dolmuş/eksik** — Apple Developer Portal → Certificates hepsi geçerli (en yakın son kullanma 2026/10/05), `com.esdiyet.app` için tek bir App Store provisioning profile var (`[expo] ... AppStore`, 2026-09-11'de oluşturulmuş, 2027/03/16'ya kadar geçerli). **Elendi.**
5. **Apple sistem geneli kesinti** — `developer.apple.com/system-status` tüm servisler (App Store Connect, TestFlight, Provisioning Profile Service dahil) yeşil/available. **Elendi.**
6. **Build pipeline farkı (manuel `xcodebuild archive` vs. `eas build` bulut)** — İlk başta güçlü şüpheliydi (son 2 build manuel yapılmıştı). Ancak **v1.3 (build 4) ve v1.3.1 (build 5) tamamen `eas build --platform ios --profile production` ile (EAS'ın yönetilen bulut sertifikalarıyla) üretildi ve onlar da 0 install aldı** — yani sorun build yöntemine bağlı değil, SDK 57 sonrası HER build'de var. **Elendi (tek başına neden değil).**

**Kritik bulgu (kanıt, ama kök neden değil):** "ESdiyet Test" grubundaki **5 testerin hiçbiri, 4 gündür (Sep 11-14) art arda yüklenen 4 farklı build'in (1.3 build4, 1.3.1 build5, 1.3.1 build1, 1.3.2 build1) HİÇBİRİNİ kuramamış** — hepsi son başarılı kurulumda "1.2 (1)" üzerinde donmuş durumda (en son başarılı kurulum: 3 Mayıs 2026). Bu, sorunun tek bir cihaza/tester'a/build'e özgü olmadığını, SDK 57 yükseltmesiyle birlikte gelen ve build metadata'sında (Device Family, entitlements, encryption, min iOS hariç) görünmeyen bir şeyin **tamamen kurulumu engellediğini** gösteriyor.

**Sonuç:** ASC/Developer Portal üzerinden yapılabilecek tüm görünür kontroller tüketildi, hepsi temiz çıktı. Apple Developer Forumlarında aynı hata mesajıyla ("The requested app is not available or doesn't exist", internal testing) başka geliştiricilerin de bildirdiği, **çözümsüz kalmış / muhtemelen Apple platform tarafı bir sorun** olduğu görülüyor (bkz. `developer.apple.com/forums/thread/812811`).

**Önerilen sıradaki adımlar (henüz uygulanmadı, kullanıcı kararı bekliyor):**
1. **En yüksek değerli adım:** Başarısız kurulum anında Mac'e bağlı iPhone'da Xcode → Window → Devices and Simulators → cihaz seçilip "View Device Logs" (veya Console.app ile canlı log) ile `installd`/`MobileInstallation` loglarının yakalanması — ASC'nin web arayüzünde görünmeyen gerçek reddetme nedenini gösterir.
2. Tamamen temiz bir `eas build --platform ios --profile production` → `eas submit` ile (hiç manuel `xcodebuild` adımı olmadan) yeni bir build denenmesi.
3. Sorun sürerse Apple'a Feedback Assistant / Developer Support üzerinden bildirim.
4. **Süreç tutarlılığı önerisi:** `eas.json` production profili `macos-tahoe-26.5-xcode-26.6` imajını pin'liyor ama son 2 build tamamen manuel `xcodebuild archive` ile (yerel Mac'in kendi Xcode'uyla) yapıldı — EAS'ın submit credential'ları hâlâ kullanılıyor ama build image pin'i fiilen devre dışı kalıyor. İleride tek bir pipeline'a (önerilen: `eas build`) sadık kalınması, debug sırasında değişken sayısını azaltır.

### 2026-09-14 — Monetizasyon bilgilendirmesi ProfileScreen'e eklendi + TestFlight açılmama sorunu yeniden araştırıldı

**Bağlam:** Kullanıcı "App Store'da yayınlandı ama para kazanma açık değil, bir şey mi kaldırıldı?" ve "TestFlight'ta uygulama hâlâ açılmıyor, var olan sorun devam ediyor" diye sordu.

**Monetizasyon araştırması:** Kod incelemesi + App Store Connect kontrolü ile doğrulandı — bu bir hata değil, 2026-09-10'daki bilinçli monetizasyon pivotunun (bkz. aşağıdaki 2026-09-10 girdisi) beklenen sonucu: `PremiumGate` 4 ana ekrandan (Home/DietPlan/Goals/WeightAndBMI) kalıcı olarak kaldırılmış, artık yalnızca fotoğraf analizi (ücretsiz 1/gün, premium 5/gün) ve "AI ile tam analiz" (ücretsiz 3/gün) sınırlanıyor. App Store Connect'te 3 abonelik ürünü de **Approved**, Paid Apps Agreement/Banka/Vergi **Active** — sunucu tarafında engelleyici bir durum yok.
- **Kullanıcıyı bilgilendirme eksikliği giderildi:** `ProfileScreen.js`'de daha önce hiç abonelik/üyelik bilgisi yoktu. Yeni "Üyelik" bölümü eklendi: ücretsiz kullanıcıya günlük kullanım sayaçlarını (`{dailyPhotoUsed}/{dailyLimit}`, `{aiSearchUsed}/{FREE_AI_SEARCH_DAILY_LIMIT}`) ve güncel fiyatları gösterir + "Premium'a Geç" butonu (`openPaywall()`); premium kullanıcıya "Premium Aktif" rozeti + "Aboneliği App Store'dan yönet" linki (`itms-apps://apps.apple.com/account/subscriptions`).
- **Küçük refactor (kod tekrarını önlemek için):** `FREE_AI_SEARCH_DAILY_LIMIT`/`AI_SEARCH_USAGE_KEY` (önceden sadece `FoodSearchModal.js` içinde lokaldi) ve `FALLBACK_PRICE_LABELS` (önceden `PaywallScreen.js` içinde lokaldi) artık `subscriptionService.js`'den export ediliyor, üç dosya (`FoodSearchModal.js`, `PaywallScreen.js`, `ProfileScreen.js`) aynı kaynaktan okuyor.
- `user_credits` tablosunun RLS politikaları (`supabase/migrations/20260416120000_user_credits.sql`) kontrol edildi — `auth.uid() = user_id` ile doğru şekilde kısıtlanmış, production'da güvenli.
- **Doğrulama:** Değişen 4 dosya Babel ile syntax kontrolünden geçti; `npx expo export --platform ios` 1078 modülle hatasız bundle etti.
- **Not:** `CLAUDE.md` hâlâ var olmayan `PremiumGate` bileşeninden bahsediyor (2026-09-10'da silindi) — güncellenmedi, ileride düzeltilmeli.

**Yayınlandı:** Değişiklikler `master`'a commit + push edildi (`ad06bb4`, `3978aa7`). `app.json` version `1.3.2`'ye bump edildi (1.3.1 zaten "Ready for Distribution" olduğu için aynı versiyona yeni build eklenemiyordu). `npx expo prebuild --clean` + `xcodebuild archive`/`-exportArchive` (destination: upload) ile Build 1 (1.3.2) doğrudan App Store Connect'e yüklendi, yeni **1.3.2** versiyonu oluşturuldu, "What's New" dolduruldu, Build 1 bağlandı, **Submit for Review** yapıldı → durum **"1.3.2 Waiting for Review"**.

**TestFlight açılmama sorunu — yeni bulgu:** App Store Connect → TestFlight → Crashes sekmesi **"No Crash Feedback"** gösteriyor (Build 1 için) — yani uygulama gerçek bir runtime crash yaşamıyor, muhtemelen hiç kurulamıyor/açılamıyor. Build 1'in metadata'sı (`Binary State: Validated`, `Device Family: iPhone`, entitlements normal, `Minimum iOS Version: 16.4`) sorunsuz görünüyor, gruplara (`beta`, `ESdiyet Test`) doğru atanmış. Kullanıcının paylaştığı hata ekran görüntüsü (masaüstü pencere görünümlü, sol tarafta "Şu Anda Test Edilenler" listesi) **macOS TestFlight uygulaması**na benziyor — ESdiyet `supportsTablet: false` / `UIDeviceFamily: [1]` (yalnızca iPhone, Mac Catalyst/iPad desteği yok) olduğu için TestFlight for Mac'in bu build'i kuramaması **güçlü bir olasılık**. **Doğrulanamadı** (fiziksel cihaz/insan etkileşimi gerekiyor) — kullanıcıdan gerçek bir iPhone'da (Mac değil) TestFlight iOS uygulamasıyla denemesi istendi, sonuç bekleniyor.



### 2026-09-12 — KRİTİK: v1.3 (build 4) canlıda açılışta çöküyordu — kök neden bulundu, v1.3.1 (build 5) ile düzeltilip Apple'a expedited review ile gönderildi

**Bağlam:** Kullanıcı "yeni güncellemeyi dün yükledik, canlıda kullanıcılar uygulamaya giremiyor, TestFlight'tan da yüklenemiyor" diye bildirdi.

**Kök neden (kesin, doğrulandı):** `src/services/supabase.js`, `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` eksikse modül yüklenirken **senkron `throw`** atıyor. 10 Eylül'deki `2551437` commit'i bu değerlerin okunma şeklini hardcoded'dan `.env`'e taşımıştı. Yerel simülatör testleri hep başarılıydı çünkü Metro yerel `.env`'i okuyor — ama **EAS Build sunucularında bu değişkenler hiçbir ortamda (`production`/`preview`/`development`) hiç tanımlı değildi** (`npx eas env:list` ile doğrulandı, hepsi boştu; legacy `eas secret:list` de boştu). Sonuç: `eas build --profile production` ile alınan **Build 4** (hem TestFlight'a hem App Store'a giden tek build, App Store'da "Automatically release" ayarıyla otomatik yayınlandı) boş Supabase bilgisiyle derlendi → React hiç mount olmadan çöküyor, kullanıcı splash ekranında sonsuza kadar donuyor. TestFlight'ta da aynı build 0 install/0 session gösteriyordu (önceki 1.2 build'i 7 install almıştı).

**Düzeltme:**
1. `eas env:create` ile eksik 4 değişken (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_GROQ_API_KEY`) `production`/`preview`/`development` ortamlarına eklendi (kullanıcı onayıyla — Claude Code'un "Secret-Store Writes" otomatik sınıflandırıcısı ilk denemede engelledi, açık onay sonrası geçti).
2. `app.json` → `version: "1.3.1"` (commit `e0b7eea`) — çünkü 1.3 zaten App Store'da "Ready for Distribution" (yayında) durumundaydı, aynı versiyona yeni build eklenemiyor.
3. `eas build --platform ios --profile production` ile **Build 5** alındı, build loglarında env değişkenlerinin doğru yüklendiği doğrulandı.
4. `eas submit` ile Build 5 App Store Connect'e yüklendi (kullanıcı onayıyla — "Production Deploy" sınıflandırıcısı ilk denemede engelledi).
5. App Store Connect'te yeni **1.3.1** versiyonu oluşturuldu, Build 5 bağlandı, "What's New" dolduruldu, **Submit for Review** yapıldı (kullanıcı onayıyla) → durum **"1.3.1 Waiting for Review"**. "Automatically release" + "Release to all users immediately" zaten seçiliydi (dokunulmadı) — onaylanır onaylanmaz otomatik yayına girecek.
6. `developer.apple.com/contact/app-store/?topic=expedite` üzerinden **expedited review** talep edildi (canlı çökme gerekçesiyle) — Apple onayladı: "We'll expedite review for ESdiyet." Normalde 1-2 gün yerine 6-24 saat içinde sonuçlanması bekleniyor.

**Not (paralel oturum çakışması):** Bu görev sırasında kullanıcının başka bir cihazdan/oturumdan başlattığı bir arka plan ajanı da **aynı App Store Connect hesabında, aynı paylaşılan tarayıcı sekmesinde** bağımsız olarak aynı submit işlemini yapmaya çalıştı (muhtemelen benim submit'imle aynı ana denk geldi). Sonuç çakışmadı (ASC tek submission state'i koruyor, "1.3.1 Waiting for Review" tek ve tutarlı), ama ileride aynı anda birden fazla oturumun aynı ASC hesabına dokunması race condition riski taşıyor — dikkat edilmeli.

**Doğrulanmayı bekleyen:** Kullanıcının TestFlight'tan Build 5'i gerçekten açıp çalıştığını doğrulaması, ve Apple onayından sonra App Store'daki 1.3.1'in gerçekten düzelmiş olduğunun teyidi.

**Sistemik risk (henüz ele alınmadı, öneri):** `supabase.js`'teki module-level `throw`, yanlış yapılandırılmış HERHANGİ bir gelecek build'i aynı şekilde tamamen açılamaz hale getirebilir (React hiç mount olmadığı için hiçbir error boundary bunu yakalayamıyor). İleride bu tip bir yapılandırma hatasını daha nazik şekilde (en azından bir hata ekranı göstererek) ele almak değerlendirilebilir — bu görevde kapsam dışı bırakıldı, sadece kök neden (eksik env var) düzeltildi.

### 2026-09-11 — v1.3 build 4, App Store Connect'te yeni versiyon olarak oluşturulup Apple incelemesine gönderildi

Kullanıcı "kontrol et, submit for review'a gönder" dedi (önceki archive/submit adımından sonra). App Store Connect'te (Distribution sekmesi) yapılanlar:

- Mevcut yayında olan versiyon **1.2 "Ready for Distribution"** idi — yeni bir **1.3** versiyonu oluşturuldu ("+ iOS App" → New Version dialogu).
- Yeni versiyon, 1.2'den metadata'yı (açıklama, ekran görüntüleri, anahtar kelimeler, App Review bilgileri, sign-in bilgisi, notlar) otomatik miras aldı — elle yeniden girilmedi.
- **"What's New in This Version"** alanı boştu, bu sürümdeki gerçek değişikliklerle dolduruldu (temel özelliklerin ücretsizleşmesi, 3 günlük ücretsiz deneme, düşürülen fiyatlar, AI günlük kullanım hakları netleştirmesi, küçük arayüz düzeltmeleri).
- **Build** bölümünden EAS ile daha önce yüklenen **Build 4 (v1.3)** seçilip versiyona bağlandı.
- Save → "Add for Review" → açılan "Draft Submission" panelinde "iOS App 1.3 (4)" öğesi görüldü → **"Submit for Review"** ile onaylandı.
- Sonuç: **"1 Item Submitted — It can take up to 48 hours to be reviewed. You'll get an email when the review is complete."** Sol menüde durum **"1.3 Waiting for Review"**.
- Artık kullanıcının yapacağı bir şey yok, sonucu Apple'dan gelecek e-postadan takip edecek. Onaylanırsa (Guideline 5.1.2(i) AI onay akışı ve Privacy Manifest daha önce bu sürüme dahil edildiği için) versiyon manuel/otomatik release ayarına göre App Store'da yayına girecek (mevcut ayar: manuel release, kullanıcı henüz "Automatically release" seçmedi — onay sonrası kullanıcının elle "Release This Version" demesi gerekebilir, bu adım henüz konuşulmadı).

### 2026-09-11 — Monetizasyon değişiklikleriyle yeni archive (v1.3 build 4) alındı ve App Store Connect'e submit edildi

Önceki gündeki monetizasyon paketi (paywall gevşetme, fiyat düşürme, günlük AI limitleri, TestFlight'ın tamamen ücretsiz olması) ve Apple review'e gönderilen açıklama güncellemesi App Store Connect'e ulaştırıldı:

- `app.json` → `version: "1.2"` → **`"1.3"`** olarak bump edildi (commit `aca6059`). `eas.json`'da `cli.appVersionSource: "remote"` ve `build.production.autoIncrement: true` olduğu için iOS build numarası manuel değil, EAS sunucusunda otomatik yönetiliyor — `ios.buildNumber` alanına dokunulmadı.
- `eas build --platform ios --profile production` **non-interactive modda credential hatasıyla başarısız oldu** ("Distribution Certificate is not validated for non-interactive builds") — Apple hesabına bağlı sertifika doğrulaması interaktif terminal + Apple ID/2FA istiyor, bu benim arka plan komut çalıştırma aracımla (stdin yok) yapılamıyor. Kullanıcıdan kendi terminalinde interaktif çalıştırmasını istedim, kullanıcı tamamladı.
- Sonuç: **Version 1.3, Build 4**, profile `production`, distribution `store`, status `finished`. Build ID: `acb4c876-5cc0-4b5d-b6e4-a7df63b3295c`.
- `eas submit --platform ios --id ...` de aynı sebeple (bu sefer "App Store Connect API Keys cannot be set up in --non-interactive mode") interaktif terminal gerektirdi — kullanıcı kendi terminalinden API Key oluşturup Apple ID/2FA ile submit'i tamamladı.
- App Store Connect → TestFlight → iOS Builds sayfasında doğrulandı: **Version 1.3, Build (4) — Status: Complete / Ready to Submit**, "ESdiyet Test" internal testing grubuna bağlı, 90 gün geçerli.
- **Kullanıcı ayrıca "Xcode üzerinden sen yap" diye sordu** — araştırıldı: yerel Keychain'de sadece bir Development sertifikası var, Distribution sertifikası/provisioning profile yerelde yok (hepsi EAS'in uzak sunucusunda), yerelde archive almak için önce Apple Developer portalından bunları indirip kurmak gerekirdi (yine interaktif Apple ID/2FA) + Xcode'un GUI'sini (Organizer/Distribute App sihirbazı) kontrol edebilecek bir aracım yok (sadece tarayıcı otomasyonu var, macOS masaüstü uygulama kontrolü yok). Bu bilgiyle kullanıcıya seçenek sunuldu, kullanıcı EAS submit yolunu tamamlamayı tercih etti.
- **Önemli kısıt/ders:** EAS build ve submit'in credential adımları (Distribution Certificate doğrulama, App Store Connect API Key oluşturma), Apple ID + muhtemelen 2FA gerektirdiğinde **ajan tarafından otomatikleştirilemiyor** — bu adımlar her zaman kullanıcının kendi interaktif terminalinden yapılması gerekiyor. Bir sonraki build/submit döngüsünde API Key zaten EAS sunucusunda saklı olacağından `eas submit` muhtemelen non-interactive çalışabilir; `eas build` credential doğrulaması ise sertifika süresi dolmadıkça genelde tekrar interaktif istemez.

### 2026-09-10 — Monetizasyon stratejisi kökten değişti: paywall gevşetildi, fiyatlar düşürüldü, ücretsiz deneme eklendi

**Bağlam:** Kullanıcı "kimse uygulamayı satın almıyor, nasıl çözelim?" diye sordu. Web araştırması + kod incelemesi yapıldı; kök nedenler bulundu:
1. **Ana Sayfa (girişten sonraki ilk ekran) tamamen paywall arkasındaydı** — kullanıcı hiç değer görmeden "Premium'a Geç" duvarıyla karşılaşıyordu. DietPlan/Hedefler/Kilo&VKİ de tamamen kilitliydi.
2. **Hiç ücretsiz deneme yoktu.**
3. Buna karşın Besin Takibi (AI destekli, en "wow" özellik) tamamen ücretsiz ve sınırsızdı — freemium mantığı ters kurulmuştu.
4. **Fiyat rakiplere göre çok yüksekti:** ₺249,99/ay — YAZIO Pro'nun ₺44,99/ay'ına göre ~5,5 kat.

Kullanıcı "hepsini birden yap" dedi + "TestFlight/Expo denemeleri için tamamen ücretsiz yap" ek talebi geldi. Yapılanlar:

**A) Kod tarafı:**
- `src/utils/environment.js`: `bypassPaywall` artık `isTestEnv` (TestFlight + dev/Expo Go) durumunda otomatik `true` — test edenler hiçbir şey için ödeme yapmadan tüm özellikleri dener. Production'da gerçek kullanıcılar etkilenmez.
- **`PremiumGate` tamamen kaldırıldı** (`HomeScreen`, `DietPlanScreen`, `GoalsScreen`, `WeightAndBMIScreen`'den import + JSX sarmalayıcı silindi) — artık `src/components/PremiumGate.js` dosyası da kullanılmadığı için silindi. Bu 4 ekran artık tamamen ücretsiz.
- **Freemium yeniden dengelendi** (`SubscriptionContext.js`): Fotoğraf analizi artık ücretsiz kullanıcıya günde 1, premium'a günde 5 hak veriyor (`FREE_DAILY_LIMIT`/`PREMIUM_DAILY_LIMIT`) — önceden ücretsiz kullanıcı 0 hak alıyordu (`isSubscribed &&` şartı vardı), bu tersine çevrildi.
- **`MealCalorieScreen.js`**: Sert `if (!isSubscribed) openPaywall()` engeli kaldırıldı, artık `canUsePhotoToday` (yeni limit mantığıyla) kontrol ediliyor; limit dolunca ücretsiz kullanıcıya yükseltme mesajı + paywall, premium kullanıcıya "yarın tekrar dene" mesajı.
- **Yeni:** `src/services/dailyUsageService.js` — cihaz-yerel (AsyncStorage) genel amaçlı günlük sayaç servisi (yumuşak limit, sunucu doğrulaması yok).
- **`FoodSearchModal.js`**: "AI ile tam analiz" butonu artık ücretsiz kullanıcı için günde 3 ile sınırlı (`dailyUsageService` ile), premium sınırsız. Veritabanı (Open Food Facts/USDA) araması hâlâ tamamen serbest — sadece AI fallback'i sınırlı.
- **Fiyatlar kod içinde güncellendi** (`subscriptionService.js` PLAN_META, `PaywallScreen.js` fallback + FEATURES listesi + üst açıklama metni): Aylık ₺249,99→₺99,99, 3 Aylık ₺166,66/ay→₺66,66/ay, Yıllık ₺74,99/ay→₺29,17/ay (gerçek ASC fiyatına göre — bkz. aşağı). PaywallScreen'in özellik listesi artık "her şey ücretsiz zaten, premium = AI limitlerini kaldırır" mesajını veriyor (önceden "diyet planı/hedefler premium'a özel" diyordu, artık yanlış).

**B) App Store Connect (kullanıcının izniyle, `claude-in-chrome`):**
- **3 abonelik planının gerçek fiyatı Türkiye'de değiştirildi** (sadece TR, diğer ülkeler dokunulmadı): Aylık ₺249,99→**₺99,99**, 3 Aylık ₺499,99→**₺199,99**, Yıllık ₺899,99→**₺349,99** (hedeflenen ₺359,99 yerine mevcut fiyat kademesindeki en yakın değer alındı — kod buna göre düzeltildi).
- **Her 3 plana da 175 ülkede geçerli "Free for the first 3 days" (3 gün ücretsiz deneme) Introductory Offer eklendi** — sektör araştırmasında "sweet spot" olarak öne çıkan model.
- ESdiyet Aylık'ın App Store açıklaması ("3 daily photo calorie analyses" / "Yapay zeka ile kalori...") yeni limitlere göre güncellendi ama **sadece taslak olarak kaydedildi, Apple incelemesine gönderilmedi** — bu ayrı bir "yayınlama" kararı olduğu için kullanıcının onayı bekleniyor.
- **Not:** Oturum bir kez düştü (App Store Connect), kullanıcı yeniden giriş yaptı, 3 Aylık planın fiyat değişikliği baştan yapıldı (ilk deneme kaydedilmemişti).

**Doğrulama:** Babel syntax + `expo export` bundle testi (temiz) + gerçek simulator build'i, Ana Sayfa ve Diyet Planı ekranlarının artık paywall'sız açıldığı ekran görüntüsüyle doğrulandı.

**2026-09-11 güncellemesi:** Kullanıcı "Apple incelemeye gönder" dedi. ESdiyet Aylık'ın güncellenen açıklaması (EN: "5 daily AI photo analyses", TR: "Günde 5 AI fotoğraf analizi") App Store Connect'te "Add for Review" → "Submit for Review" ile Apple'a gönderildi. Sonuç: **"1 Item Submitted — 48 saate kadar sürebilir, inceleme bitince e-posta gelecek."** Artık kullanıcının beklemesi dışında yapılacak bir şey yok; sonucu e-postadan takip edecek.

### 2026-09-10 — HomeScreen refactor (aynı yaklaşım devam, 3 büyük ekranın tamamı bitti)

Kullanıcı "devam et" dedi, backlog'daki son büyük dosyaya geçildi. HomeScreen, DietPlanScreen/FoodLogScreen'den farklı olarak büyük "kendi state'ine sahip" bir alt bileşen içermiyordu (arama modalı gibi) — bunun yerine çok sayıda bağımsız/tekrar eden sunum bloğu vardı. Aynı çıkarma prensibi (props-driven, parent state'e dokunmadan) uygulandı:

- `src/components/home/HomeWidgets.js`: MealItem, KpiPill, SectionHeader, QuickActionButton + yeni **HomeActionCta** (önceden "Fotoğraftan kalori" ve "Besin Takibi" kartları neredeyse birebir kopya JSX'ti, tek parametreli bileşene indirildi — DRY kazancı).
- `src/components/home/HomeHeroHeader.js`: Üst gradyan karşılama bölümü. Giriş animasyonu (`heroEnterAnim`) parent'tan buraya taşındı — artık tamamen kendi kendine yeten bir bileşen.
- `src/components/home/HomeStatsRow.js`: Kilo/Diyet istatistik kartları + "Bugün Yediklerim" kartı (`HomeStatsRow`, `FoodSummaryCard`).
- `src/components/home/HomeSections.js`: "Bugünün Diyetim", "Günün Tavsiyesi", "Hızlı İşlemler" bölümleri (`TodayDietSection`, `DailyTipSection`, `QuickActionsSection`).
- Ana dosyada kalan: state yönetimi (latestWeight/todayDiet/randomTip/dailySummary/todayFoodSummary), `loadData` (paralel Promise.allSettled ile 5 kaynaktan veri çekme), tarih/etiket hesaplamaları, navigasyon callback'leri.
- **Sonuç: 1167 → 310 satır (~%73 azalma).**
- **Doğrulama:** Babel syntax + `expo export` bundle testi (1210 modül) + gerçek simulator build'i (`expo run:ios`, log dosyasına yönlendirip `until grep` ile beklenildi — artık standart yöntem). Ekran görüntüsü: 0 error/1 warning (bilinen `UIDeviceFamily` uyarısı, kod dışı), oturum korunarak açıldı. **Aynı kısıt:** `idb` yok, PremiumGate arkasındaki (test hesabı abone değil) gerçek Ana Sayfa içeriğine tap ile ulaşılamadı — kullanıcının elle kontrol etmesi gerekiyor.

**Backlog'daki üç büyük ekranın (DietPlanScreen, FoodLogScreen, HomeScreen) tamamı bu prensiple ayrıştırıldı.** Kalan orta vadeli maddeler: dokümantasyon zaten güncellendi, AI caching/skeleton/streaming zaten yapıldı — orta vadeli listesinde büyük madde kalmadı.

### 2026-09-10 — ProfileScreen Switch clipping düzeltmesi + FoodLogScreen refactor (aynı yaklaşım devam)

Kullanıcı ekran görüntüsüyle bir bug bildirdi + "aynı yaklaşımla devam et" dedi.

1. **Bug düzeltmesi:** Profil ekranındaki "Yapay Zeka Veri Paylaşımı" satırında `Switch` sağdan kırpılıyordu (ekran görüntüsünde sadece yarım bir daire görünüyordu). Kök neden: `menuLeft` container'a `flex: 1` verilmemişti, uzun alt metin (`"Kapalı — AI önerileri ve fotoğraf analizi çalışmaz"`) satırı doğal genişliğine göre büyüyor, `menuCard`'ın `overflow: 'hidden'`'ı Switch'i kırpıyordu. `src/screens/ProfileScreen.js`: `menuLeft`'e `{ flex: 1 }` + subtitle'a `numberOfLines={2}` + Switch'e `flexShrink: 0` eklendi.
2. **`src/components/ui/DatePickerSheet.js`:** DietPlanScreen refactor'ünde oluşturulan tarih seçici sheet'i `dietPlan/` klasöründen genel `ui/` klasörüne taşındı (FoodLogScreen'de birebir aynı desen tekrar kullanılıyordu — kod tekrarını önlemek için).
3. **FoodLogScreen.js refactor (1357 → 369 satır, ~%73 azalma):** Aynı prensip — güvenli/mekanik parçalar çıkarıldı, riskli olan yok zaten (arama modalı kendi state'ine sahip, parent'a bağımlı değildi):
   - `src/constants/foodLogFields.js` (MEAL_TYPES, DAILY_GOAL_KCAL, DAILY_GOAL)
   - `src/utils/foodLogUtils.js` (toLocalDate, fmt, getSourceBadgeMeta)
   - `src/components/foodLog/MacroWidgets.js` (MacroPill, MacroGridCell, CalcChip — 3 küçük sunum bileşeni)
   - `src/components/foodLog/MealSection.js` (öğün kartı + log listesi)
   - `src/components/foodLog/FoodSearchModal.js` (en büyük parça — arama/AI analiz/gram hesaplama/kaydetme; kendi state'ini taşıyor, parent'tan sadece `visible`/`initialMealType`/`dateStr`/`onClose`/`onSaved` alıyor — MealFoodPickerSection'daki "kendi state'i olan bileşen" desenini tekrarlıyor)
   - Ana dosyada kalan: state yönetimi (selectedDate, logs, summary), veri yükleme (loadLogs), tarih navigasyonu, header/kalori kartı JSX, öğün listesi döngüsü.
   - **Doğrulama:** Babel syntax + `expo export` bundle testi + gerçek simulator build'i (`expo run:ios`, bu sefer log dosyasına yönlendirilip `until grep` ile arka planda beklendi — önceki "takılı görünme" `tail | pipe` buffer sorunuydu, çözüldü). Ekran görüntüsü: uygulama açıldı, oturum korunmuş, sistem/Metro loglarında `error`/`TypeError`/`undefined is not` yok, native build "0 error(s), 0 warning(s)".
   - **Kısıt (önceki girdide de belirtildi):** `idb` kurulu değil, DietPlanScreen ve FoodLogScreen'in gerçek ekranlarına (premium gate arkasında) tap ile ulaşıp görsel doğrulama yapılamadı — kullanıcının elle kontrol etmesi önerilir.

**Kalan (henüz dokunulmadı, backlog):** HomeScreen (1166 satır) aynı yaklaşımla ayrıştırılabilir; kullanıcı onayı bekleniyor.

### 2026-09-10 — Orta vadeli iyileştirmeler: AI caching/kuyruk, skeleton screen, streaming+haptic, DietPlanScreen refactor

Önceki analiz raporundaki "Orta Vadeli İyileştirmeler" listesine geçildi (commit + devam talebi üzerine). Kullanıcı kısıtı hatırlatması: **hiçbir ücretli AI/servis katmanına geçilmeyecek** — bu oturumdaki hiçbir değişiklik ek maliyet getirmiyor (tamamı client-side).

1. **`IOS_APP_STORE_YAYINLAMA_REHBERI.md` güncellendi** (kozmetik): Eski `1.0.0`/`13.4` referansları gerçek değerlere (`1.2`/`16.4`) çekildi, "iPhone ve iPad seçili" → "yalnızca iPhone" düzeltildi (uygulama tablet desteklemiyor).
2. **AI önbellekleme + istek kuyruğu:** `src/services/aiCacheService.js` (AsyncStorage, prompt hash → 6 saat TTL) ve `src/services/aiRequestQueue.js` (tek kanallı sıra — eşzamanlı AI çağrılarını art arda yürütür, kota baskısını azaltır) eklendi. `aiService.js`'teki tek merkezi `call()` fonksiyonu bu ikisini sarmalayacak şekilde güncellendi — **tüm 6 metin tabanlı AI metodu otomatik olarak kapsandı**, tek tek değiştirilmelerine gerek kalmadı. `getMealCaloriesFromImage` de kuyruğa alındı (cache'lenmedi, her fotoğraf benzersiz).
3. **Skeleton screen:** Yeniden kullanılabilir `src/components/ui/Skeleton.js` (nabız animasyonlu placeholder) eklendi. `ProfileScreen.js`'teki vücut bilgisi yükleme `ActivityIndicator`'ı gerçek layout'u taklit eden skeleton'a çevrildi. `MealCalorieScreen.js`'e analiz sırasında sonuç kartının yerini tutan bir skeleton eklendi. **Not:** `PaywallScreen.js` incelendi — oradaki `ActivityIndicator`'lar buton-içi yükleme spinner'ları (satın alma/restore), gerçek bir "içerik yükleniyor" anı yok (plan kartları statik `PLAN_META`'dan anında render oluyor) — skeleton'a çevrilmedi, gereksiz olurdu.
4. **AI yanıtlarında simüle streaming + haptic:** `expo-haptics` eklendi. `AIAdviceCard.js`'e karakter-karakter açılan (typewriter benzeri, adım büyüklüğü metne göre ölçeklenen) bir reveal efekti + yanıt geldiğinde hafif (`Light`) haptic tık eklendi. `children` prop'uyla özel render eden çağrılar (bazı ekranlarda madde listesi) bu efekti almıyor, sadece düz `advice` metni.
5. **DietPlanScreen.js refactor (1620 → 955 satır, ~%41 azalma):** Kullanıcıyla onaylanan kapsam: sadece en büyük dosyayla başla, güvenli/mekanik parçalarla sınırla, riskli düzenleme-formu modalına dokunma. Çıkarılanlar:
   - `src/constants/dietPlanFields.js` (MEAL_FIELDS, EMPTY_FORM, MONTHS_TR — paylaşılan sabitler)
   - `src/utils/dietPlanUtils.js` (toDateStr, sumKcalFromMealText, sumAllMealKcal — saf fonksiyonlar)
   - `src/components/dietPlan/MealCard.js` (SectionTitle + MealCard)
   - `src/components/dietPlan/MealFoodPickerSection.js` (kendi state'i olan besin arama/ekleme paneli)
   - `src/components/dietPlan/DietPlanHistorySheet.js` (geçmiş planlar arama/filtre sheet'i)
   - `src/components/dietPlan/DatePickerSheet.js` (tarih seçici sheet'i)
   - Ana dosyada kalanlar: state yönetimi, veri yükleme, kaydet/sil, AI tavsiye çağrısı, ana ekran + düzenleme-formu modalı (bilinçli olarak dokunulmadı — çok fazla parent state'e bağımlı, ayırma riski/kazanç oranı düşük).
   - **Doğrulama:** Her adımda Babel sözdizimi kontrolü + `npx expo export --platform ios` hatasız bundle. Simulator build'i (`expo run:ios --device "iPhone 17 Pro"`) tam CocoaPods yeniden kurulumu nedeniyle uzun sürdü (arka planda "takılı" görünüyordu ama aslında `tail -N | pipe` buffer'ı yüzündendi — süreç canlıydı); ekran görüntüsüyle doğrulandı: uygulama çökmeden açıldı, login ekranı normal render oldu, sistem loglarında `error`/`exception`/`TypeError` yok. **Kısıt:** Simulator'de tap simülasyonu için `idb` kurulu değil, bu yüzden DietPlanScreen'in (guest/login arkasında) gerçek ekran görüntüsü alınamadı — kullanıcının "Diyetim" sekmesini elle açıp görsel olarak kontrol etmesi önerilir. Metro/build süreci iş bitince temizlendi (`pkill`).

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
- **Xcode 27 / iOS 27 SDK — UIScene zorunluluğu:** `plugins/with-ios-uiscene-lifecycle.js` ile çözüldü (2026-09-15). Expo SDK 58'e yükseltmede plugin kaldırılmalı; Expo şablonu değişirse plugin prebuild'de açık hata verir.
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
- [x] ~~`IOS_APP_STORE_YAYINLAMA_REHBERI.md` içindeki eski versiyon (1.0.0) / minimum iOS (13.4) bilgilerini güncelle.~~ (2026-09-10 tamamlandı)
- [x] ~~Orta vadeli: AI caching/kuyruk, skeleton screen, streaming+haptic, büyük ekran dosyalarının (DietPlanScreen, FoodLogScreen, HomeScreen) katmanlara ayrıştırılması.~~ (2026-09-10 tamamlandı — bkz. yukarıdaki günlük girdileri; üç ekran de bitti)
- [x] ~~ProfileScreen'deki "Yapay Zeka Veri Paylaşımı" Switch'inin ekran dışına taşması (kırpılma) hatası.~~ (2026-09-10 tamamlandı + gerçek cihaz/simulator tap'iyle görsel olarak doğrulandı — Switch artık tam görünüyor, alt metin 2 satıra düzgün sarıyor)
- [ ] **UI/UX programı Adım 2:** tasarım sistemi genişletme (`theme.js` semantik tokenlar, `useResponsive`), ortak UI kiti (`AppButton/AppCard/AppInput/EmptyState/LoadingState/ScreenContainer/BottomSheet/OfflineBanner/ErrorState`), Toast v2 (eylem butonu + kuyruk + temadan renk), tab bar dinamik yükseklik. Adım 3: ekranlar sırayla (Login/Register → Home → DietPlan → Kilo&VKİ → Goals → Tips → Profile → MealCalorie/FoodLog → Paywall). iPad yok. (2026-09-16)
- [ ] **TestFlight (Apple backend, BETA_CONTRACT_MISSING):** `APPLE_SUPPORT_TALEBI_TESTFLIGHT.md` içindeki talebi Apple Developer Support + Feedback Assistant'a gönder; Apple "resolved" deyince yeni build yükleyip tester'larla doğrula. Bu süre zarfında tester dağıtımı için EAS `preview` (ad-hoc) profili kullan. (2026-09-15)
- [ ] Bir sonraki EAS/TestFlight build'inde uçtan uca elle doğrulanması gerekenler: (a) AI onay modalının kabul/red ve Profil'den geri çekme **etkileşiminin** (Switch'e dokunma) tam akışı — görsel render doğrulandı ama toggle etkileşimi simulator'de otomatik tap kalibrasyonu zor olduğu için tam test edilemedi; (b) App Store Connect'teki App Privacy beyanının hâlâ koddaki `ios.privacyManifests` ile birebir uyumlu olduğunun App Review öncesi son kez gözle kontrolü.

**Not (teknik):** Bu oturumda simulator'de gerçek tap/swipe simülasyonu için `idb` yerine `cliclick` (zaten kurulu) + AppleScript (Simulator penceresi konumu) + piksel bazlı bezel-kenarı tespiti kombinasyonu kullanıldı. Küçük hedefler (ör. Switch) için koordinat kalibrasyonu simulator'ün gerçekçi telefon çerçevesi grafiği yüzünden hassas hesap gerektiriyor — büyük hedefler (tab bar, kartlar) için yeterince güvenilir.

**Not:** Hiçbir ücretli AI/servis katmanına geçilmeyecek — kullanıcı talebi, kalıcı kısıt.

---

## 5. Hızlı Referans

- Ana proje dizini: `/Users/enesbugracengiz/Desktop/ESdiyetim`
- Mimari/konvansiyon detayları: `AGENTS.md`, `CLAUDE.md` (içerik aynı, ikisi de var)
- Supabase proje ref: `qyfagnhmhovhlpbllioq` (org: `ebcengiz`, Free Plan)
- Başlatma: `npx expo start` (Metro), sorun olursa önce `npx expo-doctor` çalıştır.
