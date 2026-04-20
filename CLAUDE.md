# CLAUDE.md — ESdiyet Projesi

Bu dosya, `ESdiyet` (diyet & sağlık takip) React Native / Expo uygulaması üzerinde çalışırken Claude Code'a bağlam sağlamak için hazırlanmıştır. Projenin mimarisini, konvansiyonlarını, servislerini ve kritik uyarılarını özetler. Kod önerileri verirken bu rehbere bağlı kal.

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
| Framework | Expo SDK 54, React Native 0.81.5, React 19.1 |
| Navigasyon | `@react-navigation/native` v7 + bottom-tabs + native-stack |
| Auth / DB | **Supabase** (`@supabase/supabase-js` 2.58) + AsyncStorage (session persist) |
| Satın Alma | `expo-iap` (paywall + abonelik) |
| Görüntü | `expo-image-picker` (kamera + galeri, kalori tahmini) |
| UI | `expo-linear-gradient`, `@expo/vector-icons` (Ionicons), özel `ModernIcon` |
| AI | Gemini → Groq → Cohere → Hugging Face provider zinciri (metin); Gemini Vision → Groq Vision (görsel) |
| Build | EAS (`eas.json`), özel iOS prebuild plugin (`plugins/with-ios-fmt-consteval-fix.js`) |
| TypeScript | `tsconfig.json` var ama kod **JavaScript (.js)** ağırlıklı — yeni dosyaları `.js` olarak yaz. |

iOS deployment target: **15.1**. Yeni Expo Architecture (`newArchEnabled: true`) açık.

---

## 3. Klasör Yapısı

```
ESdiyetim/
├── App.js                     # Provider sarmalayıcı (Auth → Subscription → Toast → Navigator)
├── app.json / app.config.js   # Expo yapılandırması (+ dotenv yüklemesi)
├── eas.json                   # EAS build profilleri
├── plugins/
│   └── with-ios-fmt-consteval-fix.js   # iOS Xcode build fix (consteval hata düzeltmesi)
├── scripts/
│   ├── check-ai-env.js        # AI env değişkenleri kontrolü (npm run env:check)
│   └── fix-ios-xcode-build.sh # npm run fix:ios
├── supabase/
│   ├── migrations/            # SQL migrations (diet_plans unique, weight_records unique, user_credits)
│   ├── functions/delete-account   # Supabase Edge Function: hesap silme
│   └── sql / snippets
├── supabase-schema.sql        # Ana şema (diet_plans, weight_records, health_tips)
├── supabase-auth-migration.sql
├── supabase_goals_table.sql
└── src/
    ├── constants/theme.js     # TEK tasarım kaynağı (COLORS, SIZES, NavigationTheme)
    ├── contexts/              # AuthContext, SubscriptionContext, ToastContext
    ├── hooks/                 # useAlert, useDataFetch, useFormModal
    ├── components/
    │   ├── ui/                # ConfirmModal, Toast
    │   ├── AIAdviceCard, BMIPanel, GuestGateBanner,
    │   ├── HealthSourcesCard, MedicalInfoBanner, ModernIcon,
    │   └── PremiumGate, WeightPanel
    ├── navigation/MainNavigator.js   # Auth / App stack + Tab navigator
    ├── screens/               # 15 ekran — aşağıda
    ├── services/
    │   ├── supabase.js        # supabase client + dietPlanService, weightService vb.
    │   ├── aiService.js       # Orchestrator + prompt builder'lar
    │   ├── ai/providers.js    # Gemini/Groq/Cohere/HF provider zinciri
    │   ├── nutritionService.js
    │   └── subscriptionService.js  # expo-iap sarmalayıcı
    └── utils/                 # bmi, date, environment, validation
```

### Ekranlar
`HomeScreen`, `DietPlanScreen`, `WeightAndBMIScreen`, `WeightTrackerScreen` (legacy), `GoalsScreen`, `TipsScreen`, `ProfileScreen`, `LoginScreen`, `RegisterScreen`, `MealCalorieScreen` (fotoğraftan kalori), `FoodLogScreen`, `HealthSourcesInfoScreen`, `PrivacyPolicyScreen`, `PaywallScreen`, `BodyInfoScreen`.

### Tab düzeni (MainNavigator)
`Home • DietPlan • WeightAndBMI • Goals • Tips • Profile`
Tab bar: yüzer (absolute), yuvarlatılmış, cam beyaz arka plan. Yeni tab eklerken `TAB_ITEMS` sabitine icon + label ekle ve `ModernTabIcon` kullan.

---

## 4. Mimari Prensipler

