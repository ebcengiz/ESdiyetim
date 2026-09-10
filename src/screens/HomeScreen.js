import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { weightService, dietPlanService, tipsService, homeSummaryService, foodLogService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import GuestGateBanner from '../components/GuestGateBanner';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import { HomeStatsRow, FoodSummaryCard } from '../components/home/HomeStatsRow';
import { TodayDietSection, DailyTipSection, QuickActionsSection } from '../components/home/HomeSections';
import { KpiPill, HomeActionCta } from '../components/home/HomeWidgets';

const { width } = Dimensions.get('window');
const QUICK_ACTION_WIDTH = (width - SIZES.containerPadding * 2 - SIZES.md) / 2;

const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  const [latestWeight, setLatestWeight] = useState(null);
  const [todayDiet, setTodayDiet] = useState(null);
  const [randomTip, setRandomTip] = useState(null);
  const [dailySummary, setDailySummary] = useState({
    active_goals_count: 0,
    completed_goals_count: 0,
    meals_planned_count: 0,
    latest_weight: null,
  });
  const [todayFoodSummary, setTodayFoodSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  // Son yükleme zamanı — focus'ta 30sn içindeyse yeniden fetch etme
  const lastLoadRef = React.useRef(0);

  const loadData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastLoadRef.current < 30_000) return;
    lastLoadRef.current = now;

    setLoadingState(true);
    try {
      const today = toLocalDateString(new Date());

      if (!user) {
        const tip = await tipsService.getRandom();
        setRandomTip(tip);
        setLatestWeight(null);
        setTodayDiet(null);
        setTodayFoodSummary(null);
        return;
      }

      // Tüm istekleri paralel başlat
      const [tip, weight, diet, summary, foodSummary] = await Promise.allSettled([
        tipsService.getRandom(),
        weightService.getLatest(),
        dietPlanService.getByDate(today),
        homeSummaryService.getDailySummary(today),
        foodLogService.getDailySummary(today),
      ]);

      if (tip.status === 'fulfilled') setRandomTip(tip.value);
      if (weight.status === 'fulfilled') setLatestWeight(weight.value);
      if (diet.status === 'fulfilled') setTodayDiet(diet.value);
      if (foodSummary.status === 'fulfilled') setTodayFoodSummary(foodSummary.value);
      else setTodayFoodSummary(null);

      if (summary.status === 'fulfilled' && summary.value) {
        setDailySummary({
          active_goals_count: summary.value.active_goals_count ?? 0,
          completed_goals_count: summary.value.completed_goals_count ?? 0,
          meals_planned_count: summary.value.meals_planned_count ?? 0,
          latest_weight: summary.value.latest_weight ?? null,
        });
      }

      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      if (user) showToast('Veriler yüklenirken bir hata oluştu.', 'error');
    } finally {
      setLoadingState(false);
    }
  }, [user]);

  // İlk yükleme
  useEffect(() => { loadData(true); }, [loadData]);

  // Tab odağına gelince — 30sn cache'i varsa atlar
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const openMealCalorieOrPrompt = () => {
    if (!user) {
      showToast('Fotoğraftan kalori için giriş yapın veya hesap oluşturun.', 'info');
      return;
    }
    navigation.navigate('MealCalorie');
  };

  const openFoodLogOrPrompt = () => {
    if (!user) {
      showToast('Besin takibi için giriş yapın veya hesap oluşturun.', 'info');
      return;
    }
    navigation.navigate('FoodLog');
  };

  const headerTopPad = Math.max(insets.top, 12) + 16;
  const todayDateLabel = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const displayName = !user && isGuest
    ? 'Misafir'
    : user?.user_metadata?.full_name?.split(' ')?.[0] || 'Hoş Geldiniz';
  const completedMealsCount = todayDiet
    ? [todayDiet.breakfast, todayDiet.lunch, todayDiet.dinner].filter(Boolean).length
    : 0;
  const mealsCountDisplay = dailySummary.meals_planned_count || completedMealsCount;
  const goalsDisplayText = dailySummary.active_goals_count > 0
    ? `${dailySummary.active_goals_count} aktif`
    : dailySummary.completed_goals_count > 0
      ? `${dailySummary.completed_goals_count} tamam`
      : 'Hedef ekle';
  const lastUpdatedLabel = lastUpdatedAt
    ? `Son güncelleme: ${lastUpdatedAt.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`
    : 'Son güncelleme: -';

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      {/*
        Başlık ScrollView dışında: çekince / yenileyince üstte açılan alan yeşil kalır
        (ScrollView arka planı + durum çubuğu boşluğu birleşmez).
      */}
      <HomeHeroHeader
        headerTopPad={headerTopPad}
        displayName={displayName}
        todayDateLabel={todayDateLabel}
        user={user}
        isGuest={isGuest}
        navigation={navigation}
        todayDiet={todayDiet}
        loadingState={loadingState}
        latestWeight={latestWeight}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.content}>
          {!user && isGuest ? (
            <GuestGateBanner
              navigation={navigation}
              message="Diyet planı, kilo kaydı, fotoğraftan kalori ve kişisel hedefler hesabınıza bağlıdır. Sağlık ipuçları hesap olmadan kullanılabilir."
            />
          ) : null}

          <View style={styles.kpiStrip}>
            <KpiPill
              icon="calendar-clear-outline"
              label="Öğün"
              value={loadingState ? '...' : `${mealsCountDisplay}/3`}
              onPress={() => navigation.navigate('DietPlan')}
            />
            <KpiPill
              icon="water-outline"
              label="Hedef"
              value={loadingState ? '...' : goalsDisplayText}
              compact
              onPress={() => navigation.navigate('Goals')}
            />
          </View>
          <Text style={styles.lastUpdatedText}>{lastUpdatedLabel}</Text>

          <HomeStatsRow
            loadingState={loadingState}
            latestWeight={latestWeight}
            todayDiet={todayDiet}
            navigation={navigation}
          />

          {user && (
            <FoodSummaryCard
              loadingState={loadingState}
              todayFoodSummary={todayFoodSummary}
              onPress={openFoodLogOrPrompt}
            />
          )}

          <HomeActionCta
            icon="camera"
            title="Fotoğraftan kalori"
            subtitle={user ? 'Yemeğin fotoğrafıyla tahmini kcal alın' : 'Kullanmak için giriş yapın — dokunun'}
            user={user}
            onPress={openMealCalorieOrPrompt}
          />

          <HomeActionCta
            icon="nutrition-outline"
            iconBg="#E8724A1A"
            iconColor="#E8724A"
            title="Besin Takibi"
            subtitle={user ? 'Günlük kalori ve makro takibini başlat' : 'Kullanmak için giriş yapın — dokunun'}
            user={user}
            onPress={openFoodLogOrPrompt}
          />

          <TodayDietSection todayDiet={todayDiet} navigation={navigation} />
          <DailyTipSection randomTip={randomTip} loadingState={loadingState} navigation={navigation} />

          {loadingState ? (
            <View style={[styles.section, { marginTop: -4 }]}>
              <View style={styles.skeletonBlockLg} />
              <View style={styles.skeletonBlockMd} />
            </View>
          ) : null}

          <QuickActionsSection
            navigation={navigation}
            onOpenFoodLog={openFoodLogOrPrompt}
            itemWidth={QUICK_ACTION_WIDTH}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 120 : 110,
  },
  content: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.lg,
  },
  kpiStrip: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  lastUpdatedText: {
    marginTop: -2,
    marginBottom: SIZES.md,
    fontSize: SIZES.tiny,
    color: COLORS.textLight,
  },
  section: { marginBottom: SIZES.sectionSpacing },
  skeletonBlockLg: {
    width: '100%',
    height: 84,
    borderRadius: SIZES.radiusLarge,
    backgroundColor: COLORS.shimmer,
    marginBottom: SIZES.sm,
  },
  skeletonBlockMd: {
    width: '70%',
    height: 20,
    borderRadius: 999,
    backgroundColor: COLORS.shimmer,
  },
});
