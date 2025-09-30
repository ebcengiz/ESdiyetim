# 🚀 ESdiyet - Başlangıç Rehberi

ESdiyet uygulamanızı geliştirmeye başlamak için bu hızlı başlangıç rehberini takip edin.

## ⚡ Hızlı Başlangıç (5 Dakika)

### 1. Bağımlılıkları Kurun

```bash
npm install
```

### 2. Supabase Hesabı Oluşturun

1. [https://supabase.com](https://supabase.com) adresine gidin
2. Ücretsiz hesap oluşturun
3. Yeni bir proje oluşturun
4. **Detaylı Adımlar**: `SUPABASE_KURULUM.md` dosyasına bakın

### 3. Veritabanını Kurun

1. Supabase Dashboard > SQL Editor
2. `supabase-schema.sql` dosyasındaki kodu kopyalayıp çalıştırın

### 4. Supabase Bilgilerini Ekleyin

`src/services/supabase.js` dosyasını açın ve değiştirin:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co'; // Sizin URL
const SUPABASE_ANON_KEY = 'eyJhbG...'; // Sizin Key
```

### 5. Uygulamayı Başlatın

```bash
npm start
```

Expo Go uygulamasıyla QR kodu taratın ve test edin!

## 📁 Proje Yapısı

```
ESdiyetim/
├── 📄 README.md                    # Ana dokümantasyon
├── 📄 SUPABASE_KURULUM.md          # Supabase kurulum rehberi
├── 📄 STORE_YAYINLAMA.md           # Store yayınlama rehberi
├── 📄 BASLANGIC_REHBERI.md         # Bu dosya
├── 📄 supabase-schema.sql          # Veritabanı şeması
├── 📄 package.json                 # Bağımlılıklar
├── 📄 app.json                     # Expo yapılandırması
└── src/
    ├── screens/                    # Ekranlar
    │   ├── HomeScreen.js           # Ana sayfa
    │   ├── DietPlanScreen.js       # Diyet programı
    │   ├── WeightTrackerScreen.js  # Kilo takibi
    │   └── TipsScreen.js           # Sağlık tavsiyeleri
    ├── navigation/
    │   └── MainNavigator.js        # Ana navigasyon
    ├── services/
    │   └── supabase.js             # Supabase servisleri
    └── constants/
        └── theme.js                # Renkler ve temalar
```

## 🎯 Sonraki Adımlar

### Test Etme

1. **Ana Sayfa**
   - Uygulama açıldığında genel özet görülüyor mu?
   - Hızlı erişim butonları çalışıyor mu?

2. **Diyet Programı**
   - Tarih değiştirme çalışıyor mu?
   - Öğün ekleme/düzenleme çalışıyor mu?
   - Kaydetme ve silme çalışıyor mu?

3. **Kilo Takibi**
   - Yeni kilo kaydı eklenebiliyor mu?
   - İstatistikler doğru gösteriliyor mu?
   - Kayıtlar listelenebiliyor mu?

4. **Tavsiyeler**
   - Tavsiyeler yükleniyor mu?
   - Kategori filtreleri çalışıyor mu?

### Özelleştirme

#### Renkleri Değiştirmek

`src/constants/theme.js` dosyasında `COLORS` objesini düzenleyin:

```javascript
export const COLORS = {
  primary: '#4CAF50',      // Ana renk
  primaryLight: '#81C784', // Açık ton
  primaryDark: '#388E3C',  // Koyu ton
  // ...
};
```

#### Yeni Özellik Eklemek

1. Yeni bir ekran oluşturun: `src/screens/YeniEkran.js`
2. Navigasyon'a ekleyin: `src/navigation/MainNavigator.js`
3. Gerekirse Supabase servisi ekleyin: `src/services/supabase.js`

#### Supabase'e Yeni Tablo Eklemek

1. Supabase Dashboard > SQL Editor
2. Yeni tablo oluşturun
3. `src/services/supabase.js` içine servis fonksiyonları ekleyin

## 📱 Cihazda Test Etme

### iOS (iPhone/iPad)

1. App Store'dan "Expo Go" uygulamasını indirin
2. Terminaldeki QR kodu Expo Go ile taratın
3. Veya `npm run ios` komutuyla simulator'de açın

### Android

1. Play Store'dan "Expo Go" uygulamasını indirin
2. Terminaldeki QR kodu Expo Go ile taratın
3. Veya `npm run android` komutuyla emulator'de açın

## 🐛 Yaygın Sorunlar

### "Supabase connection failed"

**Çözüm**:
- `src/services/supabase.js` dosyasındaki URL ve Key'i kontrol edin
- Supabase projenizin aktif olduğundan emin olun

### Ekranlar boş görünüyor

**Çözüm**:
- Supabase veritabanının kurulu olduğundan emin olun
- `supabase-schema.sql` dosyasını çalıştırdınız mı?

### Metro bundler hatası

**Çözüm**:
```bash
# Cache'i temizle
npx expo start -c
```

### npm install hatası

**Çözüm**:
```bash
# node_modules ve package-lock.json'ı silin
rm -rf node_modules package-lock.json
npm install
```

## 🎨 Görsel Materyaller Hazırlama

Store'lara yayınlamadan önce bu görselleri hazırlamanız gerekir:

### Zorunlu Görseller

1. **App Icon** (1024x1024 px)
   - `assets/icon.png`
   - Transparan olmamalı
   - ESdiyet logosu veya yeşil bir icon

2. **Splash Screen** (2048x2732 px)
   - `assets/splash.png`
   - Uygulama açılırken gösterilir

3. **Adaptive Icon** (1024x1024 px)
   - `assets/adaptive-icon.png`
   - Android için

### Store Ekran Görüntüleri

- **Telefonda Uygulamayı Açın**
- Her ekranın ekran görüntüsünü alın:
  - Ana sayfa
  - Diyet programı
  - Kilo takibi
  - Tavsiyeler
- En az 4-8 adet gerekli

## 📊 Store'lara Yayınlama

### Hazırlık Listesi

- [ ] Uygulama tamamen test edildi
- [ ] Icon ve splash screen hazır
- [ ] Ekran görüntüleri hazır
- [ ] Gizlilik politikası hazır (online URL)
- [ ] Kullanım koşulları hazır (opsiyonel)
- [ ] Uygulama açıklaması yazıldı
- [ ] Google Play Console hesabı açıldı ($25)
- [ ] Apple Developer hesabı açıldı ($99/yıl)

### Detaylı Rehber

Tüm detaylar için `STORE_YAYINLAMA.md` dosyasına bakın.

## 💰 Maliyetler

### Geliştirme (Ücretsiz)

- ✅ React Native - Ücretsiz
- ✅ Expo - Ücretsiz
- ✅ Supabase - Ücretsiz (50.000 kayıt/ay)
- ✅ Tüm npm paketleri - Ücretsiz

### Yayınlama (Ücretli)

- 💵 Google Play Console: $25 (tek seferlik)
- 💵 Apple Developer Program: $99/yıl

### İsteğe Bağlı

- 💵 Expo EAS Build: Ücretsiz (aylık 30 build)
- 💵 Domain (gizlilik politikası için): ~$10/yıl

## 🔐 Güvenlik

### Önemli Dosyalar

`.gitignore` dosyasına eklediğinizden emin olun:

```
# Supabase keys (production için)
.env
.env.local

# Build dosyaları
*.jks
*.p8
*.p12
```

### Production için

Production'da environment variables kullanın:

```javascript
// .env dosyası
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...

// supabase.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
```

## 🎓 Öğrenme Kaynakları

### React Native

- [React Native Dokümantasyonu](https://reactnative.dev/docs/getting-started)
- [Expo Dokümantasyonu](https://docs.expo.dev)

### Supabase

- [Supabase Dokümantasyonu](https://supabase.com/docs)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

### React Navigation

- [React Navigation Dokümantasyonu](https://reactnavigation.org/docs/getting-started)

## 🤝 Yardım ve Destek

### Sorun mu yaşıyorsunuz?

1. `README.md` dosyasını okuyun
2. `SUPABASE_KURULUM.md` ve `STORE_YAYINLAMA.md` dosyalarına bakın
3. Expo ve Supabase dokümantasyonlarını kontrol edin
4. Stack Overflow'da arayın

### Katkıda Bulunma

Projeyi geliştirmek isterseniz:

1. Yeni özellikler ekleyin
2. Bug düzeltmeleri yapın
3. Dokümantasyonu iyileştirin
4. UI/UX geliştirmeleri yapın

## 📈 Roadmap

Gelecekte eklenebilecek özellikler:

- [ ] Su takibi
- [ ] Egzersiz takibi
- [ ] Hedef belirleme
- [ ] Grafikler ve istatistikler
- [ ] Bildirimler (günlük hatırlatmalar)
- [ ] Yemek fotoğrafı ekleme
- [ ] Diyetisyen ile paylaşım
- [ ] Karanlık mod (dark mode)
- [ ] Çoklu dil desteği
- [ ] PDF olarak dışa aktarma

## 🎉 Başarılar!

ESdiyet uygulamanızı geliştirmeye hazırsınız!

Her adımda bu dosyalara başvurabilirsiniz:
- 📘 `README.md` - Genel bilgiler
- 📗 `SUPABASE_KURULUM.md` - Backend kurulumu
- 📙 `STORE_YAYINLAMA.md` - Yayınlama rehberi
- 📕 `BASLANGIC_REHBERI.md` - Bu dosya

**Sağlıklı günler dileriz! 🌱**