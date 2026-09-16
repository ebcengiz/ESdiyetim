import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';
import Skeleton from '../ui/Skeleton';
import IconBadge from '../ui/IconBadge';

/** Yeşil gradyan stat kartı (Kilo / Bugün) */
function StatCard({ colors, icon, label, onPress, accessibilityLabel, children }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statGradient}>
        <IconBadge name={icon} tone="glass" size={44} />
        <View>
          <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
          {children}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Kilo + Bugün (diyet) istatistik kartları */
export function HomeStatsRow({ loadingState, latestWeight, todayDiet, navigation }) {
  return (
    <View style={styles.statsRow}>
      <StatCard
        colors={[COLORS.primary, COLORS.primaryLight]}
        icon="fitness"
        label="Son Kilom"
        onPress={() => navigation.navigate('WeightAndBMI')}
        accessibilityLabel={`Son kilo ${latestWeight ? latestWeight.weight + ' kilogram' : 'kayıt yok'}`}
      >
        {loadingState ? (
          <Skeleton width={52} height={18} style={styles.statSkeleton} />
        ) : latestWeight ? (
          <View style={styles.valueRow}>
            <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{latestWeight.weight}</Text>
            <Text style={styles.statUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>kg</Text>
          </View>
        ) : (
          <Text style={styles.statEmpty}>Kayıt ekle</Text>
        )}
      </StatCard>

      <StatCard
        colors={[COLORS.primaryDark, COLORS.primary]}
        icon="restaurant"
        label="Bugün"
        onPress={() => navigation.navigate('DietPlan')}
        accessibilityLabel={`Bugünkü plan ${todayDiet ? 'hazır' : 'yok'}`}
      >
        {loadingState ? (
          <Skeleton width={52} height={18} style={styles.statSkeleton} />
        ) : (
          <View style={styles.valueRow}>
            <Ionicons name={todayDiet ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={COLORS.textOnPrimary} />
            <Text style={styles.statUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>{todayDiet ? 'Planlandı' : 'Plan oluştur'}</Text>
          </View>
        )}
      </StatCard>
    </View>
  );
}

/** "Bugün Yediklerim" günlük kalori/makro özet kartı */
export function FoodSummaryCard({ loadingState, todayFoodSummary, onPress }) {
  const hasData = todayFoodSummary && todayFoodSummary.calories > 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.foodCard, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Bugün yediklerim, ${hasData ? Math.round(todayFoodSummary.calories) + ' kalori' : 'henüz eklenmedi'}`}
    >
      <LinearGradient
        colors={[COLORS.accents.coral, COLORS.accents.amber]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.foodGradient}
      >
        <View style={styles.foodTop}>
          <IconBadge name="nutrition" tone="glass" size={40} />
          <View style={styles.flex}>
            <Text style={styles.foodLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>Bugün Yediklerim</Text>
            {loadingState ? (
              <Skeleton width={80} height={16} style={styles.foodSkeleton} />
            ) : (
              <Text style={styles.foodKcal} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {hasData ? `${Math.round(todayFoodSummary.calories)} kcal` : 'Henüz eklenmedi'}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={whiteAlpha(0.7)} />
        </View>

        {hasData && (
          <View style={styles.macros}>
            {[
              { label: 'Protein', value: todayFoodSummary.protein },
              { label: 'Karb', value: todayFoodSummary.carbs },
              { label: 'Yağ', value: todayFoodSummary.fat },
            ].map((m) => (
              <View key={m.label} style={styles.macroPill}>
                <Text style={styles.macroValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{Math.round(m.value)}g</Text>
                <Text style={styles.macroLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  statsRow: { flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.md },
  statCard: { flex: 1, height: 136, borderRadius: SIZES.radiusLarge, overflow: 'hidden', ...SHADOWS.medium },
  statGradient: { flex: 1, padding: SIZES.md, justifyContent: 'space-between' },
  statLabel: { fontSize: SIZES.small, color: whiteAlpha(0.9), marginBottom: 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs, flexWrap: 'wrap' },
  statValue: { fontSize: 30, fontWeight: '700', color: COLORS.textOnPrimary },
  statUnit: { fontSize: SIZES.small, color: whiteAlpha(0.85), fontWeight: '600' },
  statEmpty: { fontSize: SIZES.bodySmall, color: whiteAlpha(0.85), fontWeight: '600' },
  statSkeleton: { backgroundColor: whiteAlpha(0.32), marginTop: 6 },

  foodCard: { borderRadius: SIZES.radiusLarge, overflow: 'hidden', marginBottom: SIZES.md, ...SHADOWS.medium },
  foodGradient: { padding: SIZES.md, gap: SIZES.sm },
  foodTop: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  foodLabel: { fontSize: SIZES.small, color: whiteAlpha(0.85), fontWeight: '600' },
  foodKcal: { fontSize: SIZES.h3, fontWeight: '800', color: COLORS.white, marginTop: 1 },
  foodSkeleton: { backgroundColor: whiteAlpha(0.28), marginTop: 4 },
  macros: { flexDirection: 'row', gap: SIZES.sm, paddingTop: SIZES.xs },
  macroPill: { flex: 1, backgroundColor: whiteAlpha(0.18), borderRadius: SIZES.radius, paddingVertical: 6, alignItems: 'center' },
  macroValue: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.white },
  macroLabel: { fontSize: SIZES.micro, color: whiteAlpha(0.75), marginTop: 1 },
});
