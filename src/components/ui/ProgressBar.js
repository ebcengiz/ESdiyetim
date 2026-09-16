import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, whiteAlpha } from '../../constants/theme';

/**
 * İnce ilerleme çubuğu. value 0..1.
 * tone: 'onPrimary' (yeşil zemin üstü beyaz) | 'primary' (beyaz zemin üstü yeşil)
 */
export default function ProgressBar({ value = 0, tone = 'primary', height = 6, style }) {
  const pct = Math.max(0, Math.min(1, Number(value) || 0));
  const onPrimary = tone === 'onPrimary';
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: onPrimary ? whiteAlpha(0.25) : COLORS.border }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, borderRadius: height / 2, backgroundColor: onPrimary ? COLORS.white : COLORS.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%' },
});
