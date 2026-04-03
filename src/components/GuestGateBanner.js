import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

/**
 * Misafir kullanıcıya hesap gerektiren özelliklerde gösterilir (App Store 5.1.1).
 */
export default function GuestGateBanner({ navigation, message }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="person-outline" size={22} color={COLORS.primary} />
      </View>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>Giriş yap veya kayıt ol</Text>
        <Ionicons name="arrow-forward" size={18} color={COLORS.textOnPrimary} />
      </TouchableOpacity>
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  text: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.sm + 2,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMedium,
  },
  btnText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
});
