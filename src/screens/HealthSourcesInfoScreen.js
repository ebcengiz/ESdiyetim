import React from 'react';
import { Text, StyleSheet, Linking } from 'react-native';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../constants/theme';
import HealthSourcesCard from '../components/HealthSourcesCard';
import { ScreenContainer } from '../components/ui';

/**
 * App Store İnceleme Kılavuzu 1.4.1 ile uyum: sağlık içeriği için uyarılar ve
 * resmî/bilimsel kaynak bağlantıları tek, kolay bulunur bir ekranda toplanır.
 * Apple her sayfada ayrı kaynak kutusu zorunlu tutmaz; erişilebilirlik ve şeffaflık esastır.
 */
export default function HealthSourcesInfoScreen() {
  return (
    <ScreenContainer edges={[]} contentContainerStyle={styles.content}>
      <Text style={styles.lead} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Uygulama genel bilgilendirme ve kişisel takip amaçlıdır. Tıbbi teşhis, tedavi veya kişiye özel
        beslenme planı sunmaz. Karar vermeden önce mutlaka bir hekim veya diyetisyene danışın. Aşağıdaki
        bağlantılar bağımsız resmî ve bilimsel kaynaklardır.
      </Text>

      <Text style={styles.aiNote} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Yapay zeka metin ve (isteğe bağlı) görsel analizleri Groq ve/veya Google tarafında işlenir; ayrıntılar
        Profil → Gizlilik politikası ekranındadır. Sağlık verisi reklam veya pazarlama amaçlı üçüncü taraflara
        satılmaz ve reklam ağına iletilmez; ücretsiz sürümdeki sınırlı reklamlar sağlık verinizden bağımsızdır
        (App Store İnceleme Kılavuzu 5.1.3 ile uyumlu kullanım).
      </Text>
      <Text
        style={styles.aiLink}
        accessibilityRole="link"
        onPress={() => Linking.openURL('https://developer.apple.com/app-store/review/guidelines/#health-and-fitness')}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        Apple — Sağlık ve gizlilik kuralları (5.1.3)
      </Text>

      <HealthSourcesCard variant="dietPlan" style={styles.card} />
      <HealthSourcesCard variant="meal" style={styles.card} />
      <HealthSourcesCard variant="food" style={styles.card} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: SIZES.md },
  lead: { fontSize: SIZES.small, lineHeight: 21, color: COLORS.textSecondary },
  aiNote: { fontSize: SIZES.tiny, lineHeight: 18, color: COLORS.textLight },
  aiLink: { fontSize: SIZES.tiny, color: COLORS.info, fontWeight: '600', textDecorationLine: 'underline', minHeight: 24 },
  card: { marginTop: 0 },
});
