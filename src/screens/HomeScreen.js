import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { weightService, dietPlanService, tipsService, homeSummaryService, foodLogService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import GuestGateBanner from '../components/GuestGateBanner';

const { width } = Dimensions.get('window');
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
  const heroEnterAnim = React.useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    Animated.timing(heroEnterAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [heroEnterAnim]);

  const heroAnimatedStyle = {
    opacity: heroEnterAnim,
    transform: [
      {
        translateY: heroEnterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      {/*
        Başlık ScrollView dışında: çekince / yenileyince üstte açılan alan yeşil kalır
        (ScrollView arka planı + durum çubuğu boşluğu birleşmez).
      */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={[styles.headerInner, { paddingTop: headerTopPad }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerOverline}>Günlük Sağlık Asistanın</Text>
              <Text style={styles.appName}>Merhaba, {displayName}</Text>
              <Text style={styles.userName}>{todayDateLabel}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarText}>
                  {!user && isGuest
                    ? 'M'
                    : user?.user_metadata?.full_name
                      ? user.user_metadata.full_name
                          .trim()
                          .split(' ')
                          .map(w => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : user?.email?.[0]?.toUpperCase() || '?'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Animated.View style={[styles.heroSummaryCard, heroAnimatedStyle]}>
            <View style={styles.heroSummaryTop}>
              <View style={styles.heroStatusBadge}>
                <Ionicons
                  name={todayDiet ? 'checkmark-circle' : 'time-outline'}
                  size={16}
                  color={COLORS.textOnPrimary}
                />
                <Text style={styles.heroStatusText}>
                  {todayDiet ? 'Bugünkü plan hazır' : 'Plan bekleniyor'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Goals')}
                style={styles.heroMiniAction}
                activeOpacity={0.75}
              >
                <Text style={styles.heroMiniActionText}>Hedefler</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textOnPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroMetricsRow}>
              <View style={styles.heroMetricCard}>
                <Text style={styles.heroMetricLabel}>Son kilo</Text>
                {loadingState ? (
                  <View style={styles.skeletonHeroLine} />
                ) : (
                  <Text style={styles.heroMetricValue}>
                    {latestWeight ? `${latestWeight.weight} kg` : '--'}
                  </Text>
                )}
              </View>
              <View style={styles.heroMetricDivider} />
              <View style={styles.heroMetricCard}>
                <Text style={styles.heroMetricLabel}>Kalori analizi</Text>
                {loadingState ? (
                  <View style={[styles.skeletonHeroLine, { width: '68%' }]} />
                ) : (
                  <Text style={styles.heroMetricValue}>{user ? 'Aktif' : 'Giriş gerekli'}</Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      </LinearGradient>

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

          {/* Stats Cards Row */}
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
                        name={todayDiet ? "checkmark-circle" : "help-circle"}
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

          {/* Günlük Kalori Özeti Kartı */}
          {user && (
            <TouchableOpacity
              style={styles.foodSummaryCard}
              onPress={openFoodLogOrPrompt}
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
          )}

          <TouchableOpacity
            style={[styles.calorieCta, !user && styles.calorieCtaGuest]}
            onPress={openMealCalorieOrPrompt}
            activeOpacity={0.82}
          >
            <View style={styles.calorieCtaIcon}>
              <Ionicons name="camera" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.calorieCtaText}>
              <Text style={styles.calorieCtaTitle}>Fotoğraftan kalori</Text>
              <Text style={styles.calorieCtaSub}>
                {user
                  ? 'Yemeğin fotoğrafıyla tahmini kcal alın'
                  : 'Kullanmak için giriş yapın — dokunun'}
              </Text>
            </View>
            <Ionicons
              name={user ? 'chevron-forward' : 'lock-closed-outline'}
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.calorieCta, !user && styles.calorieCtaGuest]}
            onPress={openFoodLogOrPrompt}
            activeOpacity={0.82}
          >
            <View style={[styles.calorieCtaIcon, { backgroundColor: '#E8724A1A' }]}>
              <Ionicons name="nutrition-outline" size={22} color="#E8724A" />
            </View>
            <View style={styles.calorieCtaText}>
              <Text style={styles.calorieCtaTitle}>Besin Takibi</Text>
              <Text style={styles.calorieCtaSub}>
                {user
                  ? 'Günlük kalori ve makro takibini başlat'
                  : 'Kullanmak için giriş yapın — dokunun'}
              </Text>
            </View>
            <Ionicons
              name={user ? 'chevron-forward' : 'lock-closed-outline'}
              size={20}
              color={COLORS.textLight}
            />
          </TouchableOpacity>

          {/* Today's Diet Section */}
          {todayDiet && (todayDiet.breakfast || todayDiet.lunch || todayDiet.dinner) && (
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
          )}

          {/* Daily Tip Section */}
          {!loadingState && randomTip && (
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
          )}

          {loadingState ? (
            <View style={[styles.section, { marginTop: -4 }]}>
              <View style={styles.skeletonBlockLg} />
              <View style={styles.skeletonBlockMd} />
            </View>
          ) : null}

          {/* Quick Actions */}
          <View style={styles.section}>
            <SectionHeader
              icon="sparkles-outline"
              title="Hızlı İşlemler"
              subtitle="Tek dokunuşla sık kullanılan adımlar"
            />
            <View style={styles.quickActionsGrid}>
              <QuickActionButton
                icon="restaurant-outline"
                label="Diyet Planı"
                color={COLORS.primary}
                onPress={() => navigation.navigate('DietPlan')}
              />
              <QuickActionButton
                icon="add-circle"
                label="Kilo Ekle"
                color={COLORS.primaryDark}
                onPress={() => navigation.navigate('WeightAndBMI')}
              />
              <QuickActionButton
                icon="bulb-outline"
                label="Tavsiyeler"
                color={COLORS.primaryMuted}
                onPress={() => navigation.navigate('Tips')}
              />
              <QuickActionButton
                icon="trophy-outline"
                label="Hedefler"
                color={COLORS.primaryLight}
                onPress={() => navigation.navigate('Goals')}
              />
              <QuickActionButton
                icon="nutrition-outline"
                label="Besin Takibi"
                color="#E8724A"
                onPress={openFoodLogOrPrompt}
              />
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Meal Item Component
const MealItem = ({ icon, label, text }) => (
  <View style={styles.mealItem}>
    <View style={styles.mealIconWrapper}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={styles.mealContent}>
      <Text style={styles.mealLabel}>{label}</Text>
      <Text style={styles.mealText} numberOfLines={2}>{text}</Text>
    </View>
  </View>
);

const KpiPill = ({ icon, label, value, compact, onPress }) => {
  const pressAnim = React.useRef(new Animated.Value(0)).current;

  const animateTo = (toValue) => {
    Animated.timing(pressAnim, {
      toValue,
      duration: 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const animatedStyle = {
    transform: [
      {
        scale: pressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.97],
        }),
      },
    ],
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.kpiPill, compact && styles.kpiPillCompact]}
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
      >
        <Ionicons name={icon} size={16} color={COLORS.primary} />
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue} numberOfLines={1}>{value}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SectionHeader = ({ icon, title, subtitle, actionText, onPress }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionTitleWrap}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={22} color={COLORS.text} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
    {actionText && onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>{actionText}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>
    ) : null}
  </View>
);

// Quick Action Button Component
const QuickActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    style={styles.quickActionBtn}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.quickActionGradient}>
      <View style={[styles.quickActionIconBubble, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  headerGradient: {
    width: '100%',
  },
  headerInner: {
    paddingBottom: 24,
    paddingHorizontal: SIZES.containerPadding,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 120 : 110,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
    fontSize: SIZES.h2,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerOverline: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    letterSpacing: 0.25,
    opacity: 0.9,
  },
  userName: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.92,
    marginTop: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  heroSummaryCard: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroStatusText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.tiny,
    fontWeight: '600',
  },
  heroMiniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  heroMiniActionText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.tiny,
    fontWeight: '700',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  heroMetricCard: {
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
    marginBottom: 4,
  },
  heroMetricValue: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  skeletonHeroLine: {
    height: 14,
    width: '56%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    marginTop: 2,
  },
  heroMetricDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
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
  kpiPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...SHADOWS.small,
  },
  kpiPillCompact: {
    paddingRight: 10,
  },
  kpiLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
  },
  kpiValue: {
    flex: 1,
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  foodSummaryCard: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  foodSummaryGradient: {
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  foodSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  foodSummaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodSummaryLabel: {
    fontSize: SIZES.small,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  foodSummaryKcal: {
    fontSize: SIZES.h3,
    fontWeight: '800',
    color: '#fff',
    marginTop: 1,
  },
  foodSummarySkeleton: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginTop: 4,
  },
  foodSummaryMacros: {
    flexDirection: 'row',
    gap: SIZES.sm,
    paddingTop: SIZES.xs,
  },
  foodSummaryMacroPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: SIZES.radius,
    paddingVertical: 6,
    alignItems: 'center',
  },
  foodSummaryMacroValue: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: '#fff',
  },
  foodSummaryMacroLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  calorieCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.sectionSpacing,
    gap: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  calorieCtaGuest: {
    opacity: 0.92,
    borderStyle: 'dashed',
  },
  calorieCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCtaText: {
    flex: 1,
  },
  calorieCtaTitle: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  calorieCtaSub: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statCard: {
    height: 140,
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  statGradient: {
    flex: 1,
    padding: SIZES.md,
    justifyContent: 'space-between',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
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
  statUnit: {
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
  },
  statEmpty: {
    fontSize: 28,
    color: COLORS.textOnPrimary,
    opacity: 0.5,
  },
  statSkeleton: {
    width: 52,
    height: 18,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  section: {
    marginBottom: SIZES.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    letterSpacing: -0.25,
    color: COLORS.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
  },
  seeAllText: {
    fontSize: SIZES.small,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modernCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.cardPadding,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  mealIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  mealContent: {
    flex: 1,
  },
  mealLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 2,
  },
  mealText: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tipCard: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  tipGradient: {
    padding: SIZES.cardPadding,
  },
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
  quickActionBtn: {
    width: (width - SIZES.containerPadding * 2 - SIZES.md) / 2,
    height: 112,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  quickActionGradient: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SIZES.md,
  },
  quickActionIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: SIZES.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
  },
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