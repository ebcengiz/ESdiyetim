# Supabase Kurulum Rehberi - ESdiyet

Bu rehber, ESdiyet uygulaması için Supabase backend kurulumunu adım adım anlatmaktadır.

## 📋 İçindekiler

1. [Supabase Hesabı Oluşturma](#1-supabase-hesabı-oluşturma)
2. [Proje Oluşturma](#2-proje-oluşturma)
3. [Veritabanı Şemasını Kurma](#3-veritabanı-şemasını-kurma)
4. [API Bilgilerini Alma](#4-api-bilgilerini-alma)
5. [Uygulamayı Yapılandırma](#5-uygulamayı-yapılandırma)
6. [Test Etme](#6-test-etme)

## 1. Supabase Hesabı Oluşturma

1. [https://supabase.com](https://supabase.com) adresine gidin
2. Sağ üstteki **"Start your project"** butonuna tıklayın
3. GitHub, Google veya email ile ücretsiz hesap oluşturun
4. Email doğrulamasını tamamlayın

✅ **Not**: Supabase ücretsiz planı bu uygulama için yeterlidir.

## 2. Proje Oluşturma

1. Supabase Dashboard'a giriş yaptıktan sonra **"New Project"** butonuna tıklayın

2. Aşağıdaki bilgileri doldurun:
   - **Organization**: Bir organization seçin veya yeni oluşturun (örn: "Personal")
   - **Name**: `ESdiyet` veya istediğiniz bir isim
   - **Database Password**: Güçlü bir şifre belirleyin (bu şifreyi kaydedin!)
   - **Region**: Size en yakın bölgeyi seçin (Türkiye için: `Europe (Frankfurt)`)
   - **Pricing Plan**: "Free" seçin

3. **"Create new project"** butonuna tıklayın

4. Projenin hazır olmasını bekleyin (1-2 dakika sürebilir)

## 3. Veritabanı Şemasını Kurma

1. Supabase Dashboard'da sol menüden **"SQL Editor"** sekmesine tıklayın

2. **"New query"** butonuna tıklayın

3. Proje klasöründeki `supabase-schema.sql` dosyasını açın

4. Tüm SQL kodunu kopyalayın

5. SQL Editor'e yapıştırın

6. Sağ alt köşedeki **"Run"** (▶️) butonuna basarak kodu çalıştırın

7. ✅ "Success. No rows returned" mesajını görmelisiniz

### Oluşturulan Tablolar

- **diet_plans**: Diyet programları tablosu
  - Tarih bazlı öğün kayıtları
  - Kahvaltı, ara öğünler, öğle, akşam yemeği
  - Kalori bilgisi ve notlar

- **weight_records**: Kilo takip tablosu
  - Tarih ve kilo kayıtları
  - Notlar alanı

- **health_tips**: Sağlık tavsiyeleri tablosu
  - Başlık, içerik, kategori
  - 10 adet örnek tavsiye otomatik eklenir

## 4. API Bilgilerini Alma

1. Supabase Dashboard'da sol menüden **"Settings"** (⚙️) sekmesine tıklayın

2. **"API"** alt menüsüne tıklayın

3. Aşağıdaki bilgileri kopyalayın:

   **Project URL** (Supabase URL):
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public API Key**:
   ```
   eyJhbGc... (uzun bir token)
   ```

⚠️ **Önemli**: Bu bilgileri güvenli bir yere kaydedin!

## 5. Uygulamayı Yapılandırma

1. Proje klasöründe `src/services/supabase.js` dosyasını açın

2. Aşağıdaki satırları bulun:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

3. Kopyaladığınız bilgilerle değiştirin:

```javascript
const SUPABASE_URL = 'https://xxxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...';
```

4. Dosyayı kaydedin

## 6. Test Etme

### Veritabanı Bağlantısını Test Etme

1. Uygulamayı başlatın:
```bash
npm start
```

2. Expo Go ile uygulamayı açın

3. **Tavsiyeler** sekmesine gidin

4. Örnek tavsiyeleri görüyorsanız, bağlantı başarılıdır! ✅

### Veri Ekleme Testi

1. **Kilo Takibi** sekmesine gidin

2. **+** butonuna basın

3. Test verisi ekleyin:
   - Tarih: Bugün
   - Kilo: 75
   - Not: Test kaydı

4. **Kaydet** butonuna basın

5. Başarılı mesajı ve kaydın listede görünmesi beklenir

### Supabase Dashboard'da Kontrol

1. Supabase Dashboard'a dönün

2. Sol menüden **"Table Editor"** sekmesine gidin

3. **weight_records** tablosunu seçin

4. Eklediğiniz test kaydını görmelisiniz

## 🔧 Sorun Giderme

### Hata: "Error: Supabase connection failed"

**Çözüm**:
1. `src/services/supabase.js` dosyasındaki URL ve Key'in doğru olduğundan emin olun
2. Supabase projesinin aktif olduğunu kontrol edin
3. İnternet bağlantınızı kontrol edin

### Hata: "duplicate key value violates unique constraint"

**Çözüm**:
- Aynı tarih için birden fazla kayıt ekleyemezsiniz
- Mevcut kaydı düzenleyin veya tarihi değiştirin

### Tablolar Görünmüyor

**Çözüm**:
1. SQL Editor'de tekrar `supabase-schema.sql` kodunu çalıştırın
2. Her tablo için "Success" mesajı aldığınızdan emin olun

### Veriler Yüklenmiyor

**Çözüm**:
1. RLS (Row Level Security) politikalarının aktif olduğundan emin olun
2. Supabase Dashboard > Authentication > Policies bölümünden kontrol edin

## 📊 Veritabanı Yönetimi

### Yeni Tavsiye Ekleme

1. Supabase Dashboard > Table Editor > health_tips
2. **Insert** > **Insert row** tıklayın
3. Bilgileri doldurun:
   - title: "Tavsiye Başlığı"
   - content: "Tavsiye içeriği..."
   - category: "genel" / "beslenme" / "egzersiz" / "motivasyon"
4. **Save** tıklayın

### Verileri Yedekleme

1. Supabase Dashboard > Database > Backups
2. Otomatik yedekleme aktiftir (ücretsiz planda günlük)
3. İsterseniz manuel yedek alabilirsiniz

### Veritabanını Sıfırlama

1. SQL Editor'da şu kodu çalıştırın:
```sql
TRUNCATE diet_plans CASCADE;
TRUNCATE weight_records CASCADE;
TRUNCATE health_tips CASCADE;
```

2. Ardından tekrar `supabase-schema.sql` dosyasını çalıştırarak örnek verileri geri yükleyin

## 🔐 Güvenlik

### Row Level Security (RLS)

- Tüm tablolarda RLS aktiftir
- Şu an herkes okuma/yazma yapabilir (login sistemi yok)
- İlerisi için authentication eklenebilir

### API Key Güvenliği

- `SUPABASE_ANON_KEY` public bir key'dir, paylaşılabilir
- `service_role` key'i asla paylaşmayın!
- Production'da .env dosyası kullanın

## 📈 Supabase Dashboard Özellikleri

- **Table Editor**: Verileri GUI ile yönetin
- **SQL Editor**: Custom sorgular çalıştırın
- **Database**: Şema ve ilişkileri görüntüleyin
- **Logs**: Hata loglarını inceleyin
- **API Docs**: Otomatik API dokümantasyonu

## 🎉 Tebrikler!

Supabase kurulumunuz tamamlandı! Artık ESdiyet uygulamanızı kullanmaya başlayabilirsiniz.

## 📚 Daha Fazla Bilgi

- [Supabase Dokümantasyonu](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)