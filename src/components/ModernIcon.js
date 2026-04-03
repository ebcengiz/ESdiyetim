import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

/** İsteğe bağlı yuvarlak mint arka planlı ikon sarmalayıcı */
export const ModernIcon = ({
  name,
  size = 24,
  color = COLORS.primary,
  style,
  containerStyle,
  withBackground = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        withBackground && styles.containerBg,
        containerStyle,
      ]}
    >
      <Ionicons name={name} size={size} color={color} style={style} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.highlight,
  },
});

export default ModernIcon;
