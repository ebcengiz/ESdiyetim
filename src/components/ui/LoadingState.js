import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, TYPOGRAPHY } from '../../constants/theme';
import Skeleton from './Skeleton';

/**
 * Yükleme durumu.
 *   variant="spinner"  → ortalanmış ActivityIndicator (+ isteğe bağlı metin)
 *   variant="list"     → N adet kart iskeleti (liste ekranları)
 *   variant="card"     → tek kart iskeleti
 *   variant="inline"   → küçük satır (buton yanı, kart içi)
 */
export default function LoadingState({ variant = 'spinner', count = 3, label, style }) {
  if (variant === 'list' || variant === 'card') {
    const n = variant === 'card' ? 1 : count;
    return (
      <View style={style} accessibilityLabel="Yükleniyor" accessibilityRole="progressbar">
        {Array.from({ length: n }).map((_, i) => (
          <View key={i} style={styles.skeletonCard}>
            <View style={styles.skeletonRow}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={styles.skeletonTexts}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
              </View>
            </View>
            <Skeleton width="100%" height={12} style={{ marginTop: SIZES.md }} />
            <Skeleton width="85%" height={12} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    );
  }

  if (variant === 'inline') {
    return (
      <View style={[styles.inline, style]} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={COLORS.primary} />
        {!!label && <Text style={styles.inlineText}>{label}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.center, style]} accessibilityRole="progressbar" accessibilityLabel={label || 'Yükleniyor'}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SIZES.xl },
  label: { ...TYPOGRAPHY.caption, marginTop: SIZES.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingVertical: SIZES.sm },
  inlineText: { ...TYPOGRAPHY.caption },
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SIZES.cardPadding,
    marginBottom: SIZES.md,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm + 4 },
  skeletonTexts: { flex: 1 },
});
