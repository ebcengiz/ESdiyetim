import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { MEAL_FIELDS, MONTHS_TR } from '../../constants/dietPlanFields';
import { toDateStr } from '../../utils/dietPlanUtils';

/**
 * Geçmiş diyet planları sheet'i — arama, yıl/ay filtresi ve plan listesi.
 * Tüm veri/filtre state'i DietPlanScreen'de tutulur, burası sunum katmanıdır.
 */
export default function DietPlanHistorySheet({
  visible,
  onClose,
  allPlans,
  filteredPlans,
  historyLoading,
  searchQuery,
  onSearchQueryChange,
  filterYear,
  onFilterYearChange,
  filterMonth,
  onFilterMonthChange,
  availableYears,
  selectedDate,
  onSelectPlanDate,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { height: '92%' }]}>
          <View style={modalStyles.handle} />

          {/* Başlık */}
          <View style={modalStyles.header}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: SIZES.sm }}>
              <Text style={modalStyles.title}>Geçmiş Planlar</Text>
              <Text style={modalStyles.subtitle}>{allPlans.length} plan kayıtlı</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Arama */}
          <View style={hist.searchBox}>
            <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
            <TextInput
              style={hist.searchInput}
              placeholder="Öğün içeriğinde ara..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={onSearchQueryChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchQueryChange('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Yıl filtresi */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hist.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: SIZES.containerPadding }}>
            <TouchableOpacity
              style={[hist.filterChip, filterYear === null && hist.filterChipActive]}
              onPress={() => { onFilterYearChange(null); onFilterMonthChange(null); }}
            >
              <Text style={[hist.filterChipText, filterYear === null && hist.filterChipTextActive]}>Tümü</Text>
            </TouchableOpacity>
            {availableYears.map((y) => (
              <TouchableOpacity
                key={y}
                style={[hist.filterChip, filterYear === y && hist.filterChipActive]}
                onPress={() => { onFilterYearChange(y); onFilterMonthChange(null); }}
              >
                <Text style={[hist.filterChipText, filterYear === y && hist.filterChipTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ay filtresi (yıl seçiliyse) */}
          {filterYear !== null && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hist.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: SIZES.containerPadding }}>
              <TouchableOpacity
                style={[hist.filterChip, filterMonth === null && hist.filterChipActive]}
                onPress={() => onFilterMonthChange(null)}
              >
                <Text style={[hist.filterChipText, filterMonth === null && hist.filterChipTextActive]}>Tüm Aylar</Text>
              </TouchableOpacity>
              {MONTHS_TR.map((name, idx) => {
                const hasPlans = allPlans.some((p) => {
                  const d = new Date(p.date);
                  return d.getFullYear() === filterYear && d.getMonth() === idx;
                });
                if (!hasPlans) return null;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[hist.filterChip, filterMonth === idx && hist.filterChipActive]}
                    onPress={() => onFilterMonthChange(idx)}
                  >
                    <Text style={[hist.filterChipText, filterMonth === idx && hist.filterChipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Sonuç sayısı */}
          <Text style={hist.resultCount}>
            {filteredPlans.length} plan gösteriliyor
          </Text>

          {/* Plan listesi */}
          {historyLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : filteredPlans.length === 0 ? (
            <View style={hist.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
              <Text style={hist.emptyText}>Bu kriterlere uygun plan yok</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SIZES.containerPadding, paddingBottom: 32 }}>
              {filteredPlans.map((plan) => {
                const d = new Date(plan.date);
                const meals = MEAL_FIELDS.filter((f) => plan[f.key]?.trim());
                const isSelected = toDateStr(d) === toDateStr(selectedDate);
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[hist.card, isSelected && hist.cardSelected]}
                    onPress={() => onSelectPlanDate(d)}
                    activeOpacity={0.75}
                  >
                    {/* Tarih */}
                    <View style={hist.cardTop}>
                      <View style={hist.dateWrap}>
                        <Text style={hist.dateDay}>{d.getDate()}</Text>
                        <Text style={hist.dateMonthYear}>
                          {d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: SIZES.md }}>
                        <Text style={hist.weekday}>
                          {d.toLocaleDateString('tr-TR', { weekday: 'long' })}
                        </Text>
                        <View style={hist.mealPills}>
                          {meals.map((f) => (
                            <View key={f.key} style={[hist.mealPill, { backgroundColor: f.color + '22' }]}>
                              <Ionicons name={f.icon} size={10} color={f.color} />
                              <Text style={[hist.mealPillText, { color: f.color }]}>{f.label}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      {plan.total_calories ? (
                        <View style={hist.kcalBadge}>
                          <Ionicons name="flame" size={11} color="#F59E0B" />
                          <Text style={hist.kcalText}>{plan.total_calories}</Text>
                          <Text style={hist.kcalUnit}>kcal</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Önizleme */}
                    {(plan.breakfast || plan.lunch || plan.dinner) ? (
                      <Text style={hist.preview} numberOfLines={1}>
                        {[plan.breakfast, plan.lunch, plan.dinner].filter(Boolean).join('  •  ')}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: SIZES.sm,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.containerPadding, paddingBottom: SIZES.sm,
  },
  title: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  subtitle: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
});

// ─── Geçmiş planlar sheet stilleri ───────────────────────────────────────────
const hist = StyleSheet.create({
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm,
    backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SIZES.sm, paddingVertical: 10, gap: SIZES.sm,
  },
  searchInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text },
  filterRow: { marginBottom: 6, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  filterChipText: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff' },
  resultCount: {
    fontSize: SIZES.small, color: COLORS.textSecondary, fontWeight: '600',
    paddingHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm, marginTop: 4,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  emptyText: { fontSize: SIZES.body, color: COLORS.textLight, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge,
    padding: SIZES.md, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small,
  },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  dateWrap: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.highlight, borderRadius: SIZES.radius,
    paddingVertical: 6,
  },
  dateDay: { fontSize: SIZES.h3, fontWeight: '800', color: COLORS.primary, lineHeight: 28 },
  dateMonthYear: { fontSize: 9, fontWeight: '700', color: COLORS.primary, opacity: 0.8, textTransform: 'uppercase' },
  weekday: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text, marginBottom: 4, textTransform: 'capitalize' },
  mealPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mealPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999,
  },
  mealPillText: { fontSize: 9, fontWeight: '700' },
  kcalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FEF3C7', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  kcalText: { fontSize: SIZES.small, fontWeight: '800', color: '#92400E' },
  kcalUnit: { fontSize: 10, color: '#92400E', fontWeight: '600' },
  preview: {
    fontSize: SIZES.small, color: COLORS.textSecondary,
    marginTop: SIZES.sm, paddingTop: SIZES.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, lineHeight: 18,
  },
});
