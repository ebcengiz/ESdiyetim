import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// Reusable Modern Icon Component
export const ModernIcon = ({ name, size = 24, color = COLORS.primary, style, containerStyle }) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name={name} size={size} color={color} style={style} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ModernIcon;
