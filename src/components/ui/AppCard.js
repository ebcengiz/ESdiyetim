import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY, HIT_SLOP, MAX_FONT_SCALE } from '../../constants/theme';

/**
 * Kart yüzeyi — CARD_SURFACE + başlık satırı + isteğe bağlı sağ eylem.
 *
 *   <AppCard title="Bugünkü Öğünler" icon="restaurant-outline" actionLabel="Tümü" onAction={...}>
 *     ...
 *   </AppCard>
 *
 * onPress verilirse kartın tamamı basılabilir olur (Pressable + pressed durumu).
 */
export default function AppCard({
  title,
  subtitle,
  icon,
  iconColor = COLORS.primary,
  actionLabel,
  actionIcon = 'chevron-forward',
  onAction,
  onPress,
  padding = SIZES.cardPadding,
  variant = 'elevated',   // 'elevated' | 'flat' | 'tinted'
  style,
  contentStyle,
  children,
  accessibilityLabel,
}) {
  const hasHeader = !!(title || subtitle || onAction);
  const Container = onPress ? Pressable : View;
  const computeStyle = (pressed) => [styles.card, VARIANTS[variant], { padding }, pressed && styles.pressed, style];

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel || title}
      style={onPress ? ({ pressed }) => computeStyle(pressed) : computeStyle(false)}
    >
      {hasHeader && (
        <View style={styles.header}>
          {!!icon && (
            <View style={[styles.iconWrap, { backgroundColor: COLORS.highlight }]}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
          )}
          <View style={styles.titles}>
            {!!title && (
              <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {title}
              </Text>
            )}
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {subtitle}
              </Text>
            )}
          </View>
          {!!onAction && (
            <Pressable
              onPress={onAction}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={actionLabel || 'Detay'}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
            >
              {!!actionLabel && <Text style={styles.actionText}>{actionLabel}</Text>}
              <Ionicons name={actionIcon} size={16} color={COLORS.primary} />
            </Pressable>
          )}
        </View>
      )}
      <View style={contentStyle}>{children}</View>
    </Container>
  );
}

const VARIANTS = {
  elevated: { backgroundColor: COLORS.surface, borderColor: COLORS.borderLight, ...SHADOWS.small },
  flat: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  tinted: { backgroundColor: COLORS.surfaceAlt, borderColor: COLORS.border },
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    marginBottom: SIZES.md,
  },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.96 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md, gap: SIZES.sm + 2 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  title: { fontSize: SIZES.h5, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: SIZES.minTouch - 12, paddingLeft: SIZES.sm },
  actionText: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primary },
});
