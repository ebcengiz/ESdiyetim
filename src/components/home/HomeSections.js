import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { MealItem, SectionHeader, QuickActionButton } from './HomeWidgets';

/** "Bugünün Diyetim" — kahvaltı/öğle/akşam öğün özeti */
export function TodayDietSection({ todayDiet, navigation }) {
  if (!todayDiet || !(todayDiet.breakfast || todayDiet.lunch || todayDiet.dinner)) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon="restaurant-outline"
        title="Bugünün Diyetim"
        subtitle="Planlanan öğünlerini takip et"
        actionText="Detay"
        onPress={() => navigation.navigate('DietPlan')}
      />
      <View style={styles.modernCard}>
        {todayDiet.breakfast && (
          <MealItem icon="sunny" label="Kahvaltı" text={todayDiet.breakfast} />
        )}
        {todayDiet.lunch && (
          <MealItem icon="partly-sunny" label="Öğle" text={todayDiet.lunch} />
        )}
        {todayDiet.dinner && (
          <MealItem icon="moon" label="Akşam" text={todayDiet.dinner} />
        )}
      </View>
    </View>
  );
}

/** "Günün Tavsiyesi" — rastgele sağlık ipucu kartı */
export function DailyTipSection({ randomTip, loadingState, navigation }) {
  if (loadingState || !randomTip) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon="bulb"
        title="Günün Tavsiyesi"
        subtitle="Kısa, uygulanabilir sağlık önerisi"
        actionText="Tümü"
        onPress={() => navigation.navigate('Tips')}
      />
      <TouchableOpacity
        style={styles.tipCard}
        onPress={() => navigation.navigate('Tips')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipGradient}
        >
          <View style={styles.tipIconBadge}>
            <Ionicons name="sparkles" size={24} color={COLORS.textOnPrimary} />
          </View>
          <Text style={styles.tipTitle}>{randomTip.title}</Text>
          <Text style={styles.tipContent} numberOfLines={3}>
            {randomTip.content}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

/** "Hızlı İşlemler" — 2 sütunlu kısayol grid'i */
export function QuickActionsSection({ navigation, onOpenFoodLog, itemWidth }) {
  return (
    <View style={styles.section}>
      <SectionHeader
        icon="sparkles-outline"
        title="Hızlı İşlemler"
        subtitle="Tek dokunuşla sık kullanılan adımlar"
      />
      <View style={styles.quickActionsGrid}>
        <QuickActionButton
          style={{ width: itemWidth }}
          icon="restaurant-outline"
          label="Diyet Planı"
          color={COLORS.primary}
          onPress={() => navigation.navigate('DietPlan')}
        />
        <QuickActionButton
          style={{ width: itemWidth }}
          icon="add-circle"
          label="Kilo Ekle"
          color={COLORS.primaryDark}
          onPress={() => navigation.navigate('WeightAndBMI')}
        />
        <QuickActionButton
          style={{ width: itemWidth }}
          icon="bulb-outline"
          label="Tavsiyeler"
          color={COLORS.primaryMuted}
          onPress={() => navigation.navigate('Tips')}
        />
        <QuickActionButton
          style={{ width: itemWidth }}
          icon="trophy-outline"
          label="Hedefler"
          color={COLORS.primaryLight}
          onPress={() => navigation.navigate('Goals')}
        />
        <QuickActionButton
          style={{ width: itemWidth }}
          icon="nutrition-outline"
          label="Besin Takibi"
          color="#E8724A"
          onPress={onOpenFoodLog}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SIZES.sectionSpacing },
  modernCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  tipCard: { borderRadius: SIZES.radiusLarge, overflow: 'hidden', ...SHADOWS.medium },
  tipGradient: { padding: SIZES.cardPadding },
  tipIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  tipTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginBottom: SIZES.sm,
  },
  tipContent: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textOnPrimary,
    lineHeight: 22,
    opacity: 0.95,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginTop: SIZES.md,
  },
});
