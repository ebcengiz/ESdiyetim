# ESdiyet Gizlilik Politikası

Son güncelleme: Eylül 2026

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
- **ESdiyet sunucularında (Supabase) yemek görüntüsü kalıcı olarak saklanmaz.** Görsel, tahmin üretmek için ESdiyet’in Supabase üzerindeki aracı fonksiyonu üzerinden yalnızca ilgili API’ye iletilir (aracı fonksiyon içeriği saklamaz; kötüye kullanımı önlemek için yalnızca günlük istek **sayısı** tutulur — giriş yapmışsanız hesabınıza, misafirseniz IP adresinizin geri döndürülemez özetine bağlı); bu sağlayıcıların kendi gizlilik politikaları geçerlidir ([Groq](https://groq.com/privacy-policy/), [Google AI](https://policies.google.com/privacy)).
- Tahmin sonuçları tıbbi ölçüm değildir; yaklaşık ve bilgilendirme amaçlıdır.

## Verilerin Kullanımı

Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılır:

- Uygulamanın temel işlevlerini sağlamak
- Kişiselleştirilmiş diyet ve sağlık takibi sunmak
- Kullanıcı hesabını doğrulamak

**Sağlık, öğün, hedef ve fotoğraf verileriniz hiçbir koşulda:**
- Reklam amacıyla kullanılmaz veya reklam ağlarıyla paylaşılmaz
- Başka uygulamalar veya web siteleri üzerinden kullanıcı takibi (cross-app tracking) için kullanılmaz
- Veri brokerlarına satılmaz

## Reklamlar (yalnızca ücretsiz plan)

ESdiyet'in ücretsiz sürümü, yapay zeka maliyetlerini karşılamak için **Google AdMob** (Google Ireland Limited / Google LLC) reklamlarıyla desteklenir. **Premium abonelikte reklam gösterilmez.**

**Ne zaman gösterilir?** Reklamlar yalnızca (1) yapay zeka analizi yüklenirken, günde en fazla **1 geçiş reklamı** ve (2) günlük ücretsiz analiz hakkınız dolduğunda, ek hak kazanmak için **isteğe bağlı** izlediğiniz ödüllü reklam olarak görünür. Banner reklam yoktur.

**Tercihiniz (açık rıza):** Kişiselleştirme tercihiniz uygulama içinde size sorulur; karar tarihiyle birlikte cihazınızda saklanır. Seçim yapılana kadar yalnızca **genel reklam** gösterilir (reklam kimliği kullanılmaz).

| Seçenek | İşlenen veri | Hukuki dayanak |
|---|---|---|
| **Kişiselleştirilmiş reklamlar** | Reklam kimliği (IDFA — iOS "Uygulama Takibi" izniyle), IP adresi, cihaz/işletim sistemi bilgisi, dil, reklam etkileşimleri | KVKK m.5/1 **açık rıza** (istediğiniz zaman geri çekilebilir) |
| **Sadece genel reklamlar** (varsayılan) | IP adresi (yaklaşık konum), cihaz modeli, işletim sistemi, dil, reklam görüntüleme/tıklama | KVKK m.5/2-f **meşru menfaat** (ücretsiz hizmetin finansmanı) |

- Bu rıza **hizmet şartı değildir**: vermezseniz uygulama aynen çalışır, yalnızca genel reklam gösterilir.
- Reklam ağına **kilo, VKİ, öğün, hedef, fotoğraf gibi sağlık verileri hiçbir zaman iletilmez**; reklam isteklerine anahtar kelime veya içerik bilgisi eklenmez.
- **Yurt dışına aktarım:** Reklam verileri Google'ın Türkiye dışındaki sunucularında işlenebilir. Google, [Google Ads Veri İşleme Şartları](https://business.safety.google/adsprocessorterms/) ve [Google Gizlilik Politikası](https://policies.google.com/privacy) kapsamında hareket eder.
- **Saklama:** ESdiyet reklam verisi saklamaz; Google'ın saklama süreleri kendi politikasında belirtilir. Reklam ayarlarınızı [adssettings.google.com](https://adssettings.google.com) üzerinden yönetebilirsiniz.
- **Geri çekme:** Profil → *Kişiselleştirilmiş reklamlar* anahtarını kapatın; iOS Ayarlar → Gizlilik ve Güvenlik → Takip üzerinden izni de kaldırabilirsiniz.
- Reklam içerikleri ESdiyet tarafından üretilmez; sağlık/ilaç, kilo verme ürünleri, kumar ve alkol gibi hassas kategoriler AdMob engelleme ayarlarıyla kapatılmıştır.

## Veri Güvenliği

Tüm veriler Supabase altyapısında güvenli şekilde saklanmakta olup endüstri standardı şifreleme yöntemleriyle korunmaktadır.

## Hesap ve Veri Silme

Uygulama içinden **"Hesap Yönetimi → Hesabımı ve Tüm Verilerimi Sil"** seçeneğini kullanarak tüm kişisel verilerinizi ve hesabınızı kalıcı olarak silebilirsiniz.

## Üçüncü Taraf Hizmetler

ESdiyet aşağıdaki altyapı hizmetlerini kullanmaktadır:

- **Supabase** — Veritabanı, kimlik doğrulama ve yapay zeka isteklerini sağlayıcılara ileten aracı sunucu fonksiyonu
- **Groq** — Metin tabanlı diyet/hedef tavsiyeleri; ayrıca isteğe bağlı **görsel analiz** (yemek fotoğrafı) için multimodal API
- **Google (Gemini API)** — Groq kullanılamadığında veya yedek olarak **görsel analiz** (yemek fotoğrafı) için
- **Google AdMob** — Yalnızca ücretsiz planda reklam gösterimi (bkz. "Reklamlar" bölümü)

> **Not:** Apple HealthKit veya benzeri sistem sağlık verilerine doğrudan erişim bu politikanın kapsamındaki temel özelliklerde zorunlu tutulmamıştır; uygulama işlevleri açıklamalarda belirtildiği şekildedir.

## Tıbbi Sorumluluk Reddi

Bu uygulama kişisel takip ve genel bilgilendirme amaçlıdır. Sunulan bilgiler, yapay zeka tavsiyeleri ve **fotoğraftan üretilen kalori tahminleri** tıbbi teşhis veya tedavi yerine geçmez. Sağlık kararları için bir doktor veya uzman diyetisyene danışınız.

## KVKK Kapsamında Haklarınız

6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme, işlemeye itiraz etme ve verdiğiniz rızayı geri çekme haklarına sahipsiniz. Talepleriniz için aşağıdaki iletişim adresini kullanabilirsiniz; hesap ve tüm verilerin silinmesi uygulama içinden anında yapılabilir.

## İletişim

Gizlilik politikamız hakkında sorularınız için:

**E-posta:** ebcengiz@github.com

## Değişiklikler

Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler uygulama içinde bildirilecektir.
