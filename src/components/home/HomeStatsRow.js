import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

/** Kilo + Bugün (diyet) istatistik kartları */
export function HomeStatsRow({ loadingState, latestWeight, todayDiet, navigation }) {
  return (
    <View style={styles.statsRow}>
      {/* Weight Card */}
      <TouchableOpacity
        style={[styles.statCard, { flex: 1 }]}
        onPress={() => navigation.navigate('WeightAndBMI')}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statGradient}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="fitness" size={24} color={COLORS.textOnPrimary} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Son Kilom</Text>
            {loadingState ? (
              <View style={styles.statSkeleton} />
            ) : latestWeight ? (
              <>
                <Text style={styles.statValue}>{latestWeight.weight}</Text>
                <Text style={styles.statUnit}>kg</Text>
              </>
            ) : (
              <Text style={styles.statEmpty}>--</Text>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Diet Card */}
      <TouchableOpacity
        style={[styles.statCard, { flex: 1 }]}
        onPress={() => navigation.navigate('DietPlan')}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statGradient}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="restaurant" size={24} color={COLORS.textOnPrimary} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Bugün</Text>
            {loadingState ? (
              <View style={styles.statSkeleton} />
            ) : (
              <>
                <Ionicons
                  name={todayDiet ? 'checkmark-circle' : 'help-circle'}
                  size={32}
                  color={COLORS.textOnPrimary}
                  style={{ marginVertical: 4 }}
                />
                <Text style={styles.statUnit}>
                  {todayDiet ? 'Planlandı' : 'Plan Yok'}
                </Text>
              </>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

/** "Bugün Yediklerim" günlük kalori/makro özet kartı */
export function FoodSummaryCard({ loadingState, todayFoodSummary, onPress }) {
  return (
    <TouchableOpacity
      style={styles.foodSummaryCard}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <LinearGradient
        colors={['#E8724A', '#f0955c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.foodSummaryGradient}
      >
        <View style={styles.foodSummaryTop}>
          <View style={styles.foodSummaryIconWrap}>
            <Ionicons name="nutrition" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.foodSummaryLabel}>Bugün Yediklerim</Text>
            {loadingState ? (
              <View style={styles.foodSummarySkeleton} />
            ) : (
              <Text style={styles.foodSummaryKcal}>
                {todayFoodSummary && todayFoodSummary.calories > 0
                  ? `${Math.round(todayFoodSummary.calories)} kcal`
                  : 'Henüz eklenmedi'}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </View>

        {todayFoodSummary && todayFoodSummary.calories > 0 && (
          <View style={styles.foodSummaryMacros}>
            {[
              { label: 'Protein', value: todayFoodSummary.protein, unit: 'g' },
              { label: 'Karb', value: todayFoodSummary.carbs, unit: 'g' },
              { label: 'Yağ', value: todayFoodSummary.fat, unit: 'g' },
            ].map((m) => (
              <View key={m.label} style={styles.foodSummaryMacroPill}>
                <Text style={styles.foodSummaryMacroValue}>{Math.round(m.value)}{m.unit}</Text>
                <Text style={styles.foodSummaryMacroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.lg },
  statCard: {
    height: 140,
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  statGradient: { flex: 1, padding: SIZES.md, justifyContent: 'space-between' },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statLabel: {
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
    marginRight: SIZES.xs,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginRight: SIZES.xs,
  },
  statUnit: { fontSize: SIZES.small, color: COLORS.textOnPrimary, opacity: 0.8 },
  statEmpty: { fontSize: 28, color: COLORS.textOnPrimary, opacity: 0.5 },
  statSkeleton: {
    width: 52,
    height: 18,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },

  foodSummaryCard: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  foodSummaryGradient: { padding: SIZES.md, gap: SIZES.sm },
  foodSummaryTop: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  foodSummaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodSummaryLabel: { fontSize: SIZES.small, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  foodSummaryKcal: { fontSize: SIZES.h3, fontWeight: '800', color: '#fff', marginTop: 1 },
  foodSummarySkeleton: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 4,
  },
  foodSummaryMacros: { flexDirection: 'row', gap: SIZES.sm, paddingTop: SIZES.xs },
  foodSummaryMacroPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: SIZES.radius,
    paddingVertical: 6,
    alignItems: 'center',
  },
  foodSummaryMacroValue: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },
  foodSummaryMacroLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});
