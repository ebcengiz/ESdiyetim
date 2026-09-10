import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

export default function MealSection({ meal, logs, loading, onAdd, onDelete }) {
  const total = logs.reduce((s, l) => s + (l.calories || 0), 0);
  return (
    <View style={mealSec.wrap}>
      <View style={mealSec.header}>
        <View style={mealSec.titleRow}>
          <View style={mealSec.iconBubble}>
            <Ionicons name={meal.icon} size={18} color={COLORS.primary} />
          </View>
          <Text style={mealSec.title}>{meal.label}</Text>
        </View>
        <View style={mealSec.headerRight}>
          {total > 0 && <Text style={mealSec.totalKcal}>{Math.round(total)} kcal</Text>}
          <TouchableOpacity style={mealSec.addBtn} onPress={onAdd} activeOpacity={0.75}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && logs.length === 0 && (
        <View style={mealSec.skeleton} />
      )}

      {logs.map((log) => (
        <TouchableOpacity
          key={log.id}
          style={mealSec.logItem}
          onLongPress={() => onDelete(log.id)}
          activeOpacity={0.75}
          delayLongPress={400}
        >
          <View style={mealSec.logLeft}>
            <Text style={mealSec.logName} numberOfLines={1}>{log.food_name}</Text>
            <Text style={mealSec.logSub}>{log.amount_grams}{log.meal_type === 'drink' ? 'ml' : 'g'}</Text>
          </View>
          <View style={mealSec.logRight}>
            <Text style={mealSec.logKcal}>{Math.round(log.calories || 0)}</Text>
            <Text style={mealSec.logKcalUnit}>kcal</Text>
          </View>
          <TouchableOpacity
            style={mealSec.deleteBtn}
            onPress={() => onDelete(log.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.textLight} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {logs.length === 0 && !loading && (
        <TouchableOpacity style={mealSec.empty} onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.textLight} />
          <Text style={mealSec.emptyText}>Yiyecek ekle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const mealSec = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    marginHorizontal: SIZES.containerPadding,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
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
  iconBubble: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  totalKcal: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primary },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '60',
  },
  skeleton: {
    height: 42, backgroundColor: COLORS.shimmer,
    borderRadius: 8, margin: SIZES.md,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  logLeft: { flex: 1 },
  logName: { fontSize: SIZES.bodySmall, fontWeight: '600', color: COLORS.text },
  logSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 1 },
  logRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginRight: SIZES.sm },
  logKcal: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  logKcalUnit: { fontSize: SIZES.tiny, color: COLORS.textSecondary },
  deleteBtn: { padding: 4 },
  empty: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    padding: SIZES.md, opacity: 0.6,
  },
  emptyText: { fontSize: SIZES.small, color: COLORS.textLight },
});
