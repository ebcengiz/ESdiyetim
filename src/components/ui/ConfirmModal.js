import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE, blackAlpha } from '../../constants/theme';
import IconBadge from './IconBadge';
import AppButton from './AppButton';

/**
 * Onay modalı — Alert.alert yerine (yıkıcı işlemler: sil, çıkış, hesap kapat).
 *
 * Props:
 *   visible, title, message
 *   confirmText ("Evet"), cancelText ("İptal")
 *   type: "danger" | "warning" | "default"
 *   icon: Ionicon adı (opsiyonel)
 *   loading: onay butonunda spinner
 *   onConfirm, onCancel
 */
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Evet',
  cancelText = 'İptal',
  type = 'default',
  icon,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 90, friction: 9, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const tone = TONES[type] || TONES.default;
  const iconName = icon || tone.icon;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
          accessibilityViewIsModal
        >
          <IconBadge name={iconName} color={tone.color} size={64} style={styles.icon} />

          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
            {title}
          </Text>
          {!!message && (
            <Text style={styles.message} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {message}
            </Text>
          )}

          <View style={styles.actions}>
            <AppButton title={cancelText} variant="secondary" onPress={onCancel} style={styles.btn} haptic={false} disabled={loading} />
            <AppButton
              title={confirmText}
              variant={tone.variant}
              onPress={onConfirm}
              loading={loading}
              style={styles.btn}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const TONES = {
  danger: { color: COLORS.error, icon: 'trash-outline', variant: 'dangerSolid' },
  warning: { color: COLORS.warning, icon: 'warning-outline', variant: 'warningSolid' },
  default: { color: COLORS.primary, icon: 'help-circle-outline', variant: 'primary' },
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: blackAlpha(0.45),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.containerPadding,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.xl,
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  icon: { marginBottom: SIZES.md },
  title: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SIZES.sm,
    letterSpacing: -0.25,
  },
  message: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.sm,
  },
  actions: { flexDirection: 'row', gap: SIZES.sm, width: '100%', marginTop: SIZES.md },
  btn: { flex: 1 },
});
