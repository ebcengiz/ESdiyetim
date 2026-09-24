import React from 'react';
import { Pressable } from 'react-native';

/**
 * TouchableOpacity'nin Pressable karşılığı — basılıyken opaklık düşer.
 * Aynı prop'ları kabul eder (activeOpacity dahil); stil dizi/nesne olabilir.
 * Yeni kodda düz butonlar için AppButton; ikon/satır gibi serbest dokunma alanları için bu.
 */
export default function PressableOpacity({
  style,
  activeOpacity = 0.7,
  accessibilityRole = 'button',
  children,
  ...rest
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      style={({ pressed }) => [style, pressed && { opacity: activeOpacity }]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
