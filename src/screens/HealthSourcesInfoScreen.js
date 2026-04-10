import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
  card: {
    marginTop: 0,
  },
});
