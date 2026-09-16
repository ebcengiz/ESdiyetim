import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';

/** Bugün ise "Bugün", değilse "16 Eylül Çarşamba" */
export function formatDayLabel(date) {
  const today = new Date();
  const same =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  return same ? 'Bugün' : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

/**
 * Gün ileri/geri + ortaya dokununca tarih seçici — DietPlan ve FoodLog başlıklarında.
 * tone: 'onPrimary' (yeşil gradyan üstü, beyaz) | 'surface' (beyaz kart)
 */
export default function DateStepper({ date, onChange, onOpenPicker, tone = 'onPrimary', style }) {
  const onPrimary = tone === 'onPrimary';
  const fg = onPrimary ? COLORS.textOnPrimary : COLORS.text;
  const step = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    onChange(d);
  };

  return (
    <View style={[styles.row, onPrimary ? styles.rowOnPrimary : styles.rowSurface, style]}>
      <Pressable
        onPress={() => step(-1)}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Önceki gün"
        style={({ pressed }) => [styles.arrow, onPrimary ? styles.arrowOnPrimary : styles.arrowSurface, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={18} color={fg} />
      </Pressable>

      <Pressable
        onPress={onOpenPicker}
        accessibilityRole="button"
        accessibilityLabel={`Tarih: ${formatDayLabel(date)}. Değiştirmek için dokunun`}
        style={({ pressed }) => [styles.center, pressed && styles.pressed]}
      >
        <Text style={[styles.label, { color: fg }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {formatDayLabel(date)}
        </Text>
        <Text style={[styles.hint, { color: onPrimary ? whiteAlpha(0.75) : COLORS.textLight }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          tarihe dokunarak değiştir
        </Text>
      </Pressable>

      <Pressable
        onPress={() => step(1)}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Sonraki gün"
        style={({ pressed }) => [styles.arrow, onPrimary ? styles.arrowOnPrimary : styles.arrowSurface, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={18} color={fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radiusMedium, padding: 6, gap: 6 },
  rowOnPrimary: { backgroundColor: whiteAlpha(0.16), borderWidth: 1, borderColor: whiteAlpha(0.25) },
  rowSurface: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  arrow: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arrowOnPrimary: { backgroundColor: whiteAlpha(0.18) },
  arrowSurface: { backgroundColor: COLORS.surfaceAlt },
  center: { flex: 1, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  label: { fontSize: SIZES.body, fontWeight: '700' },
  hint: { fontSize: SIZES.micro, marginTop: 1 },
  pressed: { opacity: 0.7 },
});
