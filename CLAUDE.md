# CLAUDE.md — ESdiyet Projesi

Bu dosya, `ESdiyet` (diyet & sağlık takip) React Native / Expo uygulaması üzerinde çalışırken Claude Code'a bağlam sağlamak için hazırlanmıştır. Projenin mimarisini, konvansiyonlarını, servislerini ve kritik uyarılarını özetler. Kod önerileri verirken bu rehbere bağlı kal.

> Proje geçmişi ve güncel durum için `hafiza.md` dosyasına da bak — bu dosya mimari/konvansiyon referansıdır, `hafiza.md` ise "ne yapıldı / sırada ne var" günlüğüdür.

---

## 1. Proje Özeti

- **İsim:** ESdiyet (`esdiyet`)
- **Amaç:** Kullanıcının günlük diyetini (kahvaltı/öğle/akşam + ara öğünler), kilo/VKİ takibini, hedeflerini ve AI destekli sağlık tavsiyelerini yönetmesini sağlayan mobil uygulama.
- **Platformlar:** iOS (öncelik) + Android. Tablet kapalı (`UIDeviceFamily: [1]`).
- **Dil:** Kullanıcı arayüzü **Türkçe**. Kod yorumları ve loglar da çoğunlukla Türkçe — bu tonu koru.
- **Durum:** Canlı uygulama (App Store süreci için hazırlanmış, `APP_STORE_HEALTH_AI_NOTLARI.md`, `IOS_APP_STORE_YAYINLAMA_REHBERI.md` vb. dosyalara bak).

---

