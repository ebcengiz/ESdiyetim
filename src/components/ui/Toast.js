import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, Text, View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, withAlpha, blackAlpha } from '../../constants/theme';

const TOAST_CONFIG = {
  success: { accent: COLORS.primaryLight, icon: 'checkmark-circle' },
  error:   { accent: COLORS.error,        icon: 'close-circle' },
  warning: { accent: COLORS.warning,      icon: 'warning' },
  info:    { accent: COLORS.accents.sky,  icon: 'information-circle' },
};

/**
 * Toast v2 — koyu nötr kart, sol renk şeridi, isteğe bağlı eylem butonu ("Tekrar dene"),
 * dokununca kapanır. Kuyruk ve zamanlama ToastContext'te.
 *
 * props: visible, type, message, action { label, onPress }, duration, onHide
 */
export default function Toast({ visible, type = 'info', message, action, duration = 3200, onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onHide?.());
  }, [onHide, translateY, opacity]);

  useEffect(() => {
    if (!visible) return undefined;
    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 90, friction: 11, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    // Eylemli toast'lar biraz daha uzun kalsın (kullanıcı okuyup basabilsin)
    timerRef.current = setTimeout(hide, action ? Math.max(duration, 5000) : duration);
    return () => clearTimeout(timerRef.current);
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 10, opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
    >
      <Pressable onPress={hide} style={styles.body} accessibilityLabel={`${message}. Kapatmak için dokun`}>
        <View style={[styles.stripe, { backgroundColor: config.accent }]} />
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(config.accent, 0.18) }]}>
          <Ionicons name={config.icon} size={20} color={config.accent} />
        </View>
        <Text style={styles.message} numberOfLines={3} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {message}
        </Text>
        {!!action && (
          <Pressable
            onPress={() => { hide(); action.onPress?.(); }}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [styles.actionBtn, { borderColor: withAlpha(config.accent, 0.5) }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.actionText, { color: config.accent }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SIZES.containerPadding,
    right: SIZES.containerPadding,
    zIndex: 9999,
    elevation: 16,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral900,   // koyu nötr — her arkaplan üstünde okunur
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: SIZES.md,
    gap: SIZES.sm,
    minHeight: 56,
    shadowColor: COLORS.black,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  stripe: { width: 4, alignSelf: 'stretch', marginRight: 2 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  message: { flex: 1, fontSize: SIZES.bodySmall, fontWeight: '600', color: COLORS.neutral100, lineHeight: 20 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    backgroundColor: blackAlpha(0.2),
    minHeight: 32,
    justifyContent: 'center',
  },
  actionText: { fontSize: SIZES.small, fontWeight: '800' },
});
