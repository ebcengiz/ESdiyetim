import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Form gönderiminde hata olunca yatay "sallama" animasyonu + hafif haptic.
 *
 *   const { shakeStyle, shake } = useShake();
 *   <Animated.View style={shakeStyle}>…</Animated.View>
 */
export function useShake() {
  const value = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence(
      [8, -8, 6, -6, 0].map((toValue) =>
        Animated.timing(value, { toValue, duration: 60, useNativeDriver: true })
      )
    ).start();
  }, [value]);

  return { shake, shakeStyle: { transform: [{ translateX: value }] } };
}

export default useShake;
