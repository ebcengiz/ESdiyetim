# ESdiyet - Diyet Takip Uygulaması

ESdiyet, sağlıklı yaşam için tasarlanmış modern bir diyet ve kilo takip uygulamasıdır. React Native Expo ve Supabase kullanılarak geliştirilmiştir.

## 🌟 Özellikler

- ✅ **Diyet Programı Yönetimi**: Günlük öğünlerinizi (kahvaltı, ara öğünler, öğle, akşam) kolayca planlayın ve takip edin
- ⚖️ **Kilo Takibi**: Kilonuzu kaydedin, grafiksel olarak takip edin ve ilerlemenizi görün
- 💡 **Sağlık Tavsiyeleri**: Beslenme, egzersiz ve sağlıklı yaşam hakkında faydalı tavsiyeler alın
- 🎨 **Modern Arayüz**: Beyaz ve yeşil renk paletinde, kullanıcı dostu ve şık tasarım
- 🔄 **Offline Depolama**: Yerel depolama desteği ile verileriniz güvende
- 📱 **Çoklu Platform**: iOS ve Android için tek kod tabanı

## 🚀 Kurulum

### Gereksinimler

- Node.js (v14 veya üzeri)
- npm veya yarn
- Expo CLI
- Supabase hesabı (ücretsiz)

### Adımlar

1. **Depoyu klonlayın veya projeyi indirin**

```bash
cd ESdiyetim
```

2. **Bağımlılıkları kurun**

```bash
npm install
```

3. **Supabase Projesini Oluşturun**

   a. [Supabase](https://supabase.com) üzerinde ücretsiz bir hesap oluşturun

   b. Yeni bir proje oluşturun

   c. Project Settings > API bölümünden şu bilgileri alın:
      - Project URL (Supabase URL)
      - `anon` `public` API key (Anon Key)

4. **Veritabanı Şemasını Oluşturun**

   a. Supabase Dashboard'da SQL Editor'e gidin

   b. `supabase-schema.sql` dosyasındaki SQL kodunu kopyalayıp çalıştırın

   c. Bu, gerekli tabloları (diet_plans, weight_records, health_tips) ve örnek verileri oluşturacaktır

5. **Supabase Bağlantı Bilgilerini Girin**

   `src/services/supabase.js` dosyasını açın ve şu satırları kendi bilgilerinizle değiştirin:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Supabase Project URL'nizi buraya
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Supabase Anon Key'inizi buraya
```

6. **Uygulamayı Başlatın**

```bash
npm start
```

7. **Expo Go ile Test Edin**

   - iOS: App Store'dan "Expo Go" uygulamasını indirin
   - Android: Play Store'dan "Expo Go" uygulamasını indirin
   - Terminaldeki QR kodu Expo Go uygulamasıyla taratın

## 📱 Kullanım

### Ana Sayfa
- Güncel kilonuzu, bugünün diyet programını ve günün tavsiyesini görüntüleyin
- Hızlı erişim butonları ile diğer sayfalara geçiş yapın

### Diyet Programı
- İleri/geri ok tuşları ile tarihleri değiştirin
- Tüm öğünlerinizi ekleyin ve düzenleyin
- Toplam kalori bilgisini girin (opsiyonel)
- Notlar ekleyin

### Kilo Takibi
- + butonuna tıklayarak yeni kilo kaydı ekleyin
- Geçmiş kilo kayıtlarınızı görüntüleyin
- İstatistikleri (mevcut, toplam değişim, ortalama) takip edin
- Kayda uzun basarak silin

### Tavsiyeler
- Kategori filtrelerine göre tavsiyeleri görüntüleyin
- Beslenme, egzersiz, genel sağlık ve motivasyon tavsiyeleri

## 🎨 Renk Paleti

Uygulama sağlığı temsil eden beyaz ve yeşil tonlarında tasarlanmıştır:
- Ana Yeşil: #4CAF50
- Açık Yeşil: #81C784
- Koyu Yeşil: #388E3C
- Beyaz Arkaplan: #FFFFFF

## 📦 Proje Yapısı

```
ESdiyetim/
├── App.js                      # Ana uygulama dosyası
├── app.json                    # Expo yapılandırması
├── package.json                # Bağımlılıklar
├── supabase-schema.sql         # Veritabanı şeması
└── src/
    ├── constants/
    │   └── theme.js            # Renkler, boyutlar ve stil sabitleri
    ├── navigation/
    │   └── MainNavigator.js    # Tab navigasyon yapısı
    ├── screens/
    │   ├── HomeScreen.js       # Ana sayfa
    │   ├── DietPlanScreen.js   # Diyet programı ekranı
    │   ├── WeightTrackerScreen.js # Kilo takip ekranı
    │   └── TipsScreen.js       # Tavsiyeler ekranı
    ├── services/
    │   └── supabase.js         # Supabase servisleri ve API çağrıları
    └── components/             # Yeniden kullanılabilir bileşenler (ileride)
```

## 🚀 Store'lara Yayınlama

### App Store (iOS) için Hazırlık

1. **Apple Developer hesabı oluşturun** ($99/yıl)

2. **App icon ve splash screen hazırlayın**:
   - Icon: 1024x1024 px
   - Splash screen: 2048x2732 px (iPad Pro için)

3. **app.json dosyasını güncelleyin**:
```json
{
  "expo": {
    "name": "ESdiyet",
    "slug": "esdiyet",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.esdiyet",
      "buildNumber": "1.0.0",
      "supportsTablet": true
    }
  }
}
```

4. **Build oluşturun**:
```bash
npx eas-cli build --platform ios
```

5. **App Store Connect'e yükleyin ve onay için gönderin**

### Google Play Store (Android) için Hazırlık

1. **Google Play Console hesabı oluşturun** ($25 tek seferlik)

2. **App icon ve splash screen hazırlayın**

3. **app.json dosyasını güncelleyin**:
```json
{
  "expo": {
    "name": "ESdiyet",
    "slug": "esdiyet",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.esdiyet",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

4. **Build oluşturun**:
```bash
npx eas-cli build --platform android
```

5. **Google Play Console'a yükleyin ve onay için gönderin**

## 🔐 Güvenlik ve Gizlilik

- Uygulama login/logout sistemi içermez
- Tüm veriler Supabase veritabanında saklanır
- Supabase Row Level Security (RLS) politikaları aktiftir
- Kullanıcı verileri şifrelenir

## 📄 Lisans ve Telif

Bu proje açık kaynak kodludur. Ticari veya kişisel projelerinizde özgürce kullanabilirsiniz.

**Önemli Notlar:**
- Uygulama ismi "ESdiyet" telif koruması altındadır
- Store'lara yüklemeden önce telif hakkı kontrolü yapın
- Üçüncü taraf kütüphanelerin lisanslarına uyun
- Sağlık tavsiyeleri genel niteliktedir, profesyonel sağlık tavsiyesi yerine geçmez

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Pull request göndermekten çekinmeyin.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

## 🙏 Teşekkürler

- React Native Expo ekibine
- Supabase ekibine
- Tüm açık kaynak katkıcılarına

---

**ESdiyet** ile sağlıklı yaşam yolculuğunuza başlayın! 🌱