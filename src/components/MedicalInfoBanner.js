import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

/**
 * App Store 1.4.1: Sağlık içeriğinde tıbbi olmayan bilgilendirme ve uzmana danışma hatırlatması.
 */
export default function MedicalInfoBanner({ title = 'Bilgilendirme', children, style }) {
  return (
    <View style={[styles.banner, style]} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    padding: SIZES.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: SIZES.small,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  body: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
