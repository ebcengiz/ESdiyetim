# ESdiyet Gizlilik Politikası

Son güncelleme: Nisan 2026

## Genel Bakış

ESdiyet, kullanıcıların sağlıklı beslenme alışkanlıkları edinmesine yardımcı olmak amacıyla geliştirilmiş kişisel bir diyet ve sağlık takip uygulamasıdır.

## Toplanan Veriler

ESdiyet aşağıdaki verileri toplar:

- **E-posta adresi** — Hesap oluşturma ve kimlik doğrulama için
- **Ad Soyad** — Kişiselleştirilmiş deneyim için
- **Sağlık ve Fitness Verileri** — Boy, kilo, yaş, cinsiyet (VKİ hesaplama için)
- **Diyet Planları** — Öğün takibi için kullanıcı tarafından girilen veriler
- **Kilo Kayıtları** — Kilo takibi için kullanıcı tarafından girilen veriler
- **Hedefler** — Kullanıcının belirlediği kişisel sağlık hedefleri
- **Kamera ve fotoğraf galerisi** — Yalnızca siz izin verdiğinizde; profil fotoğrafı ve isteğe bağlı olarak **yemek fotoğrafı** seçimi veya çekimi için

## Yemek fotoğrafı ve yapay zeka (kalori tahmini)

İsterseniz yemek fotoğrafı yükleyerek tahmini kalori özeti alabilirsiniz. Bu özellik şu şekilde çalışır:

- Fotoğraf **siz “Tahmini kaloriyi hesapla” dediğinizde** cihazınızdan çıkar ve üçüncü taraf yapay zeka hizmetlerine (**Groq** ve/veya **Google Gemini**) analiz için iletilir.
- **ESdiyet sunucularında (Supabase) yemek görüntüsü kalıcı olarak saklanmaz.** Görsel, tahmin üretmek için yalnızca ilgili API’ye gönderilir; bu sağlayıcıların kendi gizlilik politikaları geçerlidir ([Groq](https://groq.com/privacy-policy/), [Google AI](https://policies.google.com/privacy)).
- Tahmin sonuçları tıbbi ölçüm değildir; yaklaşık ve bilgilendirme amaçlıdır.

## Verilerin Kullanımı

Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılır:

- Uygulamanın temel işlevlerini sağlamak
- Kişiselleştirilmiş diyet ve sağlık takibi sunmak
- Kullanıcı hesabını doğrulamak

**Verileriniz hiçbir koşulda:**
- Reklam amaçlı üçüncü taraflarla paylaşılmaz
- Başka uygulamalar veya web siteleri üzerinden kullanıcı takibi (cross-app tracking) için kullanılmaz
- Veri brokerlarına satılmaz

## Veri Güvenliği

Tüm veriler Supabase altyapısında güvenli şekilde saklanmakta olup endüstri standardı şifreleme yöntemleriyle korunmaktadır.

## Hesap ve Veri Silme

Uygulama içinden **"Hesap Yönetimi → Hesabımı ve Tüm Verilerimi Sil"** seçeneğini kullanarak tüm kişisel verilerinizi ve hesabınızı kalıcı olarak silebilirsiniz.

## Üçüncü Taraf Hizmetler

ESdiyet aşağıdaki altyapı hizmetlerini kullanmaktadır:

- **Supabase** — Veritabanı ve kimlik doğrulama altyapısı
- **Groq** — Metin tabanlı diyet/hedef tavsiyeleri; ayrıca isteğe bağlı **görsel analiz** (yemek fotoğrafı) için multimodal API
- **Google (Gemini API)** — Groq kullanılamadığında veya yedek olarak **görsel analiz** (yemek fotoğrafı) için

> **Not:** Apple HealthKit veya benzeri sistem sağlık verilerine doğrudan erişim bu politikanın kapsamındaki temel özelliklerde zorunlu tutulmamıştır; uygulama işlevleri açıklamalarda belirtildiği şekildedir.

## Tıbbi Sorumluluk Reddi

Bu uygulama kişisel takip ve genel bilgilendirme amaçlıdır. Sunulan bilgiler, yapay zeka tavsiyeleri ve **fotoğraftan üretilen kalori tahminleri** tıbbi teşhis veya tedavi yerine geçmez. Sağlık kararları için bir doktor veya uzman diyetisyene danışınız.

## İletişim

Gizlilik politikamız hakkında sorularınız için:

**E-posta:** ebcengiz@github.com

## Değişiklikler

Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinde bildirilecektir.
