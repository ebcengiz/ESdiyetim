import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { AppCard, SectionHeader, IconBadge } from '../ui';
import { MealItem, QuickActionButton } from './HomeWidgets';

/** "Bugünün Diyetim" — kahvaltı/öğle/akşam öğün özeti */
export function TodayDietSection({ todayDiet, navigation }) {
  if (!todayDiet || !(todayDiet.breakfast || todayDiet.lunch || todayDiet.dinner)) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Bugünün Diyetim"
        subtitle="Planlanan öğünlerini takip et"
        actionLabel="Detay"
        onAction={() => navigation.navigate('DietPlan')}
      />
      <AppCard>
        {todayDiet.breakfast && <MealItem icon="sunny" label="Kahvaltı" text={todayDiet.breakfast} />}
        {todayDiet.lunch && <MealItem icon="partly-sunny" label="Öğle" text={todayDiet.lunch} />}
        {todayDiet.dinner && <MealItem icon="moon" label="Akşam" text={todayDiet.dinner} />}
      </AppCard>
    </View>
  );
}

/** "Günün Tavsiyesi" — rastgele sağlık ipucu kartı */
export function DailyTipSection({ randomTip, loadingState, navigation }) {
  if (loadingState || !randomTip) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Günün Tavsiyesi"
        subtitle="Kısa, uygulanabilir sağlık önerisi"
        actionLabel="Tümü"
        onAction={() => navigation.navigate('Tips')}
      />
      <Pressable
        style={({ pressed }) => [styles.tipCard, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Tips')}
        accessibilityRole="button"
        accessibilityLabel={`Günün tavsiyesi: ${randomTip.title}`}
      >
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tipGradient}>
          <IconBadge name="sparkles" tone="glass" size={48} style={styles.tipIcon} />
          <Text style={styles.tipTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{randomTip.title}</Text>
          <Text style={styles.tipContent} numberOfLines={3} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {randomTip.content}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const QUICK_ACTIONS = [
  { key: 'DietPlan', icon: 'restaurant-outline', label: 'Diyet Planı', color: COLORS.primary },
  { key: 'WeightAndBMI', icon: 'add-circle', label: 'Kilo Ekle', color: COLORS.primaryDark },
  { key: 'Tips', icon: 'bulb-outline', label: 'Tavsiyeler', color: COLORS.accents.amber },
  { key: 'Goals', icon: 'trophy-outline', label: 'Hedefler', color: COLORS.accents.indigo },
];

/** "Hızlı İşlemler" — 2 sütunlu kısayol grid'i (genişlik ekran boyutuna göre) */
export function QuickActionsSection({ navigation }) {
  const { columnWidth } = useResponsive();
  const width = columnWidth(2);
  return (
    <View style={styles.section}>
      <SectionHeader title="Hızlı İşlemler" subtitle="Tek dokunuşla sık kullanılan adımlar" />
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((a) => (
          <QuickActionButton
            key={a.key}
            style={{ width }}
            icon={a.icon}
            label={a.label}
            color={a.color}
            onPress={() => navigation.navigate(a.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SIZES.sectionSpacing },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  tipCard: { borderRadius: SIZES.radiusLarge, overflow: 'hidden', ...SHADOWS.medium },
  tipGradient: { padding: SIZES.cardPadding },
  tipIcon: { marginBottom: SIZES.md },
  tipTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.textOnPrimary, marginBottom: SIZES.sm },
  tipContent: { fontSize: SIZES.bodySmall, color: COLORS.textOnPrimary, lineHeight: 22, opacity: 0.95 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.md },
});
