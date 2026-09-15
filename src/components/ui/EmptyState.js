import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, TYPOGRAPHY, MAX_FONT_SCALE } from '../../constants/theme';
import IconBadge from './IconBadge';
import AppButton from './AppButton';

/**
 * Boş durum — "Henüz kayıt yok" ekranlarının ortak hali (6 dosyadaki kopyaların yerine).
 *
 *   <EmptyState icon="scale-outline" title="Henüz kilo kaydı yok"
 *               message="İlk kaydını ekle, grafiğin burada oluşsun."
 *               actionLabel="Kilo ekle" onAction={openForm} />
 */
export default function EmptyState({
  icon = 'leaf-outline',
  iconColor = COLORS.primary,
  title,
  message,
  actionLabel,
  onAction,
  actionIcon = 'add',
  compact = false,
  style,
  children,
}) {
  return (
    <View style={[styles.wrap, compact && styles.compact, style]} accessibilityRole="summary">
      <IconBadge name={icon} color={iconColor} size={compact ? 56 : 80} />
      {!!title && (
        <Text style={[styles.title, compact && styles.titleCompact]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
      )}
      {!!message && (
        <Text style={styles.message} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {message}
        </Text>
      )}
      {children}
      {!!onAction && (
        <AppButton title={actionLabel} onPress={onAction} icon={actionIcon} size={compact ? 'sm' : 'md'} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: SIZES.xl + SIZES.md, paddingHorizontal: SIZES.lg },
  compact: { paddingVertical: SIZES.lg },
  title: { ...TYPOGRAPHY.sectionTitle, fontSize: SIZES.h4, textAlign: 'center', marginTop: SIZES.md },
  titleCompact: { fontSize: SIZES.h5 },
  message: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SIZES.sm, maxWidth: 300 },
  button: { marginTop: SIZES.lg },
});
