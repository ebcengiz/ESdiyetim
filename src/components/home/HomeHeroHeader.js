import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

/**
 * Ana Sayfa üst gradyan bölümü — karşılama, avatar ve günlük özet kartı.
 * Giriş animasyonunu kendi içinde yönetir (mount'ta bir kere fade+slide).
 */
export default function HomeHeroHeader({
  headerTopPad,
  displayName,
  todayDateLabel,
  user,
  isGuest,
  navigation,
  todayDiet,
  loadingState,
  latestWeight,
}) {
  const heroEnterAnim = useRef(new Animated.Value(0)).current;

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
  );
}

const styles = StyleSheet.create({
  headerGradient: { width: '100%' },
  headerInner: {
    paddingBottom: 24,
    paddingHorizontal: SIZES.containerPadding,
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
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
  avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.textOnPrimary },
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
  heroStatusText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '600' },
  heroMiniAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  heroMiniActionText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '700' },
  heroMetricsRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  heroMetricCard: { flex: 1 },
  heroMetricLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
    marginBottom: 4,
  },
  heroMetricValue: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  skeletonHeroLine: {
    height: 14,
    width: '56%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    marginTop: 2,
  },
  heroMetricDivider: { width: 1, height: 38, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
});
