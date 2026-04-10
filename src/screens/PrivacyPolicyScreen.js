import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/theme';

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
      'Veriler yalnızca uygulama işlevleri, kişiselleştirilmiş takip ve hesap doğrulama için kullanılır. Reklam, çapraz uygulama takibi veya veri broker satışı yapılmaz.',
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
      'Supabase (veritabanı ve kimlik doğrulama), Groq (metin ve isteğe bağlı görsel analiz), Google Gemini (yedek görsel analiz). Bu sağlayıcıların kendi gizlilik politikaları geçerlidir.',
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
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.updated}>Son güncelleme: Nisan 2026</Text>
      {SECTIONS.map(({ title, body }) => (
        <View key={title} style={styles.block}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionBody}>{body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.containerPadding,
    paddingTop: SIZES.md,
  },
  updated: {
    fontSize: SIZES.tiny,
    color: COLORS.textLight,
    marginBottom: SIZES.lg,
  },
  block: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  sectionBody: {
    fontSize: SIZES.small,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
});
