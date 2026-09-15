import React, { forwardRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY, HIT_SLOP, MAX_FONT_SCALE, withAlpha } from '../../constants/theme';

/**
 * Form alanı — etiket + ikon + inline hata/yardım metni + odak halkası + şifre göz butonu.
 * Login/Register/Goals/Weight formlarındaki INPUT_FIELD kopyalarının yerine.
 *
 *   <AppInput label="E-posta" icon="mail-outline" value={email} onChangeText={setEmail}
 *             error={errors.email} keyboardType="email-address" autoCapitalize="none" />
 */
const AppInput = forwardRef(function AppInput(
  {
    label,
    icon,
    error,
    helper,
    secureTextEntry,
    rightElement,       // özel sağ aksesuar (ör. birim etiketi "kg")
    unit,               // kısa birim metni; rightElement'in basit hali
    containerStyle,
    inputStyle,
    onFocus,
    onBlur,
    editable = true,
    ...inputProps
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? COLORS.error : focused ? COLORS.primary : COLORS.border;
  const iconColor = error ? COLORS.error : focused ? COLORS.primary : COLORS.textLight;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {!!label && (
        <Text style={styles.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.field,
          { borderColor },
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
          !editable && styles.fieldDisabled,
        ]}
      >
        {!!icon && <Ionicons name={icon} size={20} color={iconColor} style={styles.icon} />}

        <TextInput
          ref={ref}
          style={[styles.input, inputStyle]}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={hidden}
          editable={editable}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...inputProps}
        />

        {!!unit && <Text style={styles.unit}>{unit}</Text>}
        {rightElement}

        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}
            style={styles.eye}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={COLORS.textLight} />
          </Pressable>
        )}
      </View>

      {!!error ? (
        <View style={styles.msgRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !!helper ? (
        <Text style={styles.helperText}>{helper}</Text>
      ) : null}
    </View>
  );
});

export default AppInput;

const styles = StyleSheet.create({
  wrap: { marginBottom: SIZES.md },
  label: { ...TYPOGRAPHY.label, marginBottom: 6, marginLeft: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: SIZES.inputHeight,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1.5,
    paddingHorizontal: SIZES.md,
    ...SHADOWS.small,
  },
  fieldFocused: { shadowColor: COLORS.primary, shadowOpacity: 0.18, backgroundColor: COLORS.backgroundLight },
  fieldError: { backgroundColor: withAlpha(COLORS.error, 0.03) },
  fieldDisabled: { backgroundColor: COLORS.neutral100, opacity: 0.8 },
  icon: { marginRight: SIZES.sm + 2 },
  input: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.text,
    paddingVertical: 12,
    minHeight: SIZES.minTouch,
  },
  unit: { ...TYPOGRAPHY.label, color: COLORS.textLight, marginLeft: SIZES.sm },
  eye: { marginLeft: SIZES.sm, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: SIZES.tiny + 1, color: COLORS.error, fontWeight: '600', flex: 1 },
  helperText: { ...TYPOGRAPHY.small, marginTop: 6, marginLeft: 4 },
});
