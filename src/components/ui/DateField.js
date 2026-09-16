import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import { formatLongDate } from '../../utils/date';
import IconBadge from './IconBadge';
import DatePickerSheet from './DatePickerSheet';

/**
 * Form içi tarih alanı — etiket + dokununca DatePickerSheet açan buton.
 * (Weight, Goals formlarındaki dateBtn + inline DateTimePicker kopyalarının yerine.)
 *
 *   <DateField label="Hedef Tarihi" value={date} onChange={setDate} minimumDate={start} />
 */
export default function DateField({ label, value, onChange, helper, error, minimumDate, maximumDate, title, containerStyle }) {
  const [open, setOpen] = useState(false);
  const handleChange = (event, date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (date) onChange(date);
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      {!!label && <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label || 'Tarih'}: ${formatLongDate(value)}. Değiştirmek için dokunun`}
        style={({ pressed }) => [styles.btn, !!error && styles.btnError, pressed && styles.pressed]}
      >
        <IconBadge name="calendar-outline" size={36} shape="rounded" />
        <Text style={styles.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatLongDate(value)}</Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </Pressable>
      {!!error ? (
        <View style={styles.msgRow}>
          <Ionicons name="alert-circle" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !!helper ? (
        <Text style={styles.helper} maxFontSizeMultiplier={MAX_FONT_SCALE}>{helper}</Text>
      ) : null}

      <DatePickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={handleChange}
        title={title || label || 'Tarih Seç'}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SIZES.md },
  label: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.2, marginBottom: 6, marginLeft: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.sm + 2,
    minHeight: SIZES.inputHeight,
    gap: SIZES.sm + 2,
    ...SHADOWS.small,
  },
  btnError: { borderColor: COLORS.error },
  pressed: { opacity: 0.85 },
  text: { flex: 1, fontSize: SIZES.body, fontWeight: '600', color: COLORS.text },
  helper: { fontSize: SIZES.tiny, color: COLORS.textLight, marginTop: 6, marginLeft: 4 },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: SIZES.tiny + 1, color: COLORS.error, fontWeight: '600', flex: 1 },
});
