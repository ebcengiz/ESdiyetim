import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { weightService, dietPlanService, tipsService, homeSummaryService, foodLogService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useResponsive } from '../hooks/useResponsive';
import { ScreenContainer, SectionHeader, LoadingState } from '../components/ui';
import GuestGateBanner from '../components/GuestGateBanner';
import HomeHeroHeader from '../components/home/HomeHeroHeader';
import { HomeStatsRow, FoodSummaryCard } from '../components/home/HomeStatsRow';
import { TodayDietSection, DailyTipSection, QuickActionsSection } from '../components/home/HomeSections';
import { HomeActionCta } from '../components/home/HomeWidgets';

const toLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeScreen({ navigation }) {
  const { topPad } = useResponsive();
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  const { handleError } = useAppError();
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
    } catch (error) {
      // Misafirde sessiz (yalnızca ipucu yükleniyor); kullanıcıda toast + Tekrar dene
      handleError(error, { context: 'home.load', silent: !user, onRetry: () => loadData(true) });
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

  // Hero özet — tek yerde 3 metrik (eski KPI hap şeridi + hero metrikleri birleştirildi)
  const heroMetrics = [
    { label: 'Son kilo', value: latestWeight ? `${latestWeight.weight} kg` : '--' },
    { label: 'Öğün', value: user ? `${mealsCountDisplay}/3` : '--' },
    { label: 'Hedef', value: user ? goalsDisplayText : 'Giriş gerekli' },
  ];

  const hero = (
    <HomeHeroHeader
      headerTopPad={topPad}
      displayName={displayName}
      todayDateLabel={todayDateLabel}
      user={user}
      isGuest={isGuest}
      navigation={navigation}
      todayDiet={todayDiet}
      loadingState={loadingState}
      metrics={heroMetrics}
    />
  );

  return (
    // Başlık ScrollView dışında (header prop): çekince/yenileyince üstte açılan alan yeşil kalır.
    <ScreenContainer
      tab
      edges={[]}
      header={hero}
      backgroundColor={COLORS.primary}
      refreshing={refreshing}
      onRefresh={onRefresh}
      scrollProps={{ style: styles.scroll }}
      contentContainerStyle={styles.content}
    >
      {!user && isGuest ? (
        <GuestGateBanner
          navigation={navigation}
          message="Diyet planı, kilo kaydı, fotoğraftan kalori ve kişisel hedefler hesabınıza bağlıdır. Sağlık ipuçları hesap olmadan kullanılabilir."
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Bugün" subtitle="Kilo, plan ve beslenme özetin" />
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
      </View>

      <View style={styles.section}>
        <SectionHeader title="Araçlar" subtitle="Yapay zeka destekli yardımcılar" />
        <HomeActionCta
          icon="camera"
          title="Fotoğraftan kalori"
          subtitle={user ? 'Yemeğin fotoğrafıyla tahmini kcal alın' : 'Kullanmak için giriş yapın'}
          user={user}
          onPress={openMealCalorieOrPrompt}
        />
        <HomeActionCta
          icon="nutrition-outline"
          color={COLORS.accents.coral}
          title="Besin Takibi"
          subtitle={user ? 'Günlük kalori ve makro takibini başlat' : 'Kullanmak için giriş yapın'}
          user={user}
          onPress={openFoodLogOrPrompt}
        />
      </View>

      <TodayDietSection todayDiet={todayDiet} navigation={navigation} />
      <DailyTipSection randomTip={randomTip} loadingState={loadingState} navigation={navigation} />
      {loadingState ? <LoadingState variant="card" style={styles.section} /> : null}

      <QuickActionsSection navigation={navigation} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingTop: SIZES.lg },
  section: { marginBottom: SIZES.sectionSpacing },
});
