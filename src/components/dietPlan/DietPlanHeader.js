import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';
import { HeroHeader, DateStepper, ProgressBar } from '../ui';

/**
 * Diyet planı başlığı — kompakt: başlık + geçmiş/sil aksiyonları, tarih adımlayıcı
 * (birincil kontrol) ve tek satır ilerleme ("3 / 5 öğün · 1450 kcal" + ince bar).
 * Rozet ve açıklama cümlesi yok; header sabit olduğu için her satır içerikten çalar.
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
  const progress = totalFields ? filledCount / totalFields : 0;
  const actions = [];
  if (user) actions.push({ icon: 'time-outline', label: 'Geçmiş planlar', onPress: onOpenHistory });
  if (user && plan) actions.push({ icon: 'trash-outline', label: 'Planı sil', onPress: onDelete, muted: true });

  return (
    <HeroHeader title="Diyet Planlarım" actions={actions} colors={[COLORS.gradientStart, COLORS.gradientMiddle]}>
      <DateStepper date={selectedDate} onChange={onDateChange} onOpenPicker={onOpenPicker} />

      {user && (
        <View style={styles.progress}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {plan ? `${filledCount} / ${totalFields} öğün planlandı` : 'Plan henüz oluşturulmadı'}
            </Text>
            {plan?.total_calories ? (
              <View style={styles.kcal}>
                <Ionicons name="flame" size={12} color={COLORS.accents.amber} />
                <Text style={styles.kcalText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{plan.total_calories} kcal</Text>
              </View>
            ) : null}
          </View>
          <ProgressBar value={progress} tone="onPrimary" height={4} />
        </View>
      )}
    </HeroHeader>
  );
}

const styles = StyleSheet.create({
  progress: { marginTop: SIZES.sm + 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: SIZES.sm },
  progressLabel: { color: whiteAlpha(0.92), fontSize: SIZES.tiny, fontWeight: '600', flex: 1 },
  kcal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kcalText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.textOnPrimary },
});
