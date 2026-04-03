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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { weightService, dietPlanService, tipsService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [latestWeight, setLatestWeight] = useState(null);
  const [todayDiet, setTodayDiet] = useState(null);
  const [randomTip, setRandomTip] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const weight = await weightService.getLatest();
      setLatestWeight(weight);

      const today = new Date().toISOString().split('T')[0];
      const diet = await dietPlanService.getByDate(today);
      setTodayDiet(diet);

      const tip = await tipsService.getRandom();
      setRandomTip(tip);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
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
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 16 }]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.appName}>ESdiyet</Text>
              {user?.user_metadata?.full_name && (
                <Text style={styles.userName}>{user.user_metadata.full_name}</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarText}>
                  {user?.user_metadata?.full_name
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
        </LinearGradient>

        <View style={styles.content}>
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

        </View>
      </ScrollView>
    </View>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: 30,
    paddingHorizontal: SIZES.containerPadding,
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
    marginBottom: SIZES.sectionSpacing,
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