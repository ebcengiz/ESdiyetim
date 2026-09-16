import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE, withAlpha } from '../../constants/theme';
import IconBadge from '../ui/IconBadge';

// Küçük, tekrar kullanılan sunum bileşenleri — HomeScreen ve alt bölümleri
// (HomeStatsRow, HomeSections) arasında paylaşılır.

export const MealItem = ({ icon, label, text }) => (
  <View style={styles.mealItem}>
    <IconBadge name={icon} size={40} />
    <View style={styles.mealContent}>
      <Text style={styles.mealLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      <Text style={styles.mealText} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{text}</Text>
    </View>
  </View>
);

/** 2 sütunlu kısayol kartı (genişlik parent'tan, bkz. QuickActionsSection) */
export const QuickActionButton = ({ icon, label, color, onPress, style }) => (
  <Pressable
    style={({ pressed }) => [styles.quickAction, pressed && styles.pressed, style]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <IconBadge name={icon} color={color} size={44} />
    <View style={styles.quickActionBottom}>
      <Text style={styles.quickActionLabel} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
    </View>
  </Pressable>
);

/** "Fotoğraftan kalori" / "Besin Takibi" gibi tek satırlık CTA kartı — ikisi de aynı desen. */
export const HomeActionCta = ({ icon, color = COLORS.primary, title, subtitle, user, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.cta, !user && styles.ctaGuest, pressed && styles.pressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={subtitle}
  >
    <IconBadge name={icon} color={color} size={48} />
    <View style={styles.ctaText}>
      <Text style={styles.ctaTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
      <Text style={styles.ctaSub} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{subtitle}</Text>
    </View>
    <Ionicons name={user ? 'chevron-forward' : 'lock-closed-outline'} size={20} color={COLORS.textLight} />
  </Pressable>
);

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },

  // MealItem
  mealItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm, gap: SIZES.md },
  mealContent: { flex: 1 },
  mealLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.primary, marginBottom: 2 },
  mealText: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 20 },

  // QuickActionButton
  quickAction: {
    height: 112,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    justifyContent: 'space-between',
    ...SHADOWS.small,
  },
  quickActionBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SIZES.xs },
  quickActionLabel: { flex: 1, fontSize: SIZES.bodySmall, fontWeight: '700', color: COLORS.text },

  // HomeActionCta
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    gap: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
    ...SHADOWS.small,
  },
  ctaGuest: { borderStyle: 'dashed', backgroundColor: withAlpha(COLORS.surface, 0.9) },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  ctaSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
});
