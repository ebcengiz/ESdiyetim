# Store Yayınlama Rehberi - ESdiyet

Bu rehber, ESdiyet uygulamasını Google Play Store ve Apple App Store'a yayınlamak için gerekli tüm adımları içerir.

## 📋 İçindekiler

1. [Ön Hazırlık](#ön-hazırlık)
2. [EAS Build Kurulumu](#eas-build-kurulumu)
3. [Görsel Materyaller](#görsel-materyaller)
4. [Google Play Store Yayınlama](#google-play-store-yayınlama)
5. [Apple App Store Yayınlama](#apple-app-store-yayınlama)
6. [Yaygın Sorunlar ve Çözümler](#yaygın-sorunlar-ve-çözümler)

## Ön Hazırlık

### Gerekli Hesaplar

1. **Expo Hesabı** (Ücretsiz)
   - [https://expo.dev](https://expo.dev) üzerinden kayıt olun

2. **Google Play Console** ($25 tek seferlik ücret)
   - [https://play.google.com/console](https://play.google.com/console)
   - Kredi kartı ile ödeme yapılır

3. **Apple Developer Program** ($99/yıl)
   - [https://developer.apple.com](https://developer.apple.com)
   - Sadece macOS'ta geliştirme yapabilirsiniz

### Yasal Gereklilikler

✅ **Tamamlanması Gerekenler**:

1. **Gizlilik Politikası**
   - Kullanıcı verilerinin nasıl kullanıldığını açıklayan belge
   - Online hosting gerekir (örn: yourwebsite.com/privacy-policy)
   - Şablon: [privacypolicies.com](https://www.privacypolicies.com/live/ESdiyet)

2. **Kullanım Koşulları**
   - Uygulamanın kullanım şartları
   - Online hosting gerekir

3. **Şirket/Kişisel Bilgiler**
   - TC Kimlik No veya Şirket Vergi No
   - İletişim bilgileri
   - Adres bilgileri

## EAS Build Kurulumu

EAS (Expo Application Services), uygulamanızı build etmek için kullanılır.

### 1. EAS CLI Kurulumu

```bash
npm install -g eas-cli
```

### 2. Expo Hesabına Giriş

```bash
eas login
```

### 3. EAS Projesini Yapılandırma

```bash
eas build:configure
```

Bu komut `eas.json` dosyası oluşturur:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  }
}
```

### 4. app.json Yapılandırması

`app.json` dosyanızı güncelleyin:

```json
{
  "expo": {
    "name": "ESdiyet",
    "slug": "esdiyet",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#4CAF50"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.esdiyet",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSCameraUsageDescription": "Bu uygulama kameranızı kullanmaz",
        "NSPhotoLibraryUsageDescription": "Bu uygulama fotoğraf galerinizi kullanmaz"
      }
    },
    "android": {
      "package": "com.yourcompany.esdiyet",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": []
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

**Önemli**: `bundleIdentifier` ve `package` değerlerini benzersiz yapın!

## Görsel Materyaller

### Gerekli Görseller

1. **App Icon** (Zorunlu)
   - Boyut: 1024x1024 px
   - Format: PNG (transparan olmamalı)
   - Dosya: `./assets/icon.png`

2. **Splash Screen** (Zorunlu)
   - Boyut: 2048x2732 px (iPad Pro için)
   - Format: PNG
   - Dosya: `./assets/splash.png`

3. **Adaptive Icon** (Android için)
   - Boyut: 1024x1024 px
   - Format: PNG (transparan olabilir)
   - Dosya: `./assets/adaptive-icon.png`

### Store Ekran Görüntüleri

**Her iki platform için de gerekli**:

- **Android**: En az 2 ekran görüntüsü
  - Boyut: 1080x1920 px (9:16)
  - Önerilen: 4-8 adet

- **iOS**: Her cihaz boyutu için
  - iPhone 6.5" (1242x2688 px)
  - iPhone 5.5" (1242x2208 px)
  - iPad Pro 12.9" (2048x2732 px)

### Görsel Oluşturma Araçları

- **Ücretsiz Online Araçlar**:
  - [Canva](https://www.canva.com) - Icon ve grafik tasarımı
  - [MakeAppIcon](https://makeappicon.com) - Tüm boyutları otomatik oluştur
  - [AppIcon.co](https://appicon.co) - iOS ve Android icon generator

- **Öneri**: ESdiyet teması için yeşil (#4CAF50) ve beyaz renkleri kullanın

## Google Play Store Yayınlama

### 1. Google Play Console'a Giriş

1. [Google Play Console](https://play.google.com/console) adresine gidin
2. İlk kez giriş yapıyorsanız $25 ödeme yapın
3. "Uygulama oluştur" butonuna tıklayın

### 2. Uygulama Detayları

- **Uygulama adı**: ESdiyet
- **Varsayılan dil**: Türkçe
- **Uygulama veya oyun**: Uygulama
- **Ücretsiz veya ücretli**: Ücretsiz

### 3. Store Listesi Hazırlama

**Gerekli Bilgiler**:

- **Kısa açıklama** (80 karakter):
  ```
  Sağlıklı yaşam için diyet ve kilo takip uygulaması
  ```

- **Tam açıklama** (4000 karakter):
  ```
  ESdiyet ile sağlıklı yaşam yolculuğunuza başlayın!

  🥗 ÖZELLİKLER:

  ✅ Diyet Programı Yönetimi
  • Günlük öğünlerinizi planlayın
  • Kahvaltı, ara öğünler, öğle ve akşam yemeklerini takip edin
  • Kalori bilgisi ekleyin

  ⚖️ Kilo Takibi
  • Kilonuzu düzenli kaydedin
  • İlerlemenizi grafik ile takip edin
  • Hedeflerinize ulaşın

  💡 Sağlık Tavsiyeleri
  • Beslenme tavsiyeleri
  • Egzersiz önerileri
  • Motivasyon ipuçları

  🎨 Modern ve Kullanıcı Dostu Arayüz
  • Şık ve temiz tasarım
  • Kolay navigasyon
  • Hızlı erişim

  ESdiyet, diyetisyeninizin verdiği programı kolayca takip etmenizi sağlar.
  Sağlıklı yaşam yolculuğunuzda yanınızdayız!

  ⚠️ Not: Bu uygulama tıbbi tavsiye niteliği taşımaz.
  Sağlık sorunlarınız için mutlaka doktorunuza başvurun.
  ```

- **Ekran görüntüleri**: Hazırladığınız 4-8 adet görüntüyü yükleyin

- **Öne çıkan grafik** (1024x500 px): Store'da görünecek banner

- **Kategori**: Sağlık ve Fitness

- **İletişim bilgileri**: Email, telefon, web sitesi (opsiyonel)

- **Gizlilik politikası**: URL (zorunlu!)

### 4. İçerik Derecelendirmesi

1. "İçerik derecelendirmesi" bölümüne gidin
2. Anketi doldurun:
   - Şiddet içeriği yok
   - Yetişkin içeriği yok
   - Hassas konular yok
   - Veri toplama var (Supabase için)

### 5. Uygulama Erişimi

- Tüm özelliklere erişim: Evet (login yok)
- Test hesabı gerekmez

### 6. Build Oluşturma ve Yükleme

```bash
# Production build oluştur
eas build --platform android --profile production
```

Bu komut:
1. Uygulamanızı build eder
2. AAB (Android App Bundle) dosyası oluşturur
3. Build bitince download linki verir

**Build Tamamlandıktan Sonra**:

1. AAB dosyasını indirin
2. Play Console > "Sürümler" > "Üretim" > "Yeni sürüm oluştur"
3. AAB dosyasını yükleyin
4. Sürüm notları yazın:
   ```
   🎉 ESdiyet'in ilk sürümü!

   • Diyet programı takibi
   • Kilo takip sistemi
   • Sağlık tavsiyeleri
   • Modern ve kullanıcı dostu arayüz
   ```

5. "İnceleme için gönder" butonuna basın

### 7. İnceleme Süreci

- **Süre**: 1-7 gün
- **Durum**: Play Console'dan takip edin
- **Red durumunda**: Email ile bildirilir, düzeltip tekrar gönderebilirsiniz

## Apple App Store Yayınlama

### 1. Apple Developer Hesabı

1. [developer.apple.com](https://developer.apple.com) adresine gidin
2. $99/yıl ödeme yaparak kayıt olun
3. Onay süreci 1-2 gün sürebilir

### 2. App Store Connect'te Uygulama Oluşturma

1. [App Store Connect](https://appstoreconnect.apple.com) adresine gidin
2. "My Apps" > "+" > "New App" tıklayın

**Gerekli Bilgiler**:
- **Platform**: iOS
- **Name**: ESdiyet
- **Primary Language**: Turkish
- **Bundle ID**: com.yourcompany.esdiyet (daha önce app.json'da belirlediğiniz)
- **SKU**: esdiyet-001 (unique bir ID)

### 3. App Information

- **Name**: ESdiyet
- **Subtitle** (30 karakter): "Sağlıklı Yaşam Takibi"
- **Privacy Policy URL**: (zorunlu)
- **Category**: Health & Fitness
- **Content Rights**: Kendi içeriğiniz

### 4. Pricing and Availability

- **Price**: Free
- **Availability**: All countries (veya seçtiğiniz ülkeler)

### 5. App Store Listesi Hazırlama

**Açıklama** (4000 karakter):
```
ESdiyet ile sağlıklı yaşam yolculuğunuza başlayın!

🥗 ÖZELLİKLER

✅ Diyet Programı Yönetimi
• Günlük öğünlerinizi kolayca planlayın
• Kahvaltı, ara öğünler, öğle ve akşam yemeklerini takip edin
• Kalori bilgisi ekleyin ve kontrol edin

⚖️ Kilo Takibi
• Kilonuzu düzenli olarak kaydedin
• Grafiklerle ilerlemenizi görün
• Hedeflerinize adım adım ulaşın

💡 Sağlık Tavsiyeleri
• Beslenme ile ilgili öneriler
• Egzersiz önerileri
• Motivasyon ipuçları
• Günlük tavsiyeler

🎨 Modern ve Kullanıcı Dostu Arayüz
• Şık ve temiz tasarım
• Kolay navigasyon
• Beyaz ve yeşil renk paleti
• Hızlı erişim özellikleri

ESdiyet, diyetisyeninizin verdiği programı kolayca takip etmenizi sağlar.
Sağlıklı yaşam yolculuğunuzda her zaman yanınızdayız!

⚠️ Önemli Not:
Bu uygulama tıbbi tavsiye niteliği taşımaz.
Sağlık sorunlarınız için mutlaka doktorunuza başvurun.
```

**Keywords** (100 karakter):
```
diyet,kilo,takip,sağlık,beslenme,fitness,kalori,sağlıklı yaşam,zayıflama
```

**Promotional Text** (170 karakter):
```
Yeni ESdiyet ile diyetinizi kolayca takip edin! Kilo hedeflerinize ulaşın, sağlıklı yaşamın keyfini çıkarın.
```

**Ekran Görüntüleri**:
- Her cihaz boyutu için gerekli
- En az 3, en fazla 10 adet
- Uygulama içi gerçek görüntüler

### 6. Build ve Yükleme

```bash
# iOS production build
eas build --platform ios --profile production
```

**macOS'ta Xcode ile**:

1. Xcode'u açın
2. Archive > Distribute App
3. App Store Connect'e yükleyin

**veya EAS Submit ile**:

```bash
# Otomatik yükleme
eas submit --platform ios
```

### 7. App Review Information

- **Sign-in required**: No (login yok)
- **Contact Information**: Email ve telefon
- **Notes**: Uygulamanın nasıl test edileceği

**Örnek Not**:
```
ESdiyet bir diyet ve kilo takip uygulamasıdır.

Test Adımları:
1. Ana sayfadan tüm özellikleri görüntüleyin
2. "Diyetim" sekmesinden diyet programı ekleyin
3. "Kilom" sekmesinden kilo kaydı ekleyin
4. "Tavsiyeler" sekmesinden sağlık tavsiyelerini görün

Login gerekmez, tüm özellikler hemen kullanılabilir.
```

### 8. Submit for Review

1. Tüm bilgileri kontrol edin
2. "Submit for Review" butonuna basın
3. İnceleme süreci: 1-3 gün

## Yaygın Sorunlar ve Çözümler

### Build Hataları

**Hata**: "Build failed"
**Çözüm**:
```bash
# Cache'i temizle
rm -rf node_modules
npm install
eas build --platform android --clear-cache
```

### Rejected: 4.3 Design Spam

**Sebep**: Uygulama çok benzer başka uygulamalara
**Çözüm**:
- Unique özellikler ekleyin
- Tasarımı daha özgün yapın
- Red gerekçesini okuyup ona göre düzeltin

### Missing Privacy Policy

**Çözüm**:
- Gizlilik politikası URL'i ekleyin
- Online erişilebilir olmalı
- Türkçe ve İngilizce olması önerilir

### Permission Issues

**Android**:
```json
// app.json
"android": {
  "permissions": []  // Sadece gerekli izinler
}
```

**iOS**:
```json
"ios": {
  "infoPlist": {
    // Sadece kullanılan özelliklerin açıklaması
  }
}
```

## 📊 Yayın Sonrası

### Analytics Ekleme

```bash
npm install expo-firebase-analytics
```

### Güncelleme Yayınlama

1. `app.json` içinde version ve build number artırın:
```json
"version": "1.0.1",
"android": { "versionCode": 2 },
"ios": { "buildNumber": "1.0.1" }
```

2. Yeni build oluşturun
3. Store'lara yükleyin

### Kullanıcı Geri Bildirimleri

- Store yorumlarını düzenli kontrol edin
- Hatalara hızlı çözüm üretin
- Kullanıcı isteklerini değerlendirin

## 📋 Checklist

Yayınlamadan önce kontrol edin:

- [ ] Supabase bağlantısı çalışıyor
- [ ] Tüm özellikler test edildi
- [ ] Icon ve splash screen hazır
- [ ] Gizlilik politikası hazır ve online
- [ ] Store açıklamaları hazır
- [ ] Ekran görüntüleri hazır
- [ ] app.json yapılandırması tamamlandı
- [ ] Bundle ID / Package name benzersiz
- [ ] Test edildi (iOS ve Android)
- [ ] Telif sorunları kontrol edildi

## 🎉 Tebrikler!

Uygulamanız store'larda!

İlk kullanıcılarınızdan geri bildirim almayı unutmayın ve uygulamanızı sürekli geliştirmeye devam edin.

## 📚 Faydalı Kaynaklar

- [Expo Dokümantasyonu](https://docs.expo.dev)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [Google Play Console Yardım](https://support.google.com/googleplay/android-developer)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)