1. **Provider sırası değiştirilmez:** `SafeAreaProvider → AuthProvider → SubscriptionProvider → ToastProvider → MainNavigator`. Subscription Auth'a, Toast hepsine bağımlı.
2. **Auth & Guest Mode:** `useAuth()` → `user`, `loading`, `isGuest`. `showMainApp = !!user || isGuest`. Guest kullanıcılar için `GuestGateBanner` + `PremiumGate` kullan.
3. **Premium Gate:** Ücretli özellikler (AI kalori, sınırsız tavsiye vb.) `SubscriptionContext` ile kontrol edilir. Paywall modal `presentation: "modal"`.
4. **Tasarım Sistemi:** Hiçbir renk/boyut **hardcode edilmez**. Her zaman `COLORS`, `SIZES`, `NavigationTheme` import et (`src/constants/theme.js`). Palet: emerald yeşil (#16A34A) + beyaz yüzeyler.
5. **RLS (Row Level Security):** Supabase tablolarında aktif. Her servis çağrısı önce `supabase.auth.getUser()` ile kullanıcıyı doğrulamalı ve insert/update'lerde `user_id` eklemeli. Bu kalıbı bozma.
6. **Upsert onConflict:** `diet_plans` için `user_id,date`, `weight_records` için `user_id,date`. Migrations bu unique constraint'leri garantiler — kaldırma.

---

## 5. AI Servisi (Dikkat!)

- `aiService.js` orchestrator. Gerçek çağrılar `services/ai/providers.js` içindeki **provider chain**'de (Gemini → Groq → Cohere → Hugging Face).
- Prompt builder'lar Türkçe, tıbbi teşhis yasağı **zorunlu**: *"Tıbbi teşhis veya kişisel tedavi/beslenme planı verme; yalnızca genel bilgilendirme ve güvenli motivasyon."* — bu kısıt her yeni prompt'ta korunmalı (App Store health policy).
- Hata loglaması: ağ/kota hataları `console.warn`, diğerleri `console.error`. Bu ayrımı bozma (Metro log gürültüsü).
- Env değişkenleri: `EXPO_PUBLIC_*` ön ekiyle `.env` dosyasında tutulur. `npm run env:check` ile doğrula.
- İlgili dokümanlar: `GROQ_KURULUM.md`, `APP_STORE_HEALTH_AI_NOTLARI.md`.

---

## 6. Veri Katmanı

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` şu anda `src/services/supabase.js` içinde **hardcoded**. Anon key public olsa da, değiştirmek istiyorsan `.env` + `process.env.EXPO_PUBLIC_...` kullan. Var olan değeri tek taraflı silme — production'a bağlı.
- Ana servisler: `dietPlanService`, `weightService`, `goalsService`, `healthTipsService`, `userCreditsService` (AI kredisi), `foodLogService`.
- Session: AsyncStorage, `autoRefreshToken: true`, `detectSessionInUrl: false` (mobil).
- Edge Function `supabase/functions/delete-account` — KVKK uyumlu hesap silme. GitHub/App Store gereği korunmalı.

---

## 7. Komutlar

```bash
npm start              # expo start (Metro)
npm run ios            # expo run:ios (yerel build)
npm run android        # expo run:android
npm run web            # expo start --web
npm run env:check      # AI env değişkenlerini doğrula
npm run fix:ios        # iOS Xcode build sorunları (pod reset vb.)
npx eas build --platform ios      # Production build
npx eas build --platform android
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
4. **Newarch:** `newArchEnabled: true`. Eski (non-Fabric) API'leri kullanma.
5. **Tablet kapalı:** iOS'ta `UIDeviceFamily: [1]`. Responsive kodu iPhone'a göre yaz.
6. **`iOS build fix` plugin:** `plugins/with-ios-fmt-consteval-fix.js` C++ `fmt` kütüphanesindeki consteval hatası için. Silme, Expo güncellemesinden sonra test et.
7. **.env güvenliği:** `EXPO_PUBLIC_*` değişkenleri client bundle'a gömülür. Gerçek sır (service_role key vb.) ASLA bu prefix'le eklenmez.

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
2. Orchestrator çağrısı `callTextWithProviderChain` veya `callMealCalorieVisionChain`.
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
- `IOS_APP_STORE_YAYINLAMA_REHBERI.md` — yayın süreci
- `PRIVACY.md` — gizlilik politikası

---

**Kısa kural özeti:** Türkçe yaz • theme'den oku • Supabase'de user_id + RLS • AI'da medikal disclaimer • yeni dosyalar `.js` • header & tab stilini bozma • hardcoded renk yok • `newArch` uyumlu kod yaz.
