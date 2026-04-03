import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { weightService, dietPlanService, tipsService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import GuestGateBanner from '../components/GuestGateBanner';
import HealthSourcesCard from '../components/HealthSourcesCard';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const [latestWeight, setLatestWeight] = useState(null);
  const [todayDiet, setTodayDiet] = useState(null);
  const [randomTip, setRandomTip] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const tip = await tipsService.getRandom();
      setRandomTip(tip);

      if (!user) {
        setLatestWeight(null);
        setTodayDiet(null);
        return;
      }

      const weight = await weightService.getLatest();
      setLatestWeight(weight);

      const today = new Date().toISOString().split('T')[0];
      const diet = await dietPlanService.getByDate(today);
      setTodayDiet(diet);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      if (user) {
        Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openMealCalorieOrPrompt = () => {
    if (!user) {
      Alert.alert(
        'Giriş gerekli',
        'Fotoğraftan kalori tahmini için hesap oluşturun veya giriş yapın.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Profil', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }
    navigation.navigate('MealCalorie');
  };

  const headerTopPad = Math.max(insets.top, 12) + 16;

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
              <Text style={styles.appName}>ESdiyet</Text>
              {!user && isGuest ? (
                <Text style={styles.userName}>Misafir</Text>
              ) : user?.user_metadata?.full_name ? (
                <Text style={styles.userName}>{user.user_metadata.full_name}</Text>
              ) : null}
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
                  {latestWeight ? (
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
                  <Ionicons
                    name={todayDiet ? "checkmark-circle" : "help-circle"}
                    size={32}
                    color={COLORS.textOnPrimary}
                    style={{ marginVertical: 4 }}
                  />
                  <Text style={styles.statUnit}>
                    {todayDiet ? 'Planlandı' : 'Plan Yok'}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

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

          {/* Today's Diet Section */}
          {todayDiet && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="restaurant-outline" size={24} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Bugünün Diyetim</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('DietPlan')}>
                  <View style={styles.seeAllButton}>
                    <Text style={styles.seeAllText}>Detay</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              </View>
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
          {randomTip && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="bulb" size={24} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Günün Tavsiyesi</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Tips')}>
                  <View style={styles.seeAllButton}>
                    <Text style={styles.seeAllText}>Tümü</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>
              </View>
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

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="grid" size={24} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
            </View>
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
            </View>
          </View>

          {/* App Store 1.4.1: ana sayfadaki tavsiye metni için uygulama içi kaynak bağlantıları */}
          <HealthSourcesCard variant="tips" style={{ marginTop: SIZES.md }} />
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

// Quick Action Button Component
const QuickActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    style={styles.quickActionBtn}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <LinearGradient
      colors={[color, `${color}DD`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.quickActionGradient}
    >
      <Ionicons name={icon} size={32} color={COLORS.textOnPrimary} />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </LinearGradient>
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
    paddingBottom: 30,
    paddingHorizontal: SIZES.containerPadding,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
    fontSize: SIZES.h1,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    letterSpacing: -0.8,
  },
  userName: {
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
    marginTop: 4,
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
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  content: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.md,
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
    alignItems: 'baseline',
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
  section: {
    marginBottom: SIZES.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    letterSpacing: -0.35,
    color: COLORS.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    height: 100,
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  quickActionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  quickActionLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
});