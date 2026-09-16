import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, MAX_FONT_SCALE, whiteAlpha, withAlpha } from '../../constants/theme';
import { fmt } from '../../utils/foodLogUtils';

/** Header'daki kalori kartında protein/karb/yağ/lif özet çubuğu */
export function MacroPill({ label, value, goal, color, unit }) {
  const pct = Math.min(1, (value || 0) / goal);
  return (
    <View style={pill.wrap}>
      <Text style={pill.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      <Text style={pill.value} maxFontSizeMultiplier={MAX_FONT_SCALE}>{Math.round(value || 0)}{unit}</Text>
      <View style={pill.track}>
        <View style={[pill.fill, { backgroundColor: color, width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  label: { fontSize: SIZES.micro, color: whiteAlpha(0.8), marginBottom: 2 },
  value: { fontSize: SIZES.tiny, fontWeight: '700', marginBottom: 3, color: COLORS.white },
  track: { width: '100%', height: 3, borderRadius: 2, backgroundColor: whiteAlpha(0.2) },
  fill: { height: 3, borderRadius: 2 },
});

/** Seçilen yiyecek detay kartındaki 100g/100ml başına makro hücresi */
export function MacroGridCell({ label, value, unit, color, cellWidth }) {
  return (
    <View style={[mgc.cell, cellWidth ? { width: cellWidth } : null]}>
      <Text style={[mgc.value, { color }]}>{fmt(value)}</Text>
      <Text style={mgc.unit}>{unit}</Text>
      <Text style={mgc.label}>{label}</Text>
    </View>
  );
}
const mgc = StyleSheet.create({
  cell: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm,
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  value: { fontSize: SIZES.h4, fontWeight: '800' },
  unit: { fontSize: SIZES.micro, color: COLORS.textSecondary, marginTop: 1 },
  label: { fontSize: SIZES.micro, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
});

/** Hesaplanan gram bazlı değer çipi (kalori/protein/karb/yağ) */
export function CalcChip({ label, value, accent }) {
  return (
    <View style={[cc.wrap, accent && cc.accentWrap]}>
      <Text style={[cc.val, accent && cc.accentVal]}>{value}</Text>
      <Text style={[cc.label, accent && cc.accentLabel]}>{label}</Text>
    </View>
  );
}
const cc = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall, paddingVertical: SIZES.sm, marginHorizontal: 2,
  },
  accentWrap: { backgroundColor: withAlpha(COLORS.primary, 0.1) },
  val: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text },
  accentVal: { color: COLORS.primary },
  label: { fontSize: SIZES.micro, color: COLORS.textSecondary, marginTop: 2 },
  accentLabel: { color: COLORS.primaryDark },
});
