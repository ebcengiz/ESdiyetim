import React from 'react';
import { Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY, MAX_FONT_SCALE, withAlpha } from '../../constants/theme';

/**
 * Tek buton bileşeni — TouchableOpacity + LinearGradient kopyalarının yerine.
 *
 * variant: 'primary' (gradient) | 'secondary' (açık yeşil) | 'outline' | 'ghost' | 'danger' (açık kırmızı) |
 *          'dangerSolid' | 'warningSolid' | 'onPrimary' (yeşil zemin üstü beyaz cam)
 * size:    'sm' | 'md' | 'lg'
 *
 *   <AppButton title="Kaydet" onPress={save} loading={saving} icon="checkmark" />
 *   <AppButton title="Sil" variant="danger" size="sm" />
 */
export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,                // Ionicons adı (sol)
  iconRight,           // Ionicons adı (sağ)
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic = true,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const sz = SIZES_MAP[size] || SIZES_MAP.md;

  const handlePress = (e) => {
    if (isDisabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.(e);
  };

  const content = (pressed) => (
    <View style={[styles.row, { gap: sz.gap }]}>
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        icon && <Ionicons name={icon} size={sz.icon} color={v.text} />
      )}
      {!!title && (
        <Text
          style={[TYPOGRAPHY.button, { color: v.text, fontSize: sz.font }, textStyle]}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
      {!loading && iconRight && <Ionicons name={iconRight} size={sz.icon} color={v.text} />}
    </View>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { minHeight: sz.height, paddingHorizontal: sz.padX, borderRadius: sz.radius },
        v.container,
        v.shadow && !isDisabled && SHADOWS.medium,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && v.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {v.gradient && !isDisabled && (
            <LinearGradient
              colors={pressed ? [COLORS.primaryDark, COLORS.primaryDark] : [COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: sz.radius }]}
            />
          )}
          {content(pressed)}
        </>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  primary: {
    container: { backgroundColor: COLORS.primary, overflow: 'hidden' },
    gradient: true,
    shadow: true,
    text: COLORS.textOnPrimary,
    pressed: { transform: [{ scale: 0.98 }] },
  },
  secondary: {
    container: { backgroundColor: COLORS.highlight },
    text: COLORS.primaryDark,
    pressed: { backgroundColor: COLORS.secondary, transform: [{ scale: 0.98 }] },
  },
  outline: {
    container: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.primary },
    text: COLORS.primary,
    pressed: { backgroundColor: COLORS.accent, transform: [{ scale: 0.98 }] },
  },
  ghost: {
    container: { backgroundColor: COLORS.transparent },
    text: COLORS.primary,
    pressed: { backgroundColor: COLORS.accent },
  },
  danger: {
    container: { backgroundColor: COLORS.errorBg },
    text: COLORS.errorText,
    pressed: { backgroundColor: withAlpha(COLORS.error, 0.22), transform: [{ scale: 0.98 }] },
  },
  dangerSolid: {
    container: { backgroundColor: COLORS.error },
    shadow: true,
    text: COLORS.white,
    pressed: { backgroundColor: COLORS.errorText, transform: [{ scale: 0.98 }] },
  },
  warningSolid: {
    container: { backgroundColor: COLORS.warning },
    shadow: true,
    text: COLORS.white,
    pressed: { backgroundColor: COLORS.warningText, transform: [{ scale: 0.98 }] },
  },
  onPrimary: {
    container: { backgroundColor: withAlpha(COLORS.white, 0.18), borderWidth: 1, borderColor: withAlpha(COLORS.white, 0.3) },
    text: COLORS.white,
    pressed: { backgroundColor: withAlpha(COLORS.white, 0.3) },
  },
};

const SIZES_MAP = {
  sm: { height: SIZES.buttonHeightSmall, padX: SIZES.md, font: SIZES.small, icon: 16, gap: 6, radius: SIZES.radiusSmall },
  md: { height: SIZES.buttonHeight, padX: SIZES.lg, font: SIZES.body, icon: 20, gap: SIZES.sm, radius: SIZES.radiusMedium },
  lg: { height: 58, padX: SIZES.xl, font: SIZES.h5 + 1, icon: 22, gap: SIZES.sm, radius: SIZES.radiusLarge },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
});
