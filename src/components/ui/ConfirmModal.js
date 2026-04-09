import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

/**
 * Modern confirmation modal — replaces Alert.alert for destructive actions.
 *
 * Props:
 *   visible        boolean
 *   title          string
 *   message        string
 *   confirmText    string  (default "Evet")
 *   cancelText     string  (default "İptal")
 *   type           "danger" | "warning" | "default"
 *   icon           Ionicon name (optional)
 *   onConfirm      () => void
 *   onCancel       () => void
 */
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Evet',
  cancelText = 'İptal',
  type = 'default',
  icon,
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

  const confirmColor =
    type === 'danger' ? COLORS.error : type === 'warning' ? COLORS.warning : COLORS.primary;

  const iconName =
    icon || (type === 'danger' ? 'trash-outline' : type === 'warning' ? 'warning-outline' : 'help-circle-outline');

  const iconBgColor =
    type === 'danger' ? '#FEE2E2' : type === 'warning' ? '#FEF3C7' : COLORS.surfaceAlt;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
            <Ionicons name={iconName} size={28} color={confirmColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.75}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
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
    marginBottom: SIZES.xl,
    paddingHorizontal: SIZES.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    width: '100%',
    marginTop: SIZES.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMedium,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMedium,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: '#fff',
  },
});
