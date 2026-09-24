# ESdiyet — Ücretsiz Plan Reklam Entegrasyon Rehberi (AdMob, iOS)

> Sürüm: 1.4.0 (build 10) · Tarih: 22 Eylül 2026 · Kapsam: yalnızca iOS / App Store, sadece Türkiye dağıtımı
> Bu belge teknik ve operasyonel bir rehberdir; **hukuki görüş değildir**. KVKK bölümündeki "avukat teyidi" işaretli maddeler için bir uzmana danışın.

---

## 0. Özet (TL;DR)

| Konu | Karar |
|---|---|
| Reklam ağı | **Google AdMob** (ücretsiz, iOS için en yaygın; ödeme eşiği 100 $) |
| Kimlere | Yalnızca **ücretsiz plan** (`isSubscribed === false`). Premium'da sıfır reklam — paywall'daki "reklamsız" vaadi böylece gerçek olur. |
| Format 1 | **Ödüllü (rewarded)**: günlük AI hakkı dolunca "Reklam izle → +1 analiz". Özellik başına günde en fazla 2 ödül. Buton yalnızca reklam **yüklüyse** görünür. |
| Format 2 | **Geçiş (interstitial)**: günde **en fazla 1**, AI analizi **yüklenirken** (kullanıcı zaten bekliyor; sonucu okurken kesinti yok). |
| Banner | **Yok** (düşük gelir, sabit yer kaplar, "reklamsız" ayrıştırıcısını zayıflatır). |
| Rıza | SDK açılışta genel modda başlar; ilk geçiş reklamı fırsatında KVKK uyumlu sheet: *Kişiselleştirilmiş* (→ iOS ATT izni) / *Sadece genel* (varsayılan). Profil'den geri alınabilir. |
| Sağlık verisi | Reklam ağına **asla** gitmez (kod düzeyinde: `keywords`/`contentUrl` yok). |
| Apple | ATT metni, `NSPrivacyTracking: true` + veri tipleri, ASC App Privacy beyanı, Review Notes. |

---

## 1. Ekran analizi ve UX kararı

Paywall ekranı (Ekran Resmi 2026-09-22 00.37.43) üç vaat sunuyor: *günde 5 fotoğraf analizi (ücretsizde 1)*, *sınırsız besin analizi (ücretsizde 3)*, *reklamsız, sınırsız erişim*. Uygulamanın çekirdeği (diyet planı, kilo/VKİ, hedefler, tavsiyeler) zaten ücretsiz; ödeme gerekçesi AI limitleri + reklamsızlık. Bu tasarımı bozmayan reklam modeli şu ilkelere dayanır:

1. **Reklam = AI maliyetinin karşılığı.** Reklam yalnızca AI akışlarında (fotoğraftan kalori, AI ile tam besin analizi) görünür; diyet planı, kilo, hedefler, tavsiyeler sekmelerinde reklam yok. Kullanıcı reklamın "neden" olduğunu anlar, Premium'un değeri netleşir.
2. **Kesintisiz sonuç okuma.** Geçiş reklamı sonuç ekranında değil, AI isteği gönderildikten sonra **bekleme süresinde** açılır. Kapatınca sonuç genellikle hazırdır.
3. **Kullanıcının seçtiği reklam.** Ödüllü reklam bir "ceza" değil, seçenektir: limit dolunca sheet açılır — *Reklam izle (+1)* veya *Premium'a geç*. Reklam yüklenemediyse (no-fill) buton hiç görünmez → çalışmayan buton yok, Apple 2.1 riski yok.
4. **Sıklık tavanı.** Günde 1 geçiş + özellik başına 2 ödül. Sayaçlar cihaz-yerel (`dailyUsageService`), gün değişince sıfırlanır.

### Akış (fotoğraftan kalori)

```
[Tahmini kaloriyi hesapla]
   │
   ├─ premium? ──────────────► AI isteği → sonuç (reklam yok)
   │
   ├─ ücretsiz, hak var
   │     ├─ rıza kararı yok → AdConsentModal (bloklamaz; bu seferlik reklamsız devam)
   │     └─ rıza var → AI isteği gönderilir ──► geçiş reklamı (günde ≤1, yüklüyse) ──► sonuç
   │
   └─ ücretsiz, hak dolu → LimitReachedSheet
         ├─ [Reklam izle, +1 analiz]  (yalnızca ödüllü reklam yüklüyse ve günlük ödül ≤2)
         │       └─ izlendi → bonus +1 → kullanıcı butona tekrar basar → analiz
         └─ [Premium'a geç]           → Paywall
```

