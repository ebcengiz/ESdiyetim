import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SIZES, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';

/**
 * Segmentli seçici (iOS segmented control benzeri).
 *   options: [{ key, label, icon? }]
 *   tone: 'onPrimary' (yeşil zemin üstü) | 'surface' (beyaz zemin üstü)
 */
export default function SegmentedControl({ options, value, onChange, tone = 'onPrimary', style }) {
  const onPrimary = tone === 'onPrimary';
  return (
    <View style={[styles.wrap, onPrimary ? styles.wrapOnPrimary : styles.wrapSurface, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.key === value;
        const fg = active ? COLORS.primary : onPrimary ? whiteAlpha(0.75) : COLORS.textSecondary;
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              if (active) return;
              Haptics.selectionAsync().catch(() => {});
              onChange(opt.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={({ pressed }) => [styles.btn, active && styles.btnActive, pressed && !active && styles.pressed]}
          >
            {!!opt.icon && <Ionicons name={opt.icon} size={16} color={fg} />}
            <Text style={[styles.text, { color: fg }, active && styles.textActive]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: SIZES.radiusMedium, padding: 4, width: '100%' },
  wrapOnPrimary: { backgroundColor: whiteAlpha(0.2) },
  wrapSurface: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: SIZES.radiusSmall,
    gap: 6,
  },
  btnActive: { backgroundColor: COLORS.surface },
  pressed: { opacity: 0.7 },
  text: { fontSize: SIZES.small, fontWeight: '600' },
  textActive: { fontWeight: '700' },
});
