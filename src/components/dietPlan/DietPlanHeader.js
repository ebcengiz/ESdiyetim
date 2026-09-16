import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { DateStepper, ProgressBar } from '../ui';

/** Yeşil gradyan üstü yuvarlak ikon butonu (geçmiş / sil) */
function HeaderIconButton({ icon, label, onPress, muted }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={18} color={muted ? whiteAlpha(0.75) : whiteAlpha(0.95)} />
    </Pressable>
  );
}

/**
 * Diyet planı başlığı — rozet, geçmiş/sil butonları, tarih adımlayıcı, ilerleme.
 */
export default function DietPlanHeader({
  user,
  plan,
  filledCount,
  totalFields,
  selectedDate,
  onDateChange,
  onOpenPicker,
  onOpenHistory,
  onDelete,
}) {
  const { topPad } = useResponsive();
  const progress = totalFields ? filledCount / totalFields : 0;

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: topPad - SIZES.xs }]}
    >
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Ionicons name="sparkles-outline" size={13} color={COLORS.white} />
          <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>AI destekli plan takibi</Text>
        </View>
        <View style={styles.actions}>
          {user && <HeaderIconButton icon="time-outline" label="Geçmiş planlar" onPress={onOpenHistory} />}
          {user && plan && <HeaderIconButton icon="trash-outline" label="Planı sil" onPress={onDelete} muted />}
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>Diyet Planlarım</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE}>Günlük öğünlerini planla ve takip et.</Text>

      <DateStepper date={selectedDate} onChange={onDateChange} onOpenPicker={onOpenPicker} style={styles.stepper} />

      {user && (
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {plan ? `${filledCount} / ${totalFields} öğün planlandı` : 'Plan henüz oluşturulmadı'}
            </Text>
            {plan?.total_calories ? (
              <View style={styles.kcalPill}>
                <Ionicons name="flame" size={12} color={COLORS.accents.amber} />
                <Text style={styles.kcalText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{plan.total_calories} kcal</Text>
              </View>
            ) : null}
          </View>
          <ProgressBar value={progress} tone="onPrimary" />
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: SIZES.lg, paddingHorizontal: SIZES.containerPadding },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: whiteAlpha(0.18),
    borderRadius: SIZES.radiusFull,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: { color: COLORS.white, fontSize: SIZES.tiny, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: SIZES.sm },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: whiteAlpha(0.16), alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  title: { fontSize: SIZES.h2, fontWeight: '800', color: COLORS.textOnPrimary, letterSpacing: -0.5 },
  sub: { fontSize: SIZES.small, color: whiteAlpha(0.88), marginTop: 2, marginBottom: SIZES.md },
  stepper: { marginBottom: SIZES.md },
  progressCard: { backgroundColor: whiteAlpha(0.16), borderRadius: SIZES.radiusMedium, padding: SIZES.md, borderWidth: 1, borderColor: whiteAlpha(0.25) },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.sm, gap: SIZES.sm },
  progressLabel: { color: COLORS.textOnPrimary, fontSize: SIZES.small, fontWeight: '600', flex: 1 },
  kcalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: whiteAlpha(0.9), borderRadius: SIZES.radiusFull, paddingVertical: 3, paddingHorizontal: 8 },
  kcalText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.text },
});
