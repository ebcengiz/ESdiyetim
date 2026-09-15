import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, TYPOGRAPHY, HIT_SLOP, MAX_FONT_SCALE } from '../../constants/theme';

/**
 * Bölüm başlığı + isteğe bağlı sağ eylem ("Tümünü gör ›").
 */
export default function SectionHeader({ title, subtitle, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.texts}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
          {title}
        </Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: SIZES.sm + 4 },
  texts: { flex: 1 },
  title: { ...TYPOGRAPHY.sectionTitle, fontSize: SIZES.h4 + 1 },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingLeft: SIZES.sm },
  actionText: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primary },
});