AI ile tam besin analizi (`FoodSearchModal`) aynı akışı `kind="food"` ile kullanır; geçiş reklamı sayacı iki akış için **ortaktır** (günde toplam 1).

---

## 2. AdMob hesabı ve konsol ayarları (0 ₺)

1. **Hesap:** https://admob.google.com → Google hesabıyla giriş → ülke **Türkiye**, para birimi TRY/USD (ödeme banka havalesi; eşik 100 $). Aynı Google hesabında AdSense varsa otomatik bağlanır.
2. **Uygulama ekle:** *Apps → Add app → iOS → "Is the app listed on a supported app store?"* Uygulama zaten App Store'da (1.3.x) → **Yes** → ESdiyet'i arayıp seç (App Store ID `6753659091`). Bu, hesabın "app verification" adımını hızlandırır.
   → **App ID** formatı: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (tilde ile).
3. **Ad unit'ler (2 adet):**
   - *Interstitial* → ad "ESdiyet iOS – AI analiz geçiş" → ID `ca-app-pub-…/…` (slash ile).
   - *Rewarded* → ad "ESdiyet iOS – Ek analiz ödüllü" → *Reward settings*: amount `1`, item `analysis`.
4. **Blocking controls (önemli — sağlık uygulaması):** *Brand safety → Blocking controls → All apps / ESdiyet → Sensitive categories*: **Weight loss, Pharmaceuticals/Health, Gambling & betting, Alcohol, Dating, Politics, Religion, Get rich quick, Sexual & reproductive health** kategorilerini engelle. Ayrıca *Ad content rating*: **PG** (kodda `maxAdContentRating: PG` ile eşleşir). Gerekçe: Reklam Kurulu (sağlık beyanlı ürün reklamı) + App Store 1.4.1/2.3.1 uyumu + kullanıcı güveni.
5. **Privacy & messaging:** Yalnızca Türkiye dağıtımı → AB/UK GDPR mesajı zorunlu değil, **oluşturma**. (İleride AB'ye açılırsa: "Create GDPR message" + kodda `AdsConsent` UMP akışı eklenmeli — bkz. §7.)
6. **app-ads.txt / uygulama doğrulama (yapıldı: 2026-09-22):** AdMob "ESdiyet (iOS) uygulamasını doğrulayamadık" dedi — kök neden App Store listesinde **geliştirici web sitesi (Marketing URL) yoktu** (`itunes.apple.com/lookup?id=6753659091` → `sellerUrl: null`), dolayısıyla AdMob'un app-ads.txt arayacağı alan da yoktu. Çözüm: kişisel site **`https://ebcturkiye.com`** (repo `ebcengiz/ebc`, Next.js static export, Netlify) → `public/app-ads.txt` eklendi (commit `b41b01b`), Netlify otomatik deploy etti; `https://ebcturkiye.com/app-ads.txt` **200 / text/plain** dönüyor, `www.` 301 ile köke yönleniyor. İçerik tam olarak:
   ```
   google.com, pub-2213399330903197, DIRECT, f08c47fec0942fa0
   ```
   **Durum (2026-09-22):** Apple yayındaki sürümde Marketing URL'yi kilitliyor (Support URL zaten `https://ebcturkiye.com/`) → ASC'de **1.4.0** oluşturuldu ve Marketing URL = `https://ebcturkiye.com/iletisim` kaydedildi. AdMob canlı mağaza listesini okuduğu için doğrulama **1.4.0 yayınlandıktan sonra** geçer: AdMob → Apps → ESdiyet → Verify app → **"Güncellemeleri kontrol edin"** (Apple kataloğu + AdMob taraması 24 saate kadar). Konsolda oluşturulan ad unit'ler ve engelleme ayarları için `hafiza.md` 2026-09-22 girdisine bak. Doğrulama olmadan da reklam servis edilir; ancak doğrulanmamış uygulamalarda bazı alıcılar teklif vermez — bu yüzden yapmaya değer. Not: dosya alan adının **kökünde** olmalı (`/iletisim` gibi bir sayfada değil).
7. **Yeni hesap gerçeği:** İlk günlerde/haftada "**no fill**" (reklam yok) normaldir; hesap ve uygulama doğrulaması tamamlanana kadar gelir düşüktür. Kod bunu tolere eder: ödüllü buton görünmez, geçiş reklamı sessizce atlanır.
8. **Asla** kendi cihazınızda gerçek ad unit ile reklamlara tıklamayın → hesap askıya alınır. Dev/TestFlight build'i zaten Google **TestIds** kullanır; gerçek cihazda gerçek ID test edecekseniz AdMob'da *Test devices* listesine cihazın IDFA'sını ekleyin.

---

## 3. Teknik kurulum (yapıldı — referans)

### 3.1 Paketler
```bash
npx expo install react-native-google-mobile-ads@^16.5.0 expo-tracking-transparency
```
- `react-native-google-mobile-ads` **16.5.0** (Ağu 2026). **v17.0.0 (18 Eyl 2026)** API'yi yeniledi ve 4 günlük — bu turda bilinçli olarak alınmadı; birkaç ay sonra changelog'a bakıp geçilebilir.
- **Expo Go'da çalışmaz** (native modül). Dev build şart: `npx expo prebuild --clean && npm run ios` ya da EAS `development` profili.

### 3.2 Yapılandırma
- `app.config.js`: plugin'ler burada eklenir (App ID `.env`'den; yoksa Google test App ID). ATT metni, `SKAdNetworkItems` (Google'ın 50 ID'lik resmî listesi), `delayAppMeasurementInit: true` (rıza öncesi ölçüm başlamaz).
- `app.json`: `version 1.4.0`, `buildNumber 10`, `privacyManifests.NSPrivacyTracking: true` + reklam veri tipleri (§5.3).
- `.env` (gitignore'lu):
  ```
  EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
  EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
  EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW
  # Test ortamında limit + ödüllü akışı denemek için:
  EXPO_PUBLIC_BYPASS_PAYWALL=false
  ```
  `npm run env:check` üçünü de listeler. Ad unit ID'leri sır değildir (client bundle'a girmesi normal); App ID **build zamanında** Info.plist'e yazılır → değiştirince `prebuild` gerekir.
