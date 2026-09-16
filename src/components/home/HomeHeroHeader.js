import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';
import { HeroHeader } from '../ui';
import Skeleton from '../ui/Skeleton';

/** Kullanıcı baş harfleri (avatar) */
function initialsOf(user, isGuest) {
  if (!user && isGuest) return 'M';
  const name = user?.user_metadata?.full_name?.trim();
  if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return user?.email?.[0]?.toUpperCase() || '?';
}

/**
 * Ana Sayfa üst bölümü — HeroHeader üstünde: "Merhaba, Ad" + tarih (meta) + avatar (sağ)
 * ve günlük özet şeridi (durum + 3 metrik). Overline sloganı ve "Hedefler ›" linki kaldırıldı;
 * ikisi de içerikte/tab bar'da zaten var. Giriş animasyonu mount'ta bir kere fade+slide.
 */
export default function HomeHeroHeader({
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

  const avatar = (
    <Pressable
      onPress={() => navigation.navigate('Profile')}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Profil"
      style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
    >
      <Text style={styles.avatarText}>{initialsOf(user, isGuest)}</Text>
    </Pressable>
  );

  return (
    <HeroHeader title={`Merhaba, ${displayName}`} meta={todayDateLabel} right={avatar}>
      <Animated.View style={[styles.summary, enterStyle]}>
        <View style={styles.statusRow}>
          <Ionicons name={todayDiet ? 'checkmark-circle' : 'time-outline'} size={15} color={COLORS.textOnPrimary} />
          <Text style={styles.statusText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {todayDiet ? 'Bugünkü plan hazır' : 'Bugün için plan yok'}
          </Text>
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
    </HeroHeader>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: SIZES.radiusLarge,
    paddingVertical: SIZES.sm + 4,
    paddingHorizontal: SIZES.md,
    backgroundColor: whiteAlpha(0.16),
    borderWidth: 1,
    borderColor: whiteAlpha(0.25),
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SIZES.sm + 2 },
  statusText: { color: whiteAlpha(0.95), fontSize: SIZES.tiny, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  metric: { flex: 1 },
  metricLabel: { fontSize: SIZES.tiny, color: whiteAlpha(0.8), marginBottom: 2 },
  metricValue: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  metricSkeleton: { backgroundColor: whiteAlpha(0.32), marginTop: 2 },
  metricDivider: { width: 1, height: 32, backgroundColor: whiteAlpha(0.3) },
});
