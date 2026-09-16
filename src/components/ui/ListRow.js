import React from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../../constants/theme';
import IconBadge from './IconBadge';

/**
 * Ayar/menü satırı — ikon rozeti + başlık + alt metin + sağda ok / anahtar / özel öğe.
 * Bir AppCard içinde üst üste dizilir; `last` verilmezse altına ayırıcı çizer.
 *
 *   <ListRow icon="trophy-outline" title="Hedeflerim" onPress={...} />
 *   <ListRow icon="hardware-chip-outline" title="AI veri paylaşımı" subtitle="…" switchValue={on} onSwitch={setOn} />
 */
export default function ListRow({
  icon,
  iconColor = COLORS.primary,
  title,
  subtitle,
  value,            // sağda kısa metin (ör. "Aktif")
  valueColor,
  onPress,
  switchValue,
  onSwitch,
  right,            // özel sağ öğe
  destructive = false,
  last = false,
  disabled = false,
  accessibilityLabel,
}) {
  const hasSwitch = typeof onSwitch === 'function';
  const Container = onPress && !hasSwitch ? Pressable : View;
  const titleColor = destructive ? COLORS.error : COLORS.text;

  return (
    <Container
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={onPress && !hasSwitch ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={onPress && !hasSwitch ? subtitle : undefined}
      style={onPress && !hasSwitch ? ({ pressed }) => [styles.row, !last && styles.border, pressed && styles.pressed] : [styles.row, !last && styles.border]}
    >
      {!!icon && <IconBadge name={icon} color={destructive ? COLORS.error : iconColor} size={36} shape="rounded" />}
      <View style={styles.texts}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!value && (
        <Text style={[styles.value, valueColor && { color: valueColor }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {value}
        </Text>
      )}
      {right}
      {hasSwitch ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitch}
          disabled={disabled}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.white}
          accessibilityLabel={title}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm + 4, minHeight: 56, paddingVertical: SIZES.sm + 2 },
  border: { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pressed: { opacity: 0.6 },
  texts: { flex: 1 },
  title: { fontSize: SIZES.bodySmall, fontWeight: '600' },
  subtitle: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  value: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, maxWidth: '40%' },
});
