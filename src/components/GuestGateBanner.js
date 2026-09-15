import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../constants/theme';
import IconBadge from './ui/IconBadge';
import AppButton from './ui/AppButton';

/**
 * Misafir kullanıcıya hesap gerektiren özelliklerde gösterilir (App Store 5.1.1).
 */
export default function GuestGateBanner({ navigation, message }) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <IconBadge name="person-outline" size={48} style={styles.icon} />
      <Text style={styles.text} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {message}
      </Text>
      <AppButton
        title="Giriş yap veya kayıt ol"
        iconRight="arrow-forward"
        size="sm"
        onPress={() => navigation.navigate('Profile')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  icon: { marginBottom: SIZES.sm },
  text: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
});
