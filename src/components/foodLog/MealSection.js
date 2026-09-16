import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, HIT_SLOP, MAX_FONT_SCALE } from '../../constants/theme';
import { IconBadge, Skeleton } from '../ui';

/** Öğün bölümü — başlık (toplam kcal + ekle), kayıt satırları (açık sil butonu), boş durum */
export default function MealSection({ meal, logs, loading, onAdd, onDelete }) {
  const total = logs.reduce((sum, l) => sum + (l.calories || 0), 0);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <IconBadge name={meal.icon} size={32} iconSize={17} shape="rounded" />
          <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE}>{meal.label}</Text>
        </View>
        <View style={styles.headerRight}>
          {total > 0 && <Text style={styles.total} maxFontSizeMultiplier={MAX_FONT_SCALE}>{Math.round(total)} kcal</Text>}
          <Pressable
            onPress={onAdd}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`${meal.label} için yiyecek ekle`}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>

      {loading && logs.length === 0 && (
        <View style={styles.skeletonRow}>
          <Skeleton width="55%" height={14} />
          <Skeleton width={48} height={14} />
        </View>
      )}

      {logs.map((log) => (
        <View key={log.id} style={styles.logItem} accessibilityLabel={`${log.food_name}, ${log.amount_grams}${log.meal_type === 'drink' ? ' mililitre' : ' gram'}, ${Math.round(log.calories || 0)} kalori`}>
          <View style={styles.logLeft}>
            <Text style={styles.logName} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{log.food_name}</Text>
            <Text style={styles.logSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {log.amount_grams}{log.meal_type === 'drink' ? ' ml' : ' g'}
            </Text>
          </View>
          <View style={styles.logRight}>
            <Text style={styles.logKcal} maxFontSizeMultiplier={MAX_FONT_SCALE}>{Math.round(log.calories || 0)}</Text>
            <Text style={styles.logKcalUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>kcal</Text>
          </View>
          <Pressable
            onPress={() => onDelete(log.id)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`${log.food_name} kaydını sil`}
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={15} color={COLORS.textLight} />
          </Pressable>
        </View>
      ))}

      {logs.length === 0 && !loading && (
        <Pressable
          style={({ pressed }) => [styles.empty, pressed && styles.pressed]}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`${meal.label} için yiyecek ekle`}
        >
          <Ionicons name="add-circle-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.emptyText} maxFontSizeMultiplier={MAX_FONT_SCALE}>Yiyecek ekle</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  pressed: { opacity: 0.6 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  title: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  total: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primary },
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center' },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between', padding: SIZES.md },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.divider, minHeight: 52 },
  logLeft: { flex: 1 },
  logName: { fontSize: SIZES.bodySmall, fontWeight: '600', color: COLORS.text },
  logSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 1 },
  logRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginRight: SIZES.sm },
  logKcal: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  logKcalUnit: { fontSize: SIZES.tiny, color: COLORS.textSecondary },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  empty: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, padding: SIZES.md, minHeight: SIZES.minTouch },
  emptyText: { fontSize: SIZES.small, color: COLORS.textLight },
});
