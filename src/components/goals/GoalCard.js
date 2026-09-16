import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import { formatMediumDate, daysFromToday } from '../../utils/date';
import { IconBadge, AppButton } from '../ui';

/** Durum rozeti: devam ediyor / tamamlandı / süresi geçti */
function StatusPill({ status, overdue }) {
  const cfg =
    status === 'completed'
      ? { bg: COLORS.successBg, fg: COLORS.successText, icon: 'checkmark-done', label: 'Tamamlandı' }
      : overdue
        ? { bg: COLORS.errorBg, fg: COLORS.errorText, icon: 'alert-circle-outline', label: 'Tarihi geçti' }
        : { bg: COLORS.infoBg, fg: COLORS.infoText, icon: 'time-outline', label: 'Devam ediyor' };
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.fg} />
      <Text style={[styles.pillText, { color: cfg.fg }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{cfg.label}</Text>
    </View>
  );
}

function Metric({ label, value, color }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
      <Text style={[styles.metricValue, color && { color }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{value}</Text>
    </View>
  );
}

/**
 * Tek hedef kartı — dokun: düzenle; altta açık "Tamamlandı / Yeniden aç" ve "Sil" butonları.
 */
export default function GoalCard({ goal, onEdit, onToggleStatus, onDelete }) {
  const isCompleted = goal.status === 'completed';
  const daysRemaining = daysFromToday(goal.target_date);
  const overdue = !isCompleted && daysRemaining < 0;
  const weightDiff = goal.current_weight ? Math.abs(goal.current_weight - goal.target_weight) : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, isCompleted && styles.cardDone, pressed && styles.pressed]}
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Hedef: ${goal.title}, ${isCompleted ? 'tamamlandı' : overdue ? 'tarihi geçti' : `${daysRemaining} gün kaldı`}`}
      accessibilityHint="Düzenlemek için dokunun"
    >
      <View style={styles.header}>
        <IconBadge name={isCompleted ? 'checkmark-circle' : 'flag'} color={isCompleted ? COLORS.success : COLORS.primary} size={40} />
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{goal.title}</Text>
          <Text style={styles.dates} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {formatMediumDate(goal.start_date)} – {formatMediumDate(goal.target_date)}
          </Text>
        </View>
        <StatusPill status={goal.status} overdue={overdue} />
      </View>

      <View style={styles.metrics}>
        {goal.current_weight ? <Metric label="Mevcut" value={`${goal.current_weight} kg`} /> : null}
        <Metric label="Hedef" value={`${goal.target_weight} kg`} color={COLORS.primary} />
        {weightDiff !== null && <Metric label="Fark" value={`${weightDiff.toFixed(1)} kg`} color={COLORS.warningText} />}
        {!isCompleted && daysRemaining >= 0 && <Metric label="Kalan" value={`${daysRemaining} gün`} color={COLORS.infoText} />}
      </View>

      {!!goal.notes && (
        <Text style={styles.notes} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{goal.notes}</Text>
      )}

      <View style={styles.actions}>
        <AppButton
          title={isCompleted ? 'Yeniden aç' : 'Tamamlandı'}
          icon={isCompleted ? 'refresh-outline' : 'checkmark-done-outline'}
          variant={isCompleted ? 'secondary' : 'outline'}
          size="sm"
          onPress={onToggleStatus}
          style={styles.actionBtn}
        />
        <AppButton title="Sil" icon="trash-outline" variant="danger" size="sm" onPress={onDelete} haptic={false} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  cardDone: { borderColor: COLORS.successBg, backgroundColor: COLORS.backgroundLight },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.96 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm + 2, marginBottom: SIZES.md },
  titleWrap: { flex: 1 },
  title: { fontSize: SIZES.h5, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  dates: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  pillText: { fontSize: SIZES.micro + 1, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm, backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.sm + 2 },
  metric: { minWidth: '22%', flexGrow: 1 },
  metricLabel: { fontSize: SIZES.micro + 1, color: COLORS.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  metricValue: { fontSize: SIZES.bodySmall, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  notes: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 19, marginTop: SIZES.sm + 2, fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SIZES.sm, marginTop: SIZES.md },
  actionBtn: {},
});
