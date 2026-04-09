import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TOAST_CONFIG = {
  success: { bg: '#16A34A', icon: 'checkmark-circle', light: '#DCFCE7', textColor: '#fff' },
  error:   { bg: '#DC2626', icon: 'close-circle',     light: '#FEE2E2', textColor: '#fff' },
  warning: { bg: '#D97706', icon: 'warning',           light: '#FEF3C7', textColor: '#fff' },
  info:    { bg: '#0F766E', icon: 'information-circle',light: '#CCFBF1', textColor: '#fff' },
};

export default function Toast({ visible, type = 'info', message, onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onHide?.());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 12,
          backgroundColor: config.bg,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.iconWrap}>
        <Ionicons name={config.icon} size={22} color="#fff" />
      </View>
      <Text style={styles.message} numberOfLines={3}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SIZES.containerPadding,
    right: SIZES.containerPadding,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 14,
    paddingHorizontal: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.large,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: SIZES.bodySmall,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
});
