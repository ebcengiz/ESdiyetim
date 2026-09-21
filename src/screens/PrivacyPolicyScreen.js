import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../constants/theme';
import { ScreenContainer } from '../components/ui';

/**
 * App Store 5.1.x: Gizlilik politikası uygulama içinde okunabilir olmalıdır.
 * Metin repo kökündeki PRIVACY.md ile senkron tutulmalıdır.
 */
const SECTIONS = [
  {
    title: 'Genel Bakış',
    body:
      'ESdiyet, kullanıcıların sağlıklı beslenme alışkanlıkları edinmesine yardımcı olmak amacıyla geliştirilmiş kişisel bir diyet ve sağlık takip uygulamasıdır.',
  },
  {
    title: 'Toplanan Veriler',
    body:
      '• E-posta adresi — Hesap oluşturma ve kimlik doğrulama\n' +
      '• Ad Soyad — Kişiselleştirilmiş deneyim\n' +
      '• Sağlık ve Fitness Verileri — Boy, kilo, yaş, cinsiyet (VKİ hesaplama)\n' +
      '• Diyet Planları — Öğün takibi için girilen veriler\n' +
      '• Kilo Kayıtları — Kilo takibi için girilen veriler\n' +
      '• Hedefler — Kişisel sağlık hedefleri\n' +
      '• Kamera ve fotoğraf galerisi — Yalnızca izin verdiğinizde; profil ve isteğe bağlı yemek fotoğrafı',
  },
  {
    title: 'Yemek fotoğrafı ve yapay zeka',
    body:
      'İsteğe bağlı yemek fotoğrafı, tahmini kalori için Groq ve/veya Google Gemini API’lerine analiz amaçlı iletilir. Yemek görüntüsü ESdiyet sunucularında kalıcı saklanmaz. Tahminler yaklaşık ve bilgilendirme amaçlıdır; tıbbi ölçüm değildir.',
  },
  {
    title: 'Verilerin Kullanımı',
    body:
      'Veriler yalnızca uygulama işlevleri, kişiselleştirilmiş takip ve hesap doğrulama için kullanılır. Sağlık, öğün ve fotoğraf verileriniz reklam amacıyla kullanılmaz, reklam ağlarıyla paylaşılmaz ve veri brokerlarına satılmaz.',
  },
  {
    title: 'Reklamlar (yalnızca ücretsiz plan)',
    body:
      'Ücretsiz sürüm, yapay zeka maliyetlerini karşılamak için Google AdMob (Google Ireland Ltd. / Google LLC) reklamlarıyla desteklenir; Premium abonelikte reklam gösterilmez. Reklamlar yalnızca yapay zeka analizi sırasında (günde en fazla 1 geçiş reklamı) ve günlük hakkınız dolduğunda isteğe bağlı ödüllü reklam olarak görünür.\n\n' +
      'İlk reklamdan önce tercihiniz sorulur:\n' +
      '• Kişiselleştirilmiş reklamlar — açık rızanızla ve iOS “Uygulama Takibi” izniyle reklam kimliğiniz (IDFA) kullanılır. Bu rıza hizmet şartı değildir; vermezseniz uygulama aynen çalışır.\n' +
      '• Sadece genel reklamlar — reklam kimliği kullanılmaz; yalnızca IP adresi (yaklaşık konum), cihaz modeli, işletim sistemi, dil ve reklam etkileşimi (görüntüleme/tıklama) işlenir.\n\n' +
      'Reklam ağına kilo, VKİ, öğün, hedef, fotoğraf gibi sağlık verileri hiçbir zaman iletilmez. Reklam verileri Google’ın Türkiye dışındaki sunucularında işlenebilir; Google’ın gizlilik politikası ve reklam ayarları (adssettings.google.com) geçerlidir. Tercihinizi Profil → Kişiselleştirilmiş reklamlar bölümünden her an değiştirebilir, iOS Ayarlar → Gizlilik → Takip üzerinden izni geri alabilirsiniz.',
  },
  {
    title: 'Veri Güvenliği',
    body:
      'Veriler Supabase altyapısında, endüstri standardı yöntemlerle korunur.',
  },
  {
    title: 'Hesap ve Veri Silme',
    body:
      'Profil → Hesabımı ve Tüm Verilerimi Sil ile hesabınız ve bağlı kayıtlar kalıcı olarak silinebilir.',
  },
  {
    title: 'Üçüncü Taraf Hizmetler',
    body:
      'Supabase (veritabanı ve kimlik doğrulama), Groq (metin ve isteğe bağlı görsel analiz), Google Gemini (yedek görsel analiz), Google AdMob (yalnızca ücretsiz planda reklam). Bu sağlayıcıların kendi gizlilik politikaları geçerlidir.',
  },
  {
    title: 'KVKK Kapsamında Haklarınız',
    body:
      '6698 sayılı Kişisel Verilerin Korunması Kanunu’nun 11. maddesi uyarınca verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya silinmesini isteme, işlemeye itiraz etme ve rızanızı geri çekme hakkına sahipsiniz. Talepleriniz için aşağıdaki iletişim adresini kullanabilirsiniz; hesap ve veri silme uygulama içinden anında yapılabilir.',
  },
  {
    title: 'Tıbbi Sorumluluk Reddi',
    body:
      'Uygulama kişisel takip ve genel bilgilendirme amaçlıdır. Yapay zeka tavsiyeleri ve fotoğraftan kalori tahminleri tıbbi teşhis veya tedavi yerine geçmez. Kararlar için doktor veya uzman diyetisyene danışınız.',
  },
  {
    title: 'İletişim',
    body: 'Gizlilik soruları: ebcengiz@github.com',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer edges={[]}>
      <Text style={styles.updated} maxFontSizeMultiplier={MAX_FONT_SCALE}>Son güncelleme: Eylül 2026</Text>
      {SECTIONS.map(({ title, body }) => (
        <View key={title} style={styles.block}>
          <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
          <Text style={styles.sectionBody} maxFontSizeMultiplier={MAX_FONT_SCALE}>{body}</Text>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  updated: { fontSize: SIZES.tiny, color: COLORS.textLight, marginBottom: SIZES.lg },
  block: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm },
  sectionBody: { fontSize: SIZES.small, lineHeight: 22, color: COLORS.textSecondary },
});
