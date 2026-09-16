import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import IconBadge from './IconBadge';

/**
 * Tek satırlık eylem kartı: ikon rozeti + başlık + alt metin + sağ ok (kilitliyse kilit).
 * Home "Fotoğraftan kalori" / "Besin Takibi", DietPlan CTA'sı vb. aynı desen.
 */
export default function ActionCta({ icon, color = COLORS.primary, title, subtitle, locked = false, onPress, style }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.cta, locked && styles.ctaLocked, pressed && styles.pressed, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <IconBadge name={icon} color={color} size={48} />
      <View style={styles.text}>
        <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.sub} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name={locked ? 'lock-closed-outline' : 'chevron-forward'} size={20} color={COLORS.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  ctaLocked: { borderStyle: 'dashed' },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  text: { flex: 1 },
  title: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
});
