import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SIZES, MAX_FONT_SCALE, withAlpha, whiteAlpha } from '../../constants/theme';

/**
 * Filtre/kategori çipi.
 *   <Chip label="Beslenme" icon="leaf" active color={COLORS.accents.emerald} onPress={...} />
 * tone 'surface' (varsayılan): aktif → dolu renk + beyaz metin; pasif → hafif zemin + ikincil metin.
 * tone 'onPrimary' (yeşil zemin üstü): aktif → beyaz zemin + yeşil metin; pasif → cam zemin + beyaz metin.
 */
export default function Chip({ label, icon, active = false, color = COLORS.primary, tone = 'surface', onPress, disabled, style, small = false }) {
  const onPrimary = tone === 'onPrimary';
  const bg = onPrimary ? (active ? COLORS.white : whiteAlpha(0.18)) : active ? color : withAlpha(color, 0.1);
  const fg = onPrimary ? (active ? COLORS.primary : COLORS.white) : active ? COLORS.white : color;
  const textColor = onPrimary ? fg : active ? COLORS.white : COLORS.textSecondary;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        small && styles.chipSmall,
        { backgroundColor: bg },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {!!icon && <Ionicons name={icon} size={small ? 13 : 15} color={fg} />}
      <Text
        style={[styles.text, small && styles.textSmall, { color: textColor }, active && styles.textActive]}
        numberOfLines={1}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: SIZES.radiusFull,
  },
  chipSmall: { paddingHorizontal: 10, minHeight: 30 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  text: { fontSize: SIZES.small - 1, fontWeight: '600' },
  textSmall: { fontSize: SIZES.tiny },
  textActive: { fontWeight: '700' },
});
