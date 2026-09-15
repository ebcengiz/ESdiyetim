import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, withAlpha } from '../../constants/theme';

/**
 * Yuvarlak/yumuşak köşeli ikon rozeti — 7 dosyadaki iconCircle/iconWrap kopyalarının yerine.
 *
 *   <IconBadge name="flame-outline" color={COLORS.accents.coral} size={44} />
 *   <IconBadge name="leaf" tone="solid" />   // dolu yeşil
 */
export default function IconBadge({
  name,
  color = COLORS.primary,
  size = 40,
  iconSize,
  tone = 'soft',      // 'soft' (renk %12 zemin) | 'solid' (renk zemin, beyaz ikon) | 'glass' (beyaz cam, yeşil zemin üstü)
  shape = 'circle',   // 'circle' | 'rounded'
  style,
}) {
  const bg =
    tone === 'solid' ? color : tone === 'glass' ? withAlpha(COLORS.white, 0.2) : withAlpha(color, 0.12);
  const fg = tone === 'solid' || tone === 'glass' ? COLORS.white : color;
  const radius = shape === 'circle' ? size / 2 : Math.round(size * 0.3);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: bg }, style]}>
      <Ionicons name={name} size={iconSize || Math.round(size * 0.5)} color={fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
