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
- [ ] Bir sonraki EAS/TestFlight build'inde uçtan uca elle doğrulanması gerekenler: (a) AI onay modalının kabul/red ve Profil'den geri çekme **etkileşiminin** (Switch'e dokunma) tam akışı — görsel render doğrulandı ama toggle etkileşimi simulator'de otomatik tap kalibrasyonu zor olduğu için tam test edilemedi; (b) App Store Connect'teki App Privacy beyanının hâlâ koddaki `ios.privacyManifests` ile birebir uyumlu olduğunun App Review öncesi son kez gözle kontrolü.

**Not (teknik):** Bu oturumda simulator'de gerçek tap/swipe simülasyonu için `idb` yerine `cliclick` (zaten kurulu) + AppleScript (Simulator penceresi konumu) + piksel bazlı bezel-kenarı tespiti kombinasyonu kullanıldı. Küçük hedefler (ör. Switch) için koordinat kalibrasyonu simulator'ün gerçekçi telefon çerçevesi grafiği yüzünden hassas hesap gerektiriyor — büyük hedefler (tab bar, kartlar) için yeterince güvenilir.

**Not:** Hiçbir ücretli AI/servis katmanına geçilmeyecek — kullanıcı talebi, kalıcı kısıt.

---

## 5. Hızlı Referans

- Ana proje dizini: `/Users/enesbugracengiz/Desktop/ESdiyetim`
- Mimari/konvansiyon detayları: `AGENTS.md`, `CLAUDE.md` (içerik aynı, ikisi de var)
- Supabase proje ref: `qyfagnhmhovhlpbllioq` (org: `ebcengiz`, Free Plan)
- Başlatma: `npx expo start` (Metro), sorun olursa önce `npx expo-doctor` çalıştır.
