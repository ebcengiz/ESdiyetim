import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import IconBadge from '../ui/IconBadge';
import Skeleton from '../ui/Skeleton';

/** "── ANA ÖĞÜNLER ──" biçiminde çizgili bölüm etiketi */
export function SectionTitle({ label, style }) {
  return (
    <View style={[sec.row, style]} accessibilityRole="header">
      <View style={sec.line} />
      <Text style={sec.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      <View style={sec.line} />
    </View>
  );
}

/** Öğün satırı — dolu/boş durumu, dokununca düzenleme */
export default function MealCard({ meal, value, loading, onPress, disabled }) {
  const filled = !!value?.trim();
  return (
    <Pressable
      style={({ pressed }) => [card.wrap, pressed && card.pressed]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${meal.label}: ${filled ? value : 'boş'}`}
      accessibilityHint="Düzenlemek için dokunun"
    >
      <IconBadge name={meal.icon} color={meal.color} size={44} />
      <View style={card.body}>
        <Text style={card.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>{meal.label}</Text>
        {loading ? (
          <Skeleton width="60%" height={12} />
        ) : filled ? (
          <Text style={card.content} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{value}</Text>
        ) : (
          <Text style={card.empty} maxFontSizeMultiplier={MAX_FONT_SCALE}>Eklemek için dokunun</Text>
        )}
      </View>
      <View style={[card.dot, { backgroundColor: filled ? COLORS.primaryLight : COLORS.border }]} />
    </Pressable>
  );
}

const sec = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.md, marginBottom: SIZES.sm, gap: SIZES.sm },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
  text: { fontSize: SIZES.tiny - 1, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
});

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    gap: SIZES.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 72,
    ...SHADOWS.small,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  body: { flex: 1 },
  label: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  content: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  empty: { fontSize: SIZES.small, color: COLORS.textLight, fontStyle: 'italic' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
