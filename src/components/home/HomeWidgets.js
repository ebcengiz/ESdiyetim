import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import IconBadge from '../ui/IconBadge';
import ActionCta from '../ui/ActionCta';

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

/** "Fotoğraftan kalori" / "Besin Takibi" — ortak ActionCta; misafirde kilitli görünür. */
export const HomeActionCta = ({ icon, color, title, subtitle, user, onPress }) => (
  <ActionCta icon={icon} color={color} title={title} subtitle={subtitle} locked={!user} onPress={onPress} />
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

});