- **EAS build'leri `.env`'i görmez** (gitignore'lu; bkz. hafiza.md 2026-09-12 Build 4 vakası). Üç değişkeni EAS ortamlarına da ekleyin, aksi hâlde production'da ücretsiz kullanıcıya reklam çıkmaz:
  ```bash
  eas env:create --scope project --environment production --visibility plaintext \
    --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value 'ca-app-pub-…~…'
  # aynı komut EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID ve EXPO_PUBLIC_ADMOB_REWARDED_ID için;
  # preview/development ortamlarına eklemek gerekmez (TestIds kullanılır).
  eas env:list --environment production   # doğrula
  ```
  Yerel Xcode arşivi (build 8/9 yöntemi) Metro'yu yerel `.env` ile çalıştırdığı için ek adım gerekmez.

### 3.3 Kod haritası
| Dosya | Görev |
|---|---|
| `src/services/adsService.js` | SDK sarmalayıcı. Modül kapsamında `try { require }` (Expo Go güvenli). `initAds`, `preload/show Interstitial/Rewarded`, `subscribeAdState`. Test ortamında `TestIds`. **`keywords`/`contentUrl` yok.** |
| `src/services/adConsentService.js` | Rıza kaydı (`esdiyet_ad_consent_v1`: `{decided, personalized, date, version}`) + ATT sarmalayıcı (`expo-tracking-transparency`, try/require). |
| `src/contexts/AdsContext.js` | Politika tek yerde: `adsEnabled = modül var && !isSubscribed`; günlük cap'ler; `showInterstitialIfEligible()`, `watchRewardedFor(kind)`, `getRewardedAvailability(kind)`, `setPersonalizedAds()`. Global `AdConsentModal` render eder. |
| `src/components/AdConsentModal.js` | KVKK aydınlatma + iki seçenek. |
| `src/components/ads/LimitReachedSheet.js` | Limit dolunca: ödüllü reklam (yüklüyse) + Premium CTA. |
| `src/services/dailyUsageService.js` | `getDailyBonus/addDailyBonus`; `hasReachedDailyLimit` bonusu hesaba katar. |
| `src/contexts/SubscriptionContext.js` | `dailyLimit = taban + bonusPhotoCredits`, `addBonusPhotoCredit`, `navigateTo`. |
| `src/screens/MealCalorieScreen.js`, `src/components/foodLog/FoodSearchModal.js` | AI isteği → geçiş reklamı → sonuç; limit → `LimitReachedSheet`. |
| `src/screens/ProfileScreen.js` | "Kişiselleştirilmiş reklamlar" switch'i (yalnızca ücretsizde). |
| `src/screens/PrivacyPolicyScreen.js`, `PRIVACY.md`, `HealthSourcesInfoScreen.js` | "Reklamlar" + "KVKK hakları" bölümleri; eski "reklam yapılmaz" cümleleri düzeltildi. |

### 3.4 Provider sırası
`SafeAreaProvider → ErrorBoundary → AuthProvider → AIConsentProvider → SubscriptionProvider → AdsProvider → ToastProvider → MainNavigator`
(`AdsProvider`, `isSubscribed` için `SubscriptionProvider`'ın içinde olmak zorunda.)

---

## 4. Apple — App Review'da ret yememek için

### 4.0 Bilinen ret: ITMS-91064 "Invalid tracking information" (çözüldü, build 13)
Build 12, Apple tarafından şu e-postayla reddedildi:
> ITMS-91064: Invalid tracking information — NSPrivacyTracking must be true if NSPrivacyTrackingDomains isn't empty.

**Kök neden:** `app.json → ios.privacyManifests`'te `NSPrivacyTracking: true` + `NSPrivacyTrackingDomains: []` (boş) birlikte geçersiz. AdMob/UMP SDK'larının kendi `PrivacyInfo.xcprivacy` dosyaları da izleme alan adı beyan etmiyor ve uygulama kodu doğrudan bir izleme alan adına bağlanmıyor (SDK içeride hallediyor) — listelenecek gerçek bir alan adı yok.

**Çözüm:** `NSPrivacyTracking: false` yapıldı (domain listesi zaten boş kalıyor, Expo plugin'i otomatik `NSPrivacyTrackingDomains: []` üretiyor — bu kombinasyon geçerli). **Bu değişiklik ATT akışını veya ASC App Privacy'deki "Used for tracking purposes" beyanlarını etkilemez** — üç ayrı sistem:
1. `PrivacyInfo.xcprivacy`'nin üst seviye `NSPrivacyTracking` anahtarı → yalnızca Apple'ın ITMS statik paket-tutarlılık kontrolü.
2. `NSUserTrackingUsageDescription` + runtime `requestTrackingPermissionsAsync()` → gerçek ATT sistem izni/prompt'u.
3. ASC → App Privacy → her veri tipi için "Used for tracking purposes" → App Store ürün sayfasındaki insan-okur beyan (Nutrition Label).

Eğer ileride uygulama kodu gerçekten bir izleme alan adına doğrudan bağlanırsa (örn. kendi ölçüm sunucunuz), o zaman `NSPrivacyTracking: true` + gerçek alan adları listelenmeli.

### 4.1 ATT (App Tracking Transparency) — Guideline 5.1.2
- **Ne zaman zorunlu?** Reklam kimliği (IDFA) ile kişiselleştirilmiş reklam = "tracking". Kullanıcı *Kişiselleştirilmiş* seçtiğinde `requestTrackingPermissionsAsync()` çağrılır; *Sadece genel* seçerse ATT hiç açılmaz ve istekler `requestNonPersonalizedAdsOnly: true` gider.
- **Yasaklar (koda uyuldu):** ATT reddine bağlı hiçbir özellik kapatılmaz; izin karşılığı ödül/teşvik yok (ödül yalnızca *reklam izleme* karşılığıdır, izin karşılığı değil); kendi pre-prompt'umuz (AdConsentModal) sistem diyaloğunu taklit etmez ve kullanıcıyı yanıltmaz.
- **`NSUserTrackingUsageDescription`** (Info.plist, plugin yazar): *"İzin verirseniz ücretsiz sürümdeki reklamlar ilgi alanlarınıza göre seçilir. Reddederseniz yalnızca genel reklam gösterilir; uygulama özellikleri değişmez."* — amacı, faydayı ve reddin sonucunu söyler (Apple'ın istediği şekil).
- **Simülatörde** ATT `unavailable`/`denied` döner; gerçek cihazda test edin (iOS Ayarlar → Gizlilik → Takip → "Uygulamaların takip isteğine izin ver" açık olmalı, yoksa prompt hiç çıkmaz — bu Apple'ın davranışı, hata değil).

### 4.2 Privacy Manifest (`PrivacyInfo.xcprivacy`)
`app.json → ios.privacyManifests` ile üretilir: `NSPrivacyTracking: true`, ek veri tipleri: **DeviceID** (tracking), **AdvertisingData** (tracking), **ProductInteraction**, **CoarseLocation**, **CrashData**, **PerformanceData** — Google'ın açıkladığı SDK veri toplama listesi. Google Mobile Ads SDK (≥11.2) kendi manifestini ve tracking domain'lerini paketle getirir; uygulama manifestinde `NSPrivacyTrackingDomains` boş bırakılır. `npx expo prebuild` sonrası `ios/ESdiyet/PrivacyInfo.xcprivacy` içinde doğrulayın.

### 4.3 App Store Connect → App Privacy (Nutrition Label) — **1.4.0 göndermeden önce**
*App Privacy → Edit* — mevcut beyanlara (Ad, E-posta, Sağlık, Fitness, Fotoğraf, Kullanıcı ID) şunları **ekleyin**:

| Veri tipi | Kullanım amacı | Kullanıcıya bağlı | Takip için |
|---|---|---|---|
| Identifiers → **Device ID** | Third-Party Advertising | Hayır | **Evet** |
| Usage Data → **Advertising Data** | Third-Party Advertising | Hayır | **Evet** |
| Usage Data → **Product Interaction** | Third-Party Advertising, Analytics | Hayır | Hayır |
| Location → **Coarse Location** | Third-Party Advertising | Hayır | Hayır |
| Diagnostics → **Crash Data** | App Functionality | Hayır | Hayır |
| Diagnostics → **Performance Data** | App Functionality | Hayır | Hayır |

"Takip için: Evet" işaretlediğinizde ASC, uygulamanın ATT kullandığını varsayar — kodda mevcut. Yalnızca genel reklam seçen kullanıcı için takip yapılmaz ama beyan "en geniş durum"u kapsamalıdır.

### 4.4 Yaş derecelendirmesi ve reklam içeriği (1.4.1, 2.3.1)
ASC *Age Rating* mevcut değeriyle `maxAdContentRating` uyumlu olmalı: 4+ → kodda `MaxAdContentRating.G`'ye çekin (fill düşer); 12+ → mevcut **PG** uygundur. AdMob'da hassas kategoriler engelli (§2.4). Reklamlar uygulama içeriğinden ayırt edilir (AdMob tam ekran formatları kendi "Ad" etiketiyle gelir).

### 4.5 Diğer kılavuz maddeleri
- **2.1 Tamamlanmışlık:** Ödüllü buton reklam yoksa görünmez; geçiş reklamı yüklenmediyse akış aynen devam eder → reviewer boş/ölü buton görmez.
- **3.1.1 / 3.1.2:** Ödül = uygulama içi hak, para değil. Abonelik değişmedi.
- **4.0 Tasarım:** Reklam ana içeriği kapatmaz (banner yok), günde 1 geçiş.
- **5.1.1(iii):** Reklam rızası hizmet şartı değil.
- **5.1.3 Sağlık:** Sağlık verisi reklam amaçlı kullanılmaz — kod + gizlilik metni + HealthSourcesInfo ekranı tutarlı.

### 4.6 Review Notes (ASC "Notes" alanına eklenecek metin)
```
Version 1.4.0 adds Google AdMob ads for FREE-tier users only (Premium subscribers never see ads).
• Ads appear only in two places: (1) a single interstitial per day while an AI analysis is loading,
  (2) an optional rewarded video when the daily free AI quota is reached ("Watch ad, +1 analysis").
• Before the first ad the app shows an in-app choice (personalized vs. general ads). Only if the user
  picks "personalized" is the system App Tracking Transparency prompt shown. Declining never limits
  any feature. Health data is never sent to the ad network.
• Demo account (free tier, ads visible): enesbugracengiz+ekran@gmail.com / EkranTest2026
  To trigger: Home → "Fotoğraftan kalori" → pick any food photo → "Tahmini kaloriyi hesapla".
  Second analysis the same day opens the quota sheet with the rewarded-ad option (shown only when an ad
  is available from AdMob).
```

---

## 5. KVKK (6698) uyum listesi

| # | Yükümlülük | Durum / Yapılacak |
|---|---|---|
| 1 | **Aydınlatma (m.10)** — veri sorumlusu, işlenen veri, amaç, hukuki sebep, aktarım, haklar | ✅ `PRIVACY.md` + `PrivacyPolicyScreen` "Reklamlar" ve "KVKK Hakları" bölümleri. **Yapılacak:** "Veri sorumlusu" satırına gerçek ad-soyad/unvan ve adres ekleyin (şu an yalnızca e-posta var). |
| 2 | **Açık rıza (m.3, m.5/1)** — belirli konuya ilişkin, bilgilendirilmiş, özgür irade | ✅ `AdConsentModal`: ayrı ekran, iki seçenek, tarihli kayıt (`esdiyet_ad_consent_v1.date`), hizmet şartı değil (ret → genel reklam, uygulama tam çalışır). |
| 3 | **Rızanın geri alınması** | ✅ Profil → *Kişiselleştirilmiş reklamlar* switch'i; iOS Ayarlar → Takip. |
| 4 | **Özel nitelikli veri (m.6) — sağlık** reklam işlemesine karışmamalı | ✅ `adsService` hiçbir hedefleme alanı göndermez; kod yorumu ile kilitli. **Kural:** ileride `keywords`, `contentUrl`, `customTargeting` eklenmez. |
| 5 | **Kişiselleştirilmemiş reklamın dayanağı** — IP/cihaz bilgisi de kişisel veridir | Metinde m.5/2-f **meşru menfaat** (ücretsiz hizmetin finansmanı) olarak açıklandı. *Avukat teyidi:* KVKK Kurulu'nun 2022 "Çerez Uygulamaları Rehberi" reklam kimliği/çerez için rıza eğilimindedir; en muhafazakâr yol, "Sadece genel" seçeneğinin de aktif bir onay olarak kaydedilmesidir — mevcut kod bunu zaten yapıyor (`decided: true`). |
| 6 | **Yurt dışına aktarım (m.9)** — Google sunucuları TR dışında | Metinde açıklandı. *Avukat teyidi:* 7499 s. Kanun (Haz 2024) sonrası düzenli aktarım için "yeterlilik kararı" ya da **standart sözleşme + 5 iş günü içinde Kurul'a bildirim** aranır; açık rıza yalnızca *arızi* aktarımlar için istisnadır. Google'ın [Ads Data Processing Terms](https://business.safety.google/adsprocessorterms/) içindeki sözleşme hükümlerinin TR standart sözleşme yerine geçip geçmediği hukuki değerlendirme gerektirir. |
| 7 | **VERBİS** | *Avukat teyidi:* Gerçek kişi / <50 çalışan / <25 M TL bilanço muafiyeti vardır **ancak** "ana faaliyeti özel nitelikli veri (sağlık) işlemek olan" veri sorumluları muaf değildir. ESdiyet kilo/VKİ işlediği için bu değerlendirme reklamdan bağımsız olarak da yapılmalı. |
| 8 | **Veri işleyen sözleşmesi** | AdMob hesabı açılırken *Google AdMob Terms* + *Google Ads Data Processing Terms* kabul edilir; PDF/ekran görüntüsünü saklayın (m.12 tedbir kaydı). |
| 9 | **Reklam içeriği mevzuatı** (Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği; sağlık beyanı yasağı) | AdMob *Blocking controls* ile sağlık/ilaç/kilo verme/kumar/alkol kategorileri engelli (§2.4). Reklam metnini ESdiyet üretmez; reklamlar AdMob tarafından "reklam" olarak etiketlenir. |
| 10 | **6563 Ticari İletişim** | Uygulanmaz — SMS/e-posta/push ticari ileti yok. |
| 11 | **Çocuklar** | Uygulama 4+/12+ ama çocuklara yönelik değil; `tagForChildDirectedTreatment: false`. Kayıtta yaş sorulmuyor; ileride 13 yaş altı sinyali alınırsa `ageRestrictedTreatment: CHILD` düşünülmeli. |

**Aydınlatma metni kontrol listesi (PRIVACY.md'de mevcut):** kimlik (veri sorumlusu) · işlenen veri · amaç · hukuki sebep · aktarım (yurt dışı) · saklama · m.11 hakları · başvuru yolu · rızanın geri alınması.

---

## 6. Test matrisi

| Adım | Beklenen |
|---|---|
| `npm run env:check` | AdMob satırları listelenir (dev'de "○" normal). |
| `npx expo prebuild --clean` → `ios/ESdiyet/Info.plist` | `GADApplicationIdentifier`, `GADDelayAppMeasurementInit`, 50 `SKAdNetworkItems`, `NSUserTrackingUsageDescription` var. `PrivacyInfo.xcprivacy` → `NSPrivacyTracking true`. |
| `.env`: `EXPO_PUBLIC_BYPASS_PAYWALL=false` → `npm run ios` (simülatör) | Ücretsiz hesapla ilk fotoğraf analizinde **AdConsentModal**; "Kişiselleştirilmiş" → simülatörde ATT `unavailable` (normal) → analiz. İkinci analizde **test geçiş reklamı** (Google "Test Ad" etiketi) yüklenirken; aynı gün üçüncüde geçiş **yok**. |
| Limit | İkinci analiz denemesinde `LimitReachedSheet`; "Reklam izle" **test rewarded** → kapatınca "+1 hak" toast'u → analiz çalışır. Üçüncü ödülde "günlük sınır" bilgisi. |
| Premium (`activateTestSubscription`) | Hiç reklam / rıza sheet'i / Profil switch'i yok. |
| Guest | AI ekranları `GuestGateBanner` → reklam akışı tetiklenmez. |
| Expo Go | Açılışta çökme yok; console'da "AdMob native modülü yok" uyarısı; akışlar reklamsız çalışır. |
| Profil switch | Kapat → sonraki reklam isteği non-personalized (Metro'da `requestNonPersonalizedAdsOnly` logu yok; AdMob "Ad inspector" ile doğrulanabilir). |
| Gerçek cihaz (TestFlight, `preview` profili) | ATT sistem prompt'u görünür; test reklamları döner. |
| Production build | Gerçek ID'ler; yeni AdMob hesabında no-fill olabilir → ödüllü buton gizli, geçiş atlanır, hata yok. |

EAS: `eas build:version:set --platform ios` ile sayaç ≥10; `eas build --platform ios --profile preview` (TestFlight) → `--profile production`.

---

## 7. İleride (kapsam dışı, not)
- **AB/UK'ye açılırsa:** AdMob *Privacy & messaging* → GDPR mesajı oluştur; kodda `AdsConsent.requestInfoUpdate()` + `AdsConsent.loadAndShowConsentFormIfRequired()` (UMP) `initAds` öncesine eklenir; `AdConsentModal` yine KVKK için kalır.
- **v17 geçişi:** `react-native-google-mobile-ads@17` (RN ≥0.76, New Arch — bu proje uyumlu). API yenilendiği için `adsService.js` uyarlanır; diğer katmanlar değişmez.
- **Mediation:** Gelir artırmak için AppLovin/Unity adaptörleri (ücretsiz) — her biri yeni SKAdNetwork ID'leri ve ek privacy beyanı getirir.
- **Sunucu tarafı ödül doğrulama (SSV):** Şu an bonus cihaz-yerel "yumuşak limit" mantığıyla tutuluyor (limitler zaten yumuşak). Kötüye kullanım görülürse AdMob SSV + Supabase Edge Function.
