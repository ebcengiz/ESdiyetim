# Apple'a TestFlight "Beta Contract Missing" talebi — ESdiyet

**Tarih:** 2026-09-15
**Durum:** Kök neden kesinleşti, çözüm yalnızca Apple tarafında (backend). Kod/konfig değişikliği sorunu çözmez.

**GÖNDERİLDİ (2026-09-15):**
- Apple Developer Support (Distribution → TestFlight → Email): **Case ID 102963350199** — yanıt `enesbugracengiz@icloud.com` adresine e-posta ile gelecek.
- Feedback Assistant (Developer Tools & Resources → TestFlight → Incorrect/Unexpected Behavior, iOS + App Store Connect): **FB24778484** — `ESdiyet_BETA_CONTRACT_MISSING_evidence.txt` eki ile.
- Takip: https://feedbackassistant.apple.com/feedback/24778484 ve gelen e-postalar. Apple "resolved" derse yeni build yükle (`eas build --platform ios --profile production` → `eas submit`).

## Kanıt (ASC oturumundan alınan gerçek API yanıtı)

`POST https://appstoreconnect.apple.com/iris/v1/betaAppReviewSubmissions` (build `941dbf0d-c02e-492b-8f77-90443db0d5e2` = 1.3.2 (6)):

```json
{
  "errors" : [ {
    "id" : "c8b86c83-d2b4-4eb1-bb60-f0f94726ba4a",
    "status" : "422",
    "code" : "ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING",
    "title" : "Beta contract is missing for the app.",
    "detail" : "Beta Contract is missing."
  } ]
}
```

Bu hata, TestFlight uygulamasındaki **"ESdiyet yüklenemedi. İstenilen uygulama kullanılamıyor veya yok."** mesajının bilinen karşılığıdır (bkz. Apple Developer Forums thread 814565, 815885, 821498, 767430, 812811 — 2026 boyunca yüzlerce geliştirici, aynı belirtiler).

## Nereye yazılacak (ikisini de yap)

1. **Apple Developer Support:** https://developer.apple.com/contact/ → *App Store Connect* → *TestFlight* (veya *Other App Store Connect Issue*). Aşağıdaki İngilizce metni yapıştır.
2. **Feedback Assistant:** https://feedbackassistant.apple.com → *Developer Tools & Resources* → *App Store Connect* → aynı metin + ek olarak tarayıcı HAR kaydı (Chrome DevTools → Network → sağ tık → "Save all as HAR with content", `betaAppReviewSubmissions` isteği görünürken).
3. İsteğe bağlı: https://developer.apple.com/forums/thread/814565 altına case numaranı yazarak diğer geliştiricilerin yaptığı gibi görünürlük yarat.

Destek talebi sonuç verince Apple genelde şunu der: *"The issue should be resolved now. Please upload another build after 48 hours."* → O zaman **yeni bir build** (`eas build --platform ios --profile production` → `eas submit`) yükle; eski build'ler düzelmeyebilir.

## Apple'a gönderilecek metin (İngilizce, kopyala-yapıştır)

```
Subject: TestFlight blocked — ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING (Team AVL8UT8FA8, App 6753659091)

Hello,

Since 11 September 2026, none of our internal TestFlight testers can install any build of our app. The TestFlight app on iPhone (iOS 26.x and iOS 27.0) shows:
"Could not install ESdiyet. The requested app is not available or doesn't exist."

The App Store Connect API confirms the cause. Attempting to create a beta app review submission returns:

POST /v1/betaAppReviewSubmissions
HTTP 422
{
  "id": "c8b86c83-d2b4-4eb1-bb60-f0f94726ba4a",
  "code": "ENTITY_UNPROCESSABLE.BETA_CONTRACT_MISSING",
  "title": "Beta contract is missing for the app.",
  "detail": "Beta Contract is missing."
}

Account / app details:
- Team ID: AVL8UT8FA8 (Individual, Account Holder)
- Apple ID (account holder): enesbugracengiz@icloud.com
- App: ESdiyet — Apple ID 6753659091 — Bundle ID com.esdiyet.app
- Affected builds (all "Valid", assigned to internal group "ESdiyet Test", state IN_BETA_TESTING):
  1.3 (4) uploaded 2026-09-11, 1.3.1 (1) uploaded 2026-09-12, 1.3.2 (1) and 1.3.2 (6) uploaded 2026-09-14
- Last build that installed fine via TestFlight: 1.2 (1), uploaded 2026-04-21 (testers installed it on 2026-05-03)
- The same builds submit to and are approved on the App Store without any problem; only TestFlight is affected.

Everything on our side is in order:
- Apple Developer Program License Agreement: accepted 24 August 2026 (issued 18 August 2026)
- Free Apps and Paid Apps agreements: In Effect (175 territories)
- Banking, tax forms: Active; no pending agreements or contract messages in App Store Connect
- Export compliance set (usesNonExemptEncryption = false), no warnings on any build
- App is "Available for Sale", not removed
- Membership renewal date: 6 October 2026

We have not changed anything on the account; the beta contract appears to have been dropped on Apple's side. This matches the widely reported issue in Developer Forums threads 814565, 815885 and 821498, which Apple engineers resolved by re-provisioning the TestFlight beta contract for the team/app.

Could you please re-provision the TestFlight Beta Contract for Team AVL8UT8FA8 / App 6753659091 and let us know when we should upload a new build?

Thank you.
```

## Apple düzeltene kadar test için geçici yol (TestFlight'a bağımlı olmayan)

- **EAS internal distribution (ad-hoc):** `eas.json`'daki `preview` profili zaten `distribution: internal`. Test edeceklerin cihaz UDID'lerini `eas device:create` ile kaydet, sonra `eas build --platform ios --profile preview` → EAS'ın verdiği link/QR ile doğrudan kurulum (TestFlight kullanılmaz). `EXPO_PUBLIC_IS_TESTFLIGHT=true` profilde tanımlı olduğundan paywall bypass'ı da aynı şekilde çalışır.
- Kendi cihazın için: `npx expo run:ios --device` (zaten telefonda bu şekilde kurulmuş bir 1.3.2 (1) kopyası var).
- Gerçek kullanıcılar etkilenmiyor: App Store sürümü (1.3.1 / 1.3.2) TestFlight'tan bağımsız dağıtılıyor.