## 2. Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Framework | Expo SDK 57, React Native 0.86.3, React 19.2.3 |
| Navigasyon | `@react-navigation/native` v7 + bottom-tabs + native-stack |
| Auth / DB | **Supabase** (`@supabase/supabase-js` 2.58) + AsyncStorage (session persist) |
| Satın Alma | `expo-iap` (paywall + abonelik) — **Expo Go'da native modül yok, sadece dev build/TestFlight/production'da çalışır** |
| Reklam | `react-native-google-mobile-ads` 16.5 (AdMob; yalnızca ücretsiz plan) + `expo-tracking-transparency` (ATT). Expo Go'da yok → `services/adsService.js` try/require ile no-op. Rehber: `REKLAM_ENTEGRASYON_REHBERI.md` |
| Görüntü | `expo-image-picker` (kamera + galeri, kalori tahmini) + `expo-image-manipulator` (AI'a göndermeden önce 1024 px'e küçültme, `utils/image.js`) |
| UI | `expo-linear-gradient`, `@expo/vector-icons` (Ionicons, explicit dependency), `expo-blur` (explicit dependency), özel `ModernIcon` |
| Ağ durumu | `@react-native-community/netinfo` (`services/errors/connectivity.js` sarmalayıcısı) |
| AI | Supabase Edge Function **`ai-proxy`** (anahtarlar sunucuda): Gemini → Groq → Cohere → Hugging Face (metin); Gemini Vision → Groq Vision (görsel). İstemci yalnızca `supabase.functions.invoke('ai-proxy')` çağırır |
| Build | EAS (`eas.json`), özel iOS prebuild plugin (`plugins/with-ios-fmt-consteval-fix.js`) |
| TypeScript | `tsconfig.json` var (`~6.0.3`) ama kod **JavaScript (.js)** ağırlıklı — yeni dosyaları `.js` olarak yaz. (`supabase/functions` Deno — tsconfig'den hariç) |
| Kalite | ESLint (`eslint-config-expo`, `eslint.config.js`), Jest (`jest-expo`, `__tests__/`), GitHub Actions CI (`.github/workflows/ci.yml`: lint + test) |

iOS deployment target: **16.4** (SDK 57 zorunlu minimum). Yeni Expo Architecture her zaman aktif (SDK 57'de `newArchEnabled` alanı kaldırıldı, artık tek mimari). Splash screen `expo-splash-screen` plugin'iyle yönetiliyor (eski top-level `splash` alanı SDK 57'de geçersiz). Android'de `edgeToEdgeEnabled` artık zorunlu/varsayılan, `app.json`'da ayrı bir alan yok.

---

## 3. Klasör Yapısı

```
ESdiyetim/
├── App.js                     # Provider sarmalayıcı (Auth → Subscription → Toast → Navigator)
├── app.json / app.config.js   # Expo yapılandırması (+ dotenv yüklemesi)
├── eas.json                   # EAS build profilleri
├── plugins/
│   ├── with-ios-fmt-consteval-fix.js   # iOS Xcode build fix (consteval hata düzeltmesi)
│   └── with-ios-uiscene-lifecycle.js   # iOS 27 SDK UIScene zorunluluğu (SceneDelegate + SceneManifest)
├── scripts/
│   ├── check-ai-env.js        # AI env değişkenleri kontrolü (npm run env:check)
│   └── fix-ios-xcode-build.sh # npm run fix:ios
├── supabase/
│   ├── migrations/            # SQL migrations (diet_plans/weight_records unique, user_credits,
│   │                          #   food_logs+body_info şema anlık görüntüsü, ai_usage + user_credits koruması)
│   ├── functions/delete-account   # Supabase Edge Function: hesap silme
│   ├── functions/ai-proxy     # Supabase Edge Function: AI sağlayıcı proxy'si + günlük tavan
│   ├── functions/verify-subscription  # StoreKit 2 JWS doğrulama → public.subscriptions
│   ├── functions/_shared/appleJws.ts  # Bağımlılıksız Apple JWS/x5c doğrulayıcı (WebCrypto)
│   └── sql / snippets
├── supabase-schema.sql        # Ana şema (diet_plans, weight_records, health_tips)
├── supabase-auth-migration.sql
├── supabase_goals_table.sql
└── src/
    ├── constants/theme.js     # TEK tasarım kaynağı (COLORS, SIZES, TYPOGRAPHY, tabBarMetrics, withAlpha)
    ├── constants/errorMessages.js  # Kullanıcıya gösterilen hata metinlerinin TEK kaynağı
    ├── contexts/              # AuthContext, SubscriptionContext, AdsContext, ToastContext, AIConsentContext
    ├── hooks/                 # useAppError, useResponsive, useShake, useDataFetch, useFormModal
    ├── components/
    │   ├── ErrorBoundary.js   # Kök hata sınırı (App.js'de SafeAreaProvider'ın hemen altında)
    │   ├── ui/                # ORTAK UI KİTİ (index.js barrel): AppButton, AppInput, AppCard, IconBadge,
    │   │                      #   SectionHeader, EmptyState, ErrorState, LoadingState, ScreenContainer, HeroHeader,
    │   │                      #   BottomSheet, OfflineBanner, ConfirmModal, DatePickerSheet, DateField,
    │   │                      #   DateStepper, SegmentedControl, Chip, ListRow, ProgressBar, ActionCta, Skeleton, Toast, PressableOpacity
    │   ├── ads/LimitReachedSheet   # Günlük AI hakkı dolunca: ödüllü reklam (yüklüyse) + Premium CTA
    │   ├── AIAdviceCard, AIConsentModal, AdConsentModal, BMIPanel, GuestGateBanner,
    │   ├── HealthSourcesCard, MedicalInfoBanner, ModernIcon,
    │   └── PremiumGate, WeightPanel
    ├── navigation/MainNavigator.js   # Auth / App stack + Tab navigator
    ├── screens/               # 15 ekran — aşağıda
    ├── services/
    │   ├── supabase.js        # supabase client + dietPlanService, weightService vb.
    │   ├── adsService.js      # AdMob sarmalayıcı (interstitial/rewarded, TestIds, try/require)
    │   ├── adConsentService.js  # Reklam rızası (KVKK) + ATT sarmalayıcı
    │   ├── dailyUsageService.js # Cihaz-yerel günlük sayaçlar + ödüllü reklam bonusu
    │   ├── aiService.js       # Orchestrator + prompt builder'lar
    │   ├── ai/providers.js    # ai-proxy istemcisi (invoke + hata kodu eşleme); zincir sunucuda
    │   ├── localDataService.js  # Çıkış/hesap silmede kullanıcıya ait yerel veriyi (AI önbelleği, sayaçlar) temizler
    │   ├── errors/            # AppError, normalizeError, logError, connectivity, globalHandlers
    │   ├── nutritionService.js
    │   └── subscriptionService.js  # expo-iap sarmalayıcı
    └── utils/                 # bmi, date (toDateString = YEREL gün), environment, image, validation
```

### Ekranlar
`HomeScreen`, `DietPlanScreen`, `WeightAndBMIScreen` (WeightPanel + BMIPanel), `GoalsScreen`, `TipsScreen`, `ProfileScreen`, `LoginScreen`, `RegisterScreen`, `MealCalorieScreen` (fotoğraftan kalori), `FoodLogScreen`, `HealthSourcesInfoScreen`, `PrivacyPolicyScreen`, `PaywallScreen`. (Eski `WeightTrackerScreen` ve `BodyInfoScreen` navigator'da kullanılmadığı için 2026-09-16'da silindi.)

Tüm ekranlar ortak UI kiti üstünde: `ScreenContainer` iskelet, hero başlıklar `header={<HeroHeader …/>}` ile (kural: yalnızca başlık + birincil kontrol + en fazla tek satır `meta`; rozet/tarih/açıklama cümlesi YOK — header scroll dışında sabit kaldığı için her satır içerik alanından çalar), formlar `BottomSheet + AppInput + AppButton + DateField`, listeler `EmptyState/LoadingState/ErrorState`. Özellik bazlı alt bileşenler: `components/home/*`, `components/dietPlan/*`, `components/goals/GoalCard`, `components/foodLog/*`, `components/mealCalorie/MealResultCard`, `components/auth/AuthFooter`.

### Tab düzeni (MainNavigator)
`Home • DietPlan • WeightAndBMI • Goals • Tips • Profile`
Tab bar: ekranın en altına dock'lu (absolute, tam genişlik, üstte hairline), iOS'ta `expo-blur` cam zemin; home indicator alanı barın `paddingBottom`'u (`max(insets.bottom, 8)`). Ölçüler `LAYOUT.tabBar` + `tabBarMetrics(insets.bottom)` ile safe area'ya göre runtime'da hesaplanır (sihirli sayı yok); ekranların alt boşluğu `useResponsive().tabBottomPad` / `scrollTabScreenBottomPad()` aynı kaynaktan türer. Etiket stili `tabBarLabelStyle` ile verilir (ekran bazlı `tabBarLabel` string'i screenOptions'taki render fonksiyonunu ezer — fonksiyon kullanma). Yeni tab eklerken `TAB_ITEMS` sabitine icon + label ekle ve `ModernTabIcon` kullan.

---

## 4. Mimari Prensipler

1. **Provider sırası değiştirilmez:** `SafeAreaProvider → AuthProvider → AIConsentProvider → SubscriptionProvider → AdsProvider → ToastProvider → MainNavigator`. Subscription Auth'a, Ads Subscription'a (`isSubscribed`), Toast hepsine bağımlı.
2. **Auth & Guest Mode:** `useAuth()` → `user`, `loading`, `isGuest`. `showMainApp = !!user || isGuest`. Guest kullanıcılar için `GuestGateBanner` + `PremiumGate` kullan.
3. **Premium Gate:** Ücretli özellikler (AI kalori, sınırsız tavsiye vb.) `SubscriptionContext` ile kontrol edilir. Paywall modal `presentation: "modal"`.
   - **Reklam politikası tek yerde:** `AdsContext` (`adsEnabled = native modül var && !isSubscribed`). Günde ≤1 geçiş reklamı (AI isteği gönderildikten sonra, yükleme süresinde: `showInterstitialIfEligible()`), limit dolunca ödüllü reklam (`LimitReachedSheet` → `watchRewardedFor('photo'|'food')`, özellik başına günde ≤2). Premium'da ve guest gate arkasında reklam yok; banner yok. SDK giriş yapmış ücretsiz kullanıcıda açılışta **genel (non-personalized) modda** init + preload edilir; rıza sheet'i yalnızca kişiselleştirme (ATT) içindir — init'i tekrar rıza kararına bağlama (1.4.0'da 0 reklam isteğine yol açtı). Ekranlara doğrudan `react-native-google-mobile-ads` import etme.
4. **Tasarım Sistemi:** Hiçbir renk/boyut **hardcode edilmez**. Her zaman `COLORS`, `SIZES`, `NavigationTheme` import et (`src/constants/theme.js`). Palet: emerald yeşil (#16A34A) + beyaz yüzeyler.
   - `'#fff'` yerine `COLORS.white`; `'rgba(255,255,255,0.2)'` yerine `whiteAlpha(0.2)`; `COLORS.primary + '22'` yerine `withAlpha(COLORS.primary, 0.13)`. Kategori vurguları `COLORS.accents.*`, durum zeminleri `COLORS.successBg/warningBg/errorBg/infoBg`.
   - **Ortak UI kiti zorunlu:** buton = `AppButton` (TouchableOpacity+LinearGradient kopyası yazma), serbest dokunma alanı = `PressableOpacity` (`TouchableOpacity` kullanma), form alanı = `AppInput`, kart = `AppCard`, ikon rozeti = `IconBadge`, boş/hata/yükleme = `EmptyState`/`ErrorState`/`LoadingState`, alt sayfa = `BottomSheet`, ekran iskeleti = `ScreenContainer` (safe area + tab alt boşluğu + klavye + pull-to-refresh). `import { AppButton, ... } from '../components/ui'`.
   - **Responsive:** modül seviyesinde `Dimensions.get('window')` yazma; `useResponsive()` kullan (`width`, `isSmall`, `columnWidth(n)`, `tabBottomPad`). Metinlere `maxFontSizeMultiplier={MAX_FONT_SCALE}`; dokunulabilir öğelere `accessibilityRole/Label`, min 44pt (`SIZES.minTouch`, `HIT_SLOP`).
   - Toast: `showToast(msg, type, { action: { label, onPress } })` — kuyruklu, aynı mesaj tekrarlanmaz. `handleError(e, { onRetry })` retryable hatada otomatik "Tekrar dene" butonu ekler.
5. **RLS (Row Level Security):** Supabase tablolarında aktif. Her servis çağrısı önce `supabase.auth.getUser()` ile kullanıcıyı doğrulamalı ve insert/update'lerde `user_id` eklemeli. Bu kalıbı bozma.
6. **Upsert onConflict:** `diet_plans` için `user_id,date`, `weight_records` için `user_id,date`. Migrations bu unique constraint'leri garantiler — kaldırma.
7. **Hata yönetimi (ham hata kullanıcıya ASLA gösterilmez):**
   - Servisler `AppError` fırlatır (`src/services/errors`). HTTP kodu, env adı, sağlayıcı adı, API gövdesi yalnızca `detail`/`cause` alanında kalır → sadece console'a gider.
   - Ekranlarda `catch (e) { handleError(e, { context }) }` (`useAppError` hook'u). `showToast(e.message)` / `Alert.alert(…, e.message)` **yasak**.
   - Kullanıcı metinleri `src/constants/errorMessages.js`'de; yeni hata türü = yeni `ERROR_CODES` + mesaj. Ton: sakin, yönlendirici.
   - Bilinmeyen hata otomatik `UNKNOWN`'a düşer; bir kaynağın hatasını tanımak gerekiyorsa `normalizeError.js`'e regex/kod ekle, ekrana `includes()` yazma.
   - Supabase servislerinde oturum kontrolü `requireUser()` ile (AppError `AUTH_SESSION_REQUIRED`).

---

## 5. AI Servisi (Dikkat!)

- `aiService.js` orchestrator. `services/ai/providers.js` yalnızca **`ai-proxy` Edge Function'ını** çağırır; provider chain (Gemini → Groq → Cohere → Hugging Face) `supabase/functions/ai-proxy/index.ts` içinde.
- **AI anahtarları istemcide YOK.** Supabase secrets: `GEMINI_API_KEY`, `GROQ_API_KEY` (opsiyonel `COHERE_API_KEY`, `HUGGINGFACE_API_KEY`). `.env`'deki aynı adlı (ön eksiz) değerler yalnızca `supabase secrets set` için yerel kopya. `EXPO_PUBLIC_*_API_KEY` yazmak yasak — `npm run env:check` bunu hata sayar.
- **Sunucu tavanı:** `ai-proxy` her isteği `ai_usage_consume()` ile sayar (Türkiye günü). Premium: metin 80 / görsel 5; ücretsiz: metin 80 / görsel 3 (1 + 2 ödüllü reklam); misafir (IP özeti): metin 20 / görsel 0. Aşımda `429 { error: 'AI_DAILY_LIMIT' }`. Sağlayıcılar başarısız olursa hak iade edilir. İstemcideki `FREE_DAILY_LIMIT`/`PREMIUM_DAILY_LIMIT`/`REWARDS_PER_DAY` değişirse `CAPS`'i de güncelle.
- **Premium sunucuda doğrulanır:** istemci StoreKit 2 işlem JWS'ini (`purchase.purchaseToken`) `verify-subscription`'a gönderir (`syncSubscriptionWithServer`: açılış, satın alma, geri yükleme). Fonksiyon `_shared/appleJws.ts` ile x5c zincirini Apple Root CA G3'e (SHA-256 pin) kadar doğrular, bundle/ürün/`appAccountToken` (= `user.id`, satın almada gönderilir) kontrol eder, `public.subscriptions`'a yazar. `ai-proxy` Premium'u `has_active_subscription()` ile okur. Bir `original_transaction_id` aynı anda tek hesaba bağlıdır. Android henüz doğrulanmıyor (yayında değil).
- Proxy ayrıca her isteğe sunucu tarafı sistem kuralı ekler (yalnızca beslenme/sağlık, teşhis yok).
- Prompt builder'lar Türkçe, tıbbi teşhis yasağı **zorunlu**: *"Tıbbi teşhis veya kişisel tedavi/beslenme planı verme; yalnızca genel bilgilendirme ve güvenli motivasyon."* — bu kısıt her yeni prompt'ta korunmalı (App Store health policy).
- Hata loglaması: ağ/kota hataları `console.warn`, diğerleri `console.error`. Bu ayrım `services/errors/normalizeError.js → logError()` içinde kod bazlı yapılıyor — bozma (Metro log gürültüsü).
- Provider fonksiyonları `AppError` fırlatır (`AI_RATE_LIMIT`, `AI_UNAVAILABLE`, `AI_NOT_CONFIGURED`, `AI_TIMEOUT`, `AI_PARSE_FAILED`, `AI_CONTENT_BLOCKED`…). `aiService` fallback yanıtında `error` = kod, `errorMessage` = kullanıcı metni.
- Dağıtım: `npx supabase secrets set GEMINI_API_KEY=… GROQ_API_KEY=…` + `npx supabase functions deploy ai-proxy --no-verify-jwt` (JWT fonksiyon içinde doğrulanır). Model listesi değişince **sunucudaki** `GEMINI_*_MODELS` güncellenir — uygulama güncellemesi gerekmez.
- Önbellek: `aiCacheService` (6 saat, prompt hash). Kullanıcı açıkça yenilediğinde `skipCache` (ör. `getHealthTip(cat, { force: true })`); çıkışta `clearAICache()`.
- İlgili dokümanlar: `GROQ_KURULUM.md`, `APP_STORE_HEALTH_AI_NOTLARI.md`.

---

## 6. Veri Katmanı

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` artık `src/services/supabase.js` içinde `process.env.EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` üzerinden okunuyor (hardcoded değil). Değerler `.env` dosyasında; eksikse `supabase.js` başlangıçta anlamlı bir hata fırlatır. `.env` gitignore'lu — yeni bir makinede proje açılırken doldurulmalı.
- **Supabase Free Plan:** Proje 7 gün API trafiği almazsa otomatik "paused" olur (dashboard → proje sayfası → "Resume project", veri kaybı yok, birkaç dakika sürer). Bu durumda uygulamada Auth/DB istekleri `502`/DNS hatası (`fetch failed`) verir. Pro plana geçilmedi (bilinçli tercih) — uzun geliştirme aralarında bu tekrar yaşanabilir.
- Ana servisler: `dietPlanService`, `weightService`, `goalsService`, `healthTipsService`, `userCreditsService` (AI kredisi), `foodLogService`.
- **Gün = yerel takvim günü.** `toISOString().split('T')[0]` YASAK (UTC → TR'de gün 03:00'te döner); `toDateString(new Date())` kullan. Sunucuda karşılığı `public.tr_today()` (Europe/Istanbul).
- **`user_credits` koruması:** `trg_user_credits_guard` aynı gün içinde sayacın düşürülmesini ve gelecek tarihe sıfırlamayı reddeder; artırma atomik `rpc('increment_photo_credit')` (RPC yoksa eski UPDATE yoluna düşer). `getOrInit()` yan etkisizdir (yeni günde 0 döner, yazmaz).
- **Kullanıcıya bağlı yerel veri:** `SubscriptionContext` kredileri `user.id` değişince yeniden yükler; fotoğraf sayacı önbelleği `esdiyet_daily_photo_used_v2:<userId>`. Çıkış/hesap silmede `clearUserLocalData()`.
- Canlı şemadaki tüm tablolar repoda olmalı: `food_logs` ve `body_info` için `20260925110000_schema_snapshot_…` (IF NOT EXISTS). Yeni tablo = yeni migration + `delete_own_account` / `delete-account` listesine ekle.
- Session: AsyncStorage, `autoRefreshToken: true`, `detectSessionInUrl: false` (mobil).
- Edge Function `supabase/functions/delete-account` — KVKK uyumlu hesap silme. GitHub/App Store gereği korunmalı.

---

## 7. Komutlar

```bash
npm start              # expo start (Metro)
npm run ios            # expo run:ios (yerel build)
npm run android        # expo run:android
npm run web            # expo start --web
npm run env:check      # .env kontrolü (Supabase, AdMob; istemcide AI anahtarı olmamalı)
npm run lint           # ESLint (expo lint) — CI'da çalışır
npm test               # Jest birim testleri (__tests__/) — CI'da çalışır
npm run fix:ios        # iOS Xcode build sorunları (pod reset vb.)
npx eas build --platform ios      # Production build
npx eas build --platform android
npx supabase functions deploy ai-proxy --no-verify-jwt   # AI proxy (secrets: GEMINI_API_KEY, GROQ_API_KEY)
npx supabase functions deploy verify-subscription --no-verify-jwt   # StoreKit abonelik doğrulama
npx supabase db push                                     # supabase/migrations (ya da SQL Editor'de elle)
```

**Önemli:** iOS build sorunlarında önce `npm run fix:ios` dene; sonra `ios/` + `Pods` silip `expo prebuild` yap.

---

## 8. Kod Stili & Konvansiyonlar

- **Dil:** JavaScript (`.js`), fonksiyonel componentler, React hooks. TypeScript config var ama kullanılmıyor.
- **Import sırası:** React → RN → third-party → `@react-navigation` → local (`../contexts`, `../constants`, `../services`).
- **İsimlendirme:** Ekranlar `*Screen.js`, context'ler `*Context.js`, servisler camelCase + `Service` suffix.
- **Yorum dili:** Türkçe. Mevcut ton samimi/açıklayıcı — uyum sağla.
- **Animasyon:** `useNativeDriver` karışımı çalışmıyor; `MainNavigator.ModernTabIcon`'da `useNativeDriver: false` tercih ediliyor (backgroundColor + transform aynı değerden).
- **Header stili:** Primary yeşil (`COLORS.primary`), `textOnPrimary` beyaz, `headerBackButtonDisplayMode: "minimal"`, shadow kapalı. Yeni stack ekranında aynı stil paternini uygula.

---

## 9. Kritik Uyarılar

1. **Sağlık içeriği:** Uygulama App Store "Health & Fitness" kategorisinde. `MedicalInfoBanner`, `HealthSourcesCard`, disclaimer renkleri (`COLORS.disclaimer*`) kaldırılmaz. Her AI yanıtı disclaimer ile sunulmalı.
2. **Telif:** "ESdiyet" ismi korunuyor. Bundle ID `com.esdiyet.app` — değiştirme.
3. **KVKK/Privacy:** `PrivacyPolicyScreen` Auth ve App stack'lerinin ikisine de kayıtlı — silme. `PRIVACY.md` sürdürülmeli.
4. **Newarch:** SDK 57'de tek mimari (Fabric/New Architecture), `app.json`'da ayrı bir `newArchEnabled` alanı yok — kapatılamaz. Eski (non-Fabric) API'leri kullanma.
5. **Tablet kapalı:** iOS'ta `UIDeviceFamily: [1]`. Responsive kodu iPhone'a göre yaz.
6. **`iOS build fix` plugin:** `plugins/with-ios-fmt-consteval-fix.js` C++ `fmt` kütüphanesindeki consteval hatası için. Silme, Expo güncellemesinden sonra test et.
7. **.env güvenliği:** `EXPO_PUBLIC_*` değişkenleri client bundle'a gömülür. Gerçek sır (service_role key, AI sağlayıcı anahtarları vb.) ASLA bu prefix'le eklenmez — sunucuya ait anahtarlar Supabase secrets'ta.
8. **UIScene plugin:** `plugins/with-ios-uiscene-lifecycle.js` Xcode 27 / iOS 27 SDK'nın zorunlu kıldığı scene yaşam döngüsünü SDK 57 şablonuna ekler (Info.plist `UIApplicationSceneManifest` + `AppDelegate.swift` sonuna `SceneDelegate`). Silme; `ios/` altındaki üretilen dosyaları elle düzenleme (prebuild'de kaybolur). Expo SDK 58+'a geçince (şablon kendi SceneDelegate'ini üretiyor) bu plugin kaldırılmalı.
9. **`@react-native-community/netinfo` import kuralı:** Native modül yoksa paket **import anında throw eder**. Bu yüzden yalnızca `services/errors/connectivity.js` içinde, modül kapsamında `try { require(...) }` ile yüklenir — başka yerde `import NetInfo from ...` yazma. (Metro, runtime'da yapılan `require` hatalarını throw etmek yerine `ErrorUtils.reportFatalError` ile raporlar; try/catch yakalayamaz — require'ın ilk bundle yüklemesinde olması şart.)
10. **`expo-iap` / Expo Go kısıtı:** Native modül Expo Go binary'sine gömülü değil — `initConnection`/listener çağrıları Expo Go'da her zaman "Cannot find native module" ile başarısız olur (`src/services/subscriptionService.js` bunu try/catch ile sessizce yönetir, çökme yok). Gerçek satın alma akışı yalnızca development build / TestFlight / production'da test edilebilir.
11. **Reklam (AdMob) kuralları:** (a) `react-native-google-mobile-ads` ve `expo-tracking-transparency` yalnızca `services/adsService.js` / `services/adConsentService.js` içinde, modül kapsamında `try { require }` ile yüklenir (madde 9 ile aynı sebep). (b) Reklam isteğine **asla** `keywords`/`contentUrl`/`customTargeting` eklenmez — sağlık verisi reklam ağına gitmez (KVKK m.6, App Store 5.1.3, gizlilik metnindeki taahhüt). (c) Dev/TestFlight'ta `TestIds`, production'da `.env` ID'leri; gerçek ID ile test tıklaması AdMob hesabını askıya aldırır. (d) `app.json` `ios.privacyManifests` reklam veri tipleri ve ASC App Privacy beyanı senkron tutulur. `NSPrivacyTracking` **bilinçli olarak `false`** (ITMS-91064: `true` + boş `NSPrivacyTrackingDomains` reddedildi; bkz. `REKLAM_ENTEGRASYON_REHBERI.md`) — `true` yapma; ATT ve ASC "tracking" beyanları bundan bağımsız; ATT metni `app.config.js`'de. (e) Rıza metni değişirse `AD_CONSENT_VERSION` artırılır. (f) Test ortamında limit/ödül akışı için `.env` `EXPO_PUBLIC_BYPASS_PAYWALL=false`.

---

## 10. Yaygın Görev Kalıpları

### Yeni ekran ekleme
1. `src/screens/YeniEkran.js` oluştur (COLORS/SIZES import et).
2. `MainNavigator.js` içinde `AppStack` veya `Tab.Navigator`'a kaydet.
3. Tab ise `TAB_ITEMS`'a icon + label ekle; `ModernTabIcon` kullan.
4. Premium gerekliyse `<PremiumGate>` ile sarmala.

### Yeni Supabase tablosu
1. `supabase/migrations/<timestamp>_<isim>.sql` oluştur (RLS policy + user_id FK dahil).
2. `src/services/supabase.js` içinde servis objesi ekle, her metodda `getUser()` kontrolü yap.
3. İlgili ekrandan `useDataFetch` hook'u ile tüket.

### Yeni AI özelliği
1. `src/services/aiService.js` içinde `buildXPrompt()` ekle (disclaimer kısıtıyla!).
2. Orchestrator çağrısı `callTextWithProviderChain` veya `callMealCalorieVisionChain` (ikisi de `ai-proxy`'ye gider; yeni sağlayıcı/model = yalnızca Edge Function değişikliği).
3. Kredi düşümü için `userCreditsService` kontrol et; paywall yönlendirmesini `SubscriptionContext.requestUpgrade()` ile yap.

---

## 11. Daha Fazla Bilgi

Proje içi dokümanlar:
- `README.md` — kurulum
- `BASLANGIC_REHBERI.md` — geliştirici onboarding
- `SUPABASE_KURULUM.md` — DB kurulumu
- `AUTH_SISTEM_KURULUM.md` — auth akışı
- `GROQ_KURULUM.md` — AI env
- `APP_STORE_HEALTH_AI_NOTLARI.md` — App Store health policy notları
- `REKLAM_ENTEGRASYON_REHBERI.md` — AdMob stratejisi, ATT/App Privacy beyanları, KVKK listesi, test matrisi
- `IOS_APP_STORE_YAYINLAMA_REHBERI.md` — yayın süreci
- `PRIVACY.md` — gizlilik politikası
- `hafiza.md` — proje geçmişi / yapılanlar / yapılacaklar günlüğü (her görev sonrası güncellenir)

---

**Kısa kural özeti:** Türkçe yaz • theme'den oku • Supabase'de user_id + RLS • AI yalnızca `ai-proxy` üzerinden (istemcide anahtar yok) • gün = `toDateString` • AI'da medikal disclaimer • yeni dosyalar `.js` • header & tab stilini bozma • hardcoded renk yok • `newArch` uyumlu kod yaz • hata = `AppError` + `handleError`, ham `e.message` kullanıcıya gitmez.
