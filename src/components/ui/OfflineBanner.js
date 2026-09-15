import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../../constants/theme';
import { subscribeConnectivity } from '../../services/errors';

/**
 * Bağlantı kesilince üstte ince bir şerit — "Çevrimdışısınız". Bağlantı dönünce
 * kısa süre "Bağlantı geri geldi" gösterip kaybolur. App.js'de bir kez render edilir.
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState('online'); // 'online' | 'offline' | 'restored'
  const progress = useRef(new Animated.Value(0)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsub = subscribeConnectivity(({ isConnected, isInternetReachable }) => {
      const offline = isConnected === false || isInternetReachable === false;
      if (offline) {
        wasOffline.current = true;
        setState('offline');
      } else if (wasOffline.current) {
        wasOffline.current = false;
        setState('restored');
        setTimeout(() => setState('online'), 2200);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    Animated.timing(progress, { toValue: state === 'online' ? 0 : 1, duration: 220, useNativeDriver: true }).start();
  }, [state]);

  if (state === 'online') return null;
  const offline = state === 'offline';
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });

  return (
    <Animated.View
      style={[
        styles.wrap,
        { paddingTop: insets.top + 4, backgroundColor: offline ? COLORS.neutral800 : COLORS.primaryDark, transform: [{ translateY }] },
      ]}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <View style={styles.row}>
        <Ionicons name={offline ? 'cloud-offline-outline' : 'cloud-done-outline'} size={16} color={COLORS.white} />
        <Text style={styles.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {offline ? 'Çevrimdışısınız — bazı özellikler kullanılamayabilir' : 'Bağlantı geri geldi'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9998, elevation: 15, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: SIZES.md },
  text: { color: COLORS.white, fontSize: SIZES.tiny + 1, fontWeight: '700' },
});
