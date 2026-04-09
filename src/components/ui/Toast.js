import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIZES, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const TOAST_CONFIG = {
  success: { accent: '#22C55E', icon: 'checkmark-circle' },
  error:   { accent: '#EF4444', icon: 'close-circle' },
  warning: { accent: '#F59E0B', icon: 'warning' },
  info:    { accent: '#3B82F6', icon: 'information-circle' },
};

export default function Toast({ visible, type = 'info', message, onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 90,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 90,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => hide(), 3200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
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
          top: insets.top + 10,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
      pointerEvents="none"
    >
      {/* Sol renkli şerit */}
      <View style={[styles.stripe, { backgroundColor: config.accent }]} />

      {/* İkon */}
      <View style={[styles.iconWrap, { backgroundColor: config.accent + '22' }]}>
        <Ionicons name={config.icon} size={20} color={config.accent} />
      </View>

      {/* Mesaj */}
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
    backgroundColor: '#1C1C1E',        // koyu nötr — her arkaplan üstünde görünür
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    paddingVertical: 13,
    paddingRight: SIZES.md,
    paddingLeft: 0,
    gap: SIZES.sm,
    // Güçlü gölge — arka plandan ayırır
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 16,
  },
  stripe: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginLeft: 0,
    marginRight: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: SIZES.bodySmall,
    fontWeight: '600',
    color: '#F5F5F5',
    lineHeight: 20,
  },
});
