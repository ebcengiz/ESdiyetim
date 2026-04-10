import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, scrollTabScreenBottomPad } from '../constants/theme';
import HealthSourcesCard from '../components/HealthSourcesCard';

/**
 * App Store İnceleme Kılavuzu 1.4.1 ile uyum: sağlık içeriği için uyarılar ve
 * resmî/bilimsel kaynak bağlantıları tek, kolay bulunur bir ekranda toplanır.
 * Apple her sayfada ayrı kaynak kutusu zorunlu tutmaz; erişilebilirlik ve şeffaflık esastır.
 */
export default function HealthSourcesInfoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: scrollTabScreenBottomPad(insets.bottom) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lead}>
        Uygulama genel bilgilendirme ve kişisel takip amaçlıdır. Tıbbi teşhis, tedavi veya kişiye özel
        beslenme planı sunmaz. Karar vermeden önce mutlaka bir hekim veya diyetisyene danışın. Aşağıdaki
        bağlantılar bağımsız resmî ve bilimsel kaynaklardır.
      </Text>

      <Text style={styles.aiNote}>
        Yapay zeka metin ve (isteğe bağlı) görsel analizleri Groq ve/veya Google tarafında işlenir; ayrıntılar
        Profil → Gizlilik politikası ekranındadır. Sağlık verisi reklam veya pazarlama amaçlı üçüncü taraflara
        satılmaz (App Store İnceleme Kılavuzu 5.1.3 ile uyumlu kullanım).
      </Text>
      <Text style={styles.aiLink} onPress={() => Linking.openURL('https://developer.apple.com/app-store/review/guidelines/#health-and-fitness')}>
        Apple — Sağlık ve gizlilik kuralları (5.1.3)
      </Text>

      <HealthSourcesCard variant="dietPlan" style={styles.card} />
      <HealthSourcesCard variant="meal" style={styles.card} />
      <HealthSourcesCard variant="food" style={styles.card} />
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
    gap: SIZES.md,
  },
  lead: {
    fontSize: SIZES.small,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  aiNote: {
    fontSize: SIZES.tiny,
    lineHeight: 18,
    color: COLORS.textLight,
    marginBottom: SIZES.xs,
  },
  aiLink: {
    fontSize: SIZES.tiny,
    color: COLORS.info,
    fontWeight: '600',
    marginBottom: SIZES.md,
    textDecorationLine: 'underline',
  },
  card: {
    marginTop: 0,
  },
});
