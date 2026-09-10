import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

export function SectionTitle({ label }) {
  return (
    <View style={sec.titleRow}>
      <View style={sec.titleLine} />
      <Text style={sec.titleText}>{label}</Text>
      <View style={sec.titleLine} />
    </View>
  );
}

export default function MealCard({ meal, value, loading, onPress }) {
  const filled = !!value?.trim();
  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[card.iconBubble, { backgroundColor: meal.color + '1A' }]}>
        <Ionicons name={meal.icon} size={20} color={meal.color} />
      </View>
      <View style={card.body}>
        <Text style={card.label}>{meal.label}</Text>
        {loading ? (
          <View style={card.skeleton} />
        ) : filled ? (
          <Text style={card.content} numberOfLines={2}>{value}</Text>
        ) : (
          <Text style={card.empty}>Eklemek için dokunun</Text>
        )}
      </View>
      <View style={[card.statusDot, { backgroundColor: filled ? '#22C55E' : COLORS.border }]} />
    </TouchableOpacity>
  );
}

// Bölüm başlığı
const sec = StyleSheet.create({
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SIZES.containerPadding,
    marginTop: SIZES.md, marginBottom: SIZES.sm, gap: SIZES.sm,
  },
  titleLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  titleText: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
});

// Öğün kartı
const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge, padding: SIZES.md,
    marginHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm,
    gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  iconBubble: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  body: { flex: 1 },
  label: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  content: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  empty: { fontSize: SIZES.small, color: COLORS.textLight, fontStyle: 'italic' },
  skeleton: { height: 12, width: '60%', borderRadius: 6, backgroundColor: COLORS.shimmer },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
