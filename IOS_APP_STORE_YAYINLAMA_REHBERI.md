# iOS App Store Yayınlama Rehberi - ESdiyet

Bu rehber, ESdiyet uygulamasını Xcode üzerinden App Store'da yayınlamak için gereken tüm adımları detaylı şekilde içermektedir.

---

## 📋 İçindekiler

1. [Ön Hazırlık](#ön-hazırlık)
2. [Apple Developer Hesap Ayarları](#apple-developer-hesap-ayarları)
3. [Xcode Proje Yapılandırması](#xcode-proje-yapılandırması)
4. [App Store Connect Ayarları](#app-store-connect-ayarları)
5. [Archive Oluşturma ve Yükleme](#archive-oluşturma-ve-yükleme)
6. [App Store Metadata Hazırlama](#app-store-metadata-hazırlama)
7. [İncelemeye Gönderme](#incelemeye-gönderme)
8. [Sorun Giderme](#sorun-giderme)

---

## 🔧 Ön Hazırlık

### Gereksinimler

✅ **Tamamlanmış Olanlar:**
- Mac bilgisayar (macOS Sonoma veya üzeri)
- Xcode yüklenmiş (App Store'dan)
- Apple Developer Program üyeliği ($99/yıl)
- ESdiyet projesi Xcode workspace açık

✅ **Proje Bilgileri:**
- **Bundle ID:** `com.esdiyet.app`
- **Versiyon:** 1.0.0
- **Build Number:** 1
- **App İsmi:** ESdiyet
- **App Icon:** ✅ Hazır (1024x1024 px)

### Proje Yapısı Kontrolü

```bash
ESdiyetim/
├── ios/
│   ├── ESdiyet/
│   │   ├── Images.xcassets/
│   │   │   └── AppIcon.appiconset/
│   │   │       └── App-Icon-1024x1024@1x.png ✅
│   │   └── Info.plist ✅
│   ├── ESdiyet.xcworkspace ✅
│   └── ESdiyet.xcodeproj ✅
└── app.json ✅
```

---

## 🍎 Apple Developer Hesap Ayarları

### Adım 1: Apple Developer Hesabını Xcode'a Ekle

1. **Xcode > Settings** (veya **Xcode > Preferences**) menüsüne gidin
2. **Accounts** sekmesine tıklayın
3. Sol alttaki **+** butonuna tıklayın
4. **Apple ID** seçin
5. Apple Developer hesabınızla **giriş yapın**
6. Hesabınız listede görünecektir

✅ **Tamamlandı!**

### Adım 2: Distribution Certificate Oluşturma

1. Accounts sekmesinde, eklediğiniz hesabı seçin
2. Sağ tarafta **Manage Certificates** butonuna tıklayın
3. Sol alttaki **+** butonuna tıklayın
4. **Apple Distribution** seçin
5. Sertifika otomatik olarak oluşturulacaktır

> **Not:** Zaten bir Distribution Certificate varsa, yeni bir tane oluşturmanıza gerek yok.

### Adım 3: App ID Oluşturma (Identifiers)

1. **https://developer.apple.com/account** adresine gidin
2. Sol menüden **Identifiers** seçin
3. **+ butonuna** tıklayın
4. **App IDs** seçip **Continue**
5. **App** seçip **Continue**
6. Formu doldurun:
   - **Description:** ESdiyet
   - **Bundle ID:** `com.esdiyet.app` (Explicit)
   - **Capabilities:**
     - Push Notifications (isteğe bağlı)
     - Associated Domains (isteğe bağlı)
7. **Continue** > **Register** butonuna tıklayın

---

## ⚙️ Xcode Proje Yapılandırması

### Adım 1: Workspace'i Aç

```bash
# Terminal'den açmak için:
open ios/ESdiyet.xcworkspace
```

> **ÖNEMLİ:** `.xcodeproj` değil, `.xcworkspace` dosyasını açın! (Pods kullanıldığı için)

### Adım 2: Proje Ayarlarını Yapılandır

1. **Xcode'da ESdiyet workspace'i açın**
2. Sol tarafta proje navigatöründe **ESdiyet** projesine tıklayın
3. **TARGETS** altında **ESdiyet** seçin
4. Üst menüden **Signing & Capabilities** sekmesine geçin

#### Signing Ayarları

- **Automatically manage signing:** ✅ İşaretleyin
- **Team:** Apple Developer hesabınızı seçin (dropdown'dan)
- **Bundle Identifier:** `com.esdiyet.app` (otomatik gelecek)
- **Provisioning Profile:** Automatic olarak oluşturulacak

> **Hata alırsanız:** "Failed to register bundle identifier" hatası alırsanız, Bundle ID'yi App Store Connect'te zaten oluşturmuş olabilirsiniz. Xcode otomatik olarak bağlanacaktır.

### Adım 3: General Tab Kontrolleri

**General** sekmesine geçin ve aşağıdakileri kontrol edin:

- **Display Name:** ESdiyet
- **Bundle Identifier:** com.esdiyet.app
- **Version:** 1.0.0
- **Build:** 1
- **Deployment Info:**
  - **iOS:** 13.4 (minimum)
  - **iPhone** ve **iPad** seçili
  - **Orientation:** Portrait

### Adım 4: Build Settings Kontrolleri

1. **Build Settings** sekmesine geçin
2. Arama kutusuna **"Bitcode"** yazın
3. **Enable Bitcode:** **No** olarak ayarlayın (React Native için)

### Adım 5: Info.plist Kontrolleri

Info.plist zaten yapılandırılmış durumda:

✅ **Privacy Descriptions:**
- Camera: "Bu uygulama profil fotoğrafı eklemek için kameraya ihtiyaç duyar."
- Photo Library: "Bu uygulama profil fotoğrafı seçmek için galeriye ihtiyaç duyar."

✅ **App Transport Security:** Yapılandırılmış
✅ **Launch Screen:** Ayarlanmış

---

## 🌐 App Store Connect Ayarları

### Adım 1: App Store Connect'e Giriş

1. **https://appstoreconnect.apple.com** adresine gidin
2. Apple Developer hesabınızla **giriş yapın**

### Adım 2: Yeni Uygulama Oluştur

1. **My Apps** (Uygulamalarım) butonuna tıklayın
2. Sol üstteki **+ butonuna** tıklayın
3. **New App** seçin

### Adım 3: Uygulama Bilgilerini Girin

Açılan formda şu bilgileri girin:

- **Platforms:** iOS ✅
- **Name:** ESdiyet
- **Primary Language:** Turkish
- **Bundle ID:** `com.esdiyet.app` seçin
- **SKU:** `esdiyet-001` (benzersiz bir tanımlayıcı)
- **User Access:** Full Access

> **Not:** Bundle ID dropdown'da görünmüyorsa, önceki adımda App ID oluşturmayı tamamlayın ve sayfayı yenileyin.

4. **Create** butonuna tıklayın

### Adım 4: App Information Doldurma

App Store Connect'te yeni oluşturulan uygulamanız açılacak. Sol menüden **App Information** seçin:

#### Genel Bilgiler

- **Name:** ESdiyet
- **Privacy Policy URL:** (Gerekli - hazırlanmalı)
  - Örn: `https://yourwebsite.com/privacy-policy`
  - Basit bir privacy policy hazırlayıp GitHub Pages veya başka bir yerde yayınlayabilirsiniz

- **Category:**
  - **Primary:** Health & Fitness
  - **Secondary:** Food & Drink (opsiyonel)

- **Content Rights:** (Size ait olup olmadığını işaretleyin)

- **Age Rating:** Questionnaire'i doldurun (genellikle 4+ olacaktır)

**Save** butonuna tıklayın.

---

## 📦 Archive Oluşturma ve Yükleme

### Adım 1: Build Scheme Ayarları

1. Xcode'da üst sol köşedeki **Scheme seçicisine** tıklayın
2. **ESdiyet** scheme'i seçili olmalı
3. Yanındaki device menüsünden **Any iOS Device (arm64)** seçin

> **ÖNEMLİ:** Simulator seçili değil, gerçek cihaz için build almalısınız!

### Adım 2: Product > Archive

1. Xcode menü çubuğundan **Product** > **Clean Build Folder** seçin (⇧⌘K)
2. Temizleme tamamlandıktan sonra:
3. **Product** > **Archive** seçin

> Build süreci başlayacak. Bu 5-15 dakika sürebilir. Bekleyin...

### Adım 3: Archive Başarılı Olduğunda

Build başarılı olursa, **Organizer** penceresi otomatik olarak açılacak.

En son archive'iniz seçili gelecektir:
- **Tarih ve saat** görünecek
- **Version:** 1.0.0 (1)

### Adım 4: Distribute App

1. **Distribute App** butonuna tıklayın
2. Açılan pencerede **App Store Connect** seçin
3. **Next** butonuna tıklayın

### Adım 5: Distribution Options

1. **Upload** seçeneği seçili olmalı
2. **Next** butonuna tıklayın

### Adım 6: App Store Connect Distribution Options

Varsayılan ayarları koruyun:
- ✅ **Include bitcode for iOS content:** Kaldırın (React Native için)
- ✅ **Upload your app's symbols:** İşaretli
- ✅ **Manage Version and Build Number:** İşaretli (Xcode otomatik yönetsin)

**Next** butonuna tıklayın.

### Adım 7: Signing

Xcode otomatik olarak signing yapacak:
- **Automatically manage signing** seçili olmalı
- Distribution Certificate ve Provisioning Profile gösterilecek

**Next** butonuna tıklayın.

### Adım 8: Review ve Upload

1. Özet ekranını inceleyin
2. **Upload** butonuna tıklayın

> Yükleme süreci başlayacak. Build boyutuna göre 5-20 dakika sürebilir.

### Adım 9: Yükleme Tamamlandı

"Upload Successful" mesajını görünce **Done** butonuna tıklayın.

---

## 📝 App Store Metadata Hazırlama

Build yüklendikten sonra App Store Connect'e geri dönün.

### Adım 1: Version Information

App Store Connect'te uygulamanızın sayfasında:

1. **1.0 Prepare for Submission** bölümüne gidin
2. Sol menüden **iOS App** > **1.0.0** versiyonunu seçin

### Adım 2: App Store Bilgileri Girin

#### Screenshots (Ekran Görüntüleri)

**Gerekli Ekran Boyutları:**
- **6.5" Display** (iPhone 14 Pro Max, 15 Pro Max): En az 3 adet
- **5.5" Display** (iPhone 8 Plus): En az 3 adet

> **Ekran görüntüsü almak için:**
> - Simulator'da uygulamayı çalıştırın
> - ⌘S ile screenshot alın
> - Otomatik olarak masaüstüne kaydedilir

**Screenshot Boyutları:**
- 6.5": 1284 x 2778 px
- 5.5": 1242 x 2208 px

Her ekran için en az **3-5 adet** ekran görüntüsü yükleyin.

#### Promotional Text (İsteğe Bağlı)

Kısa tanıtım metni (max 170 karakter):

```
Sağlıklı yaşamınız için kişisel diyet asistanınız. Hedeflerinizi takip edin, sağlıklı kalın!
```

#### Description (Açıklama)

App Store'da görünecek açıklama (max 4000 karakter):

```
ESdiyet - Kişisel Diyet Takip Asistanınız

ESdiyet, sağlıklı yaşam hedeflerinize ulaşmanız için tasarlanmış modern ve kullanıcı dostu bir mobil uygulamadır.

ÖZELLİKLER:

🎯 Hedef Takibi
• Kilo hedeflerinizi belirleyin
• İlerlemenizi günlük takip edin
• Hedefinize ne kadar yaklaştığınızı görün

⚖️ Kilo Yönetimi
• Günlük kilo girişi
• Grafik ile görselleştirme
• Geçmiş kayıtlarınızı görüntüleyin

🍎 Diyet Planları
• Özel diyet programları
• Günlük öğün takibi
• Sağlıklı beslenme önerileri

📊 VKİ Hesaplama
• Vücut Kitle İndeksi (VKİ) hesaplayın
• Sağlık durumunuzu öğrenin
• Kişiselleştirilmiş öneriler alın

💡 Sağlık Tavsiyeleri
• Günlük sağlık ipuçları
• Beslenme önerileri
• Motivasyon mesajları

NEDEN ESdiyet?

✅ Kullanımı kolay ve modern arayüz
✅ Türkçe dil desteği
✅ Offline çalışma özelliği
✅ Verileriniz güvende (Supabase)
✅ Reklamsız deneyim

Sağlıklı yaşam yolculuğunuza bugün başlayın!

---

Gizlilik Politikası ve Kullanım Koşulları için: [URL]
Destek: [Email]
```

#### Keywords (Anahtar Kelimeler)

Virgülle ayırarak max 100 karakter:

```
diyet,kilo,sağlık,fitness,beslenme,vki,kalori,hedef,kilo takip
```

#### Support URL

Destek sayfanız (gerekli):
```
https://yourwebsite.com/support
```

#### Marketing URL (İsteğe Bağlı)

```
https://yourwebsite.com
```

### Adım 3: Build Seçimi

1. **Build** bölümüne kaydırın
2. **Select a build before you submit your app** bağlantısına tıklayın
3. Az önce yüklediğiniz build'i seçin (1.0.0 - Build 1)
4. **Done** butonuna tıklayın

> **Build görünmüyorsa:** Apple'ın build'i işlemesi 5-30 dakika sürebilir. Sayfayı yenileyip bekleyin.

### Adım 4: Export Compliance

Build seçtikten sonra çıkan soruyu yanıtlayın:

**"Is your app designed to use cryptography or does it contain or incorporate cryptography?"**

- **No** seçin (Eğer kendiniz şifreleme eklemediyseniz)

> Info.plist'te `usesNonExemptEncryption: false` zaten var.

### Adım 5: App Review Information

İnceleme ekibi için iletişim bilgileri:

- **First Name:** [Adınız]
- **Last Name:** [Soyadınız]
- **Phone Number:** +90 [Telefon]
- **Email:** [Email]

**Demo Account (Varsa):**
- Eğer uygulamanız giriş gerektiriyorsa demo hesap bilgileri verin

### Adım 6: Version Release

**Version Release** bölümünde:

- **Automatically release this version** (Otomatik yayınla)
veya
- **Manually release this version** (Manuel yayınla)

İlk versiyonu manuel seçmenizi öneririm.

### Adım 7: Age Rating

**App Store Rating** quiz'ini tamamlayın:

Genellikle tüm sorulara "No" cevabı verirseniz **4+** rating alırsınız.

---

## 🚀 İncelemeye Gönderme

### Adım 1: Son Kontrol

Tüm gerekli alanları doldurduğunuzdan emin olun:

✅ Screenshots yüklendi (6.5" ve 5.5")
✅ Description yazıldı
✅ Keywords eklendi
✅ Support URL eklendi
✅ Privacy Policy URL eklendi
✅ Build seçildi
✅ App Review Information dolduruldu
✅ Age Rating tamamlandı

### Adım 2: Save

Sağ üstteki **Save** butonuna tıklayın.

### Adım 3: Submit for Review

**Submit for Review** butonu aktif hale gelecek. Tıklayın!

### Adım 4: Final Questions

Son birkaç soru sorulacak:

1. **Advertising Identifier (IDFA):**
   - "Does this app use the Advertising Identifier (IDFA)?"
   - **No** seçin (eğer reklam SDK'sı kullanmıyorsanız)

2. **Content Rights:**
   - İçeriğin size ait olduğunu onaylayın

3. **Export Compliance:**
   - Tekrar sorarsa aynı şekilde **No**

### Adım 5: Submit

**Submit** butonuna tıklayın!

🎉 **Tebrikler!** Uygulamanız incelemeye gönderildi.

---

## ⏱️ İnceleme Süreci

### Durum Takibi

App Store Connect'te uygulamanızın durumunu görebilirsiniz:

1. **Waiting for Review** - Sırada bekliyor
2. **In Review** - İnceleme yapılıyor (1-2 gün)
3. **Pending Developer Release** - Onaylandı, yayınlamayı bekliy or
4. **Ready for Sale** - Yayında!

veya

- **Rejected** - Reddedildi (nedenler belirtilir)

### İnceleme Süresi

- Genellikle **24-48 saat**
- İlk uygulama için biraz daha uzun sürebilir (3-5 gün)

### Email Bildirimleri

Apple size şu durumlarda email gönderir:
- İnceleme başladığında
- Onaylandığında
- Reddedildiyse

---

## ⚠️ Sorun Giderme

### Build Hatası: "Code Signing Error"

**Çözüm:**
1. Xcode > Settings > Accounts
2. Hesabınızı seçip **Download Manual Profiles**
3. Projeye dönüp **Clean Build Folder** (⇧⌘K)
4. Tekrar **Archive** deneyin

### Build Hatası: "No profiles for 'com.esdiyet.app' were found"

**Çözüm:**
1. developer.apple.com > Profiles
2. Yeni bir **App Store Distribution Profile** oluşturun
3. Bundle ID: `com.esdiyet.app` seçin
4. Certificate seçin
5. Download edin ve double-click ile yükleyin

### Archive Butonu Pasif (Gri)

**Çözüm:**
- Scheme'de **Any iOS Device** seçili olmalı
- Simulator seçiliyse Archive aktif olmaz

### Build App Store Connect'te Görünmüyor

**Çözüm:**
- 5-30 dakika bekleyin (Apple'ın işlemesi gerekiyor)
- Sayfayı yenileyin
- Email kontrolü yapın (hata varsa bildirilir)

### "Missing Compliance" Uyarısı

**Çözüm:**
1. App Store Connect > TestFlight
2. Build'in yanındaki uyarıya tıklayın
3. Export Compliance sorusunu yanıtlayın
4. **"No, this app doesn't use encryption"** seçin

### Icon Hatası: "Invalid Image"

**Çözüm:**
- App Icon tam 1024x1024 px olmalı
- Alpha channel olmamalı (PNG ama transparan olmayan)
- Color space: sRGB veya P3

---

## 📋 Checklist - Son Kontrol

Yayınlamadan önce bu listeyi kontrol edin:

### Teknik

- [ ] Bundle ID doğru: `com.esdiyet.app`
- [ ] Version: 1.0.0
- [ ] Build Number: 1
- [ ] App Icon 1024x1024 px ✅
- [ ] Launch Screen ayarlanmış ✅
- [ ] Privacy descriptions eklenmiş ✅
- [ ] Signing: Distribution profile seçili
- [ ] Archive başarıyla oluştu
- [ ] Build App Store Connect'e yüklendi

### App Store Connect

- [ ] App oluşturuldu
- [ ] Screenshots yüklendi (min 3 adet, 2 farklı boyut)
- [ ] Description yazıldı
- [ ] Keywords eklendi
- [ ] Support URL eklendi
- [ ] Privacy Policy URL eklendi
- [ ] App Review Information dolduruldu
- [ ] Build seçildi
- [ ] Age Rating tamamlandı
- [ ] Export Compliance yanıtlandı

### İçerik

- [ ] Privacy Policy hazır ve yayında
- [ ] Support sayfası hazır
- [ ] Test edildi (gerçek cihazda)
- [ ] Crash yok
- [ ] Kullanıcı akışı sorunsuz

---

## 🎯 Sonraki Adımlar

### Build Sonrası

1. **TestFlight ile Test:**
   - App Store Connect > TestFlight
   - Internal Testing için ekip üyesi ekleyin
   - External Testing için beta tester davet edin

2. **Beta Feedback Toplama:**
   - TestFlight kullanıcılarından geri bildirim alın
   - Hataları düzeltin
   - Yeni build yükleyin (Build 2, 3, vs.)

3. **Versiyon Güncellemeleri:**
   - `app.json` içinde version artırın: `1.0.1`, `1.1.0`, vs.
   - Build number her build'de otomatik artar
   - Tekrar Archive > Upload

### Yayın Sonrası

1. **App Analytics:**
   - App Store Connect > Analytics
   - Indirme, kullanım istatistiklerini takip edin

2. **Kullanıcı Yorumları:**
   - App Store > Ratings & Reviews
   - Yorumlara yanıt verin

3. **Güncelleme Döngüsü:**
   - Bug fix'ler için: 1.0.1, 1.0.2
   - Yeni özellikler için: 1.1.0, 1.2.0
   - Büyük değişiklikler için: 2.0.0

---

## 📞 Destek ve Kaynaklar

### Apple Dokümantasyonu

- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Yararlı Linkler

- **App Store Connect:** https://appstoreconnect.apple.com
- **Apple Developer:** https://developer.apple.com/account
- **TestFlight:** https://testflight.apple.com

### Hızlı Komutlar

```bash
# Proje temizle
cd ios && rm -rf build && cd ..

# Pods temizle ve yeniden yükle
cd ios && pod deintegrate && pod install && cd ..

# Xcode workspace'i aç
open ios/ESdiyet.xcworkspace

# Simulator'da çalıştır
npm run ios

# Build info kontrol
xcodebuild -showBuildSettings -workspace ios/ESdiyet.xcworkspace -scheme ESdiyet
```

---

## ✅ Özet: Hızlı Başlangıç Adımları

1. **Xcode'da Proje Aç:** `ios/ESdiyet.xcworkspace`
2. **Signing Ayarla:** Signing & Capabilities > Team seç
3. **Archive Oluştur:** Product > Archive
4. **Distribute:** App Store Connect'e yükle
5. **App Store Connect:** Uygulama oluştur ve metadata ekle
6. **Submit:** İncelemeye gönder

**İyi şanslar! 🚀**

---

**Son Güncelleme:** 5 Ekim 2025
**Versiyon:** 1.0
**Proje:** ESdiyet iOS App
