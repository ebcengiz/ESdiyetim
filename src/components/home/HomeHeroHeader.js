import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';
import Skeleton from '../ui/Skeleton';

/** Kullanıcı baş harfleri (avatar) */
function initialsOf(user, isGuest) {
  if (!user && isGuest) return 'M';
  const name = user?.user_metadata?.full_name?.trim();
  if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return user?.email?.[0]?.toUpperCase() || '?';
}

/**
 * Ana Sayfa üst gradyan bölümü — karşılama, avatar ve günlük özet (3 metrik).
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
  metrics, // [{ label, value }] — 3 adet
}) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  const enterStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={[styles.inner, { paddingTop: headerTopPad }]}>
        <View style={styles.topRow}>
          <View style={styles.greeting}>
            <Text style={styles.overline} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              Günlük Sağlık Asistanın
            </Text>
            <Text style={styles.name} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
              Merhaba, {displayName}
            </Text>
            <Text style={styles.date} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {todayDateLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Profil"
            style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
          >
            <Text style={styles.avatarText}>{initialsOf(user, isGuest)}</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.summary, enterStyle]}>
          <View style={styles.summaryTop}>
            <View style={styles.statusChip}>
              <Ionicons name={todayDiet ? 'checkmark-circle' : 'time-outline'} size={16} color={COLORS.textOnPrimary} />
              <Text style={styles.statusText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                {todayDiet ? 'Bugünkü plan hazır' : 'Bugün için plan yok'}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('Goals')}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Hedefler"
              style={({ pressed }) => [styles.miniAction, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.miniActionText}>Hedefler</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textOnPrimary} />
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            {metrics.map((m, i) => (
              <React.Fragment key={m.label}>
                {i > 0 && <View style={styles.metricDivider} />}
                <View style={styles.metric}>
                  <Text style={styles.metricLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {m.label}
                  </Text>
                  {loadingState ? (
                    <Skeleton width="60%" height={14} style={styles.metricSkeleton} />
                  ) : (
                    <Text style={styles.metricValue} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                      {m.value}
                    </Text>
                  )}
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: { paddingBottom: SIZES.lg, paddingHorizontal: SIZES.containerPadding },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SIZES.md },
  greeting: { flex: 1 },
  overline: { fontSize: SIZES.tiny, color: whiteAlpha(0.9), letterSpacing: 0.25 },
  name: { fontSize: SIZES.h2, fontWeight: '800', color: COLORS.textOnPrimary, letterSpacing: -0.5, marginTop: 2 },
  date: { fontSize: SIZES.tiny, color: whiteAlpha(0.92), marginTop: 6 },
  avatar: {
    width: SIZES.minTouch,
    height: SIZES.minTouch,
    borderRadius: SIZES.minTouch / 2,
    backgroundColor: whiteAlpha(0.25),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: whiteAlpha(0.6),
  },
  avatarPressed: { backgroundColor: whiteAlpha(0.4) },
  avatarText: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.textOnPrimary },
  summary: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    backgroundColor: whiteAlpha(0.16),
    borderWidth: 1,
    borderColor: whiteAlpha(0.25),
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md, gap: SIZES.sm },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: whiteAlpha(0.18),
    borderRadius: SIZES.radiusFull,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  statusText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '600' },
  miniAction: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 32 },
  miniActionText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  metric: { flex: 1 },
  metricLabel: { fontSize: SIZES.tiny, color: whiteAlpha(0.8), marginBottom: 4 },
  metricValue: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  metricSkeleton: { backgroundColor: whiteAlpha(0.32), marginTop: 2 },
  metricDivider: { width: 1, height: 38, backgroundColor: whiteAlpha(0.3) },
});
