import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE } from '../../constants/theme';
import { ProgressBar } from '../ui';

/** Güven seviyesi → rozet rengi/ikonu (yalnız renk değil, ikon + metin ile) */
export function getConfidenceMeta(confidence) {
  const value = String(confidence || '').toLowerCase();
  if (value.includes('yüksek') || value.includes('high')) {
    return { label: 'Yüksek güven', bg: COLORS.successBg, color: COLORS.successText, icon: 'checkmark-circle' };
  }
  if (value.includes('düşük') || value.includes('low')) {
    return { label: 'Düşük güven', bg: COLORS.errorBg, color: COLORS.errorText, icon: 'alert-circle' };
  }
  return { label: 'Orta güven', bg: COLORS.warningBg, color: COLORS.warningText, icon: 'information-circle' };
}

export const getItemKcal = (item) => {
  const kcal = Number(item?.estimatedKcal ?? item?.kcal);
  return Number.isFinite(kcal) && kcal > 0 ? Math.round(kcal) : 0;
};

const PROVIDER_LABELS = { 'groq-vision': 'Groq Vision', 'gemini-vision': 'Gemini Vision' };

/**
 * Fotoğraf analiz sonucu kartı — öğün adı, animasyonlu kcal, güven rozeti, dağılım çubukları, not.
 */
export default function MealResultCard({ result, displayedCalories, animatedStyle }) {
  const confidence = getConfidenceMeta(result?.confidence);
  const items = result?.items || [];
  const maxKcal = items.length ? Math.max(...items.map(getItemKcal), 1) : 1;
  const providerLabel = PROVIDER_LABELS[result?.provider];

  return (
    <Animated.View style={[styles.card, animatedStyle]} accessibilityLabel={`Tahmini sonuç: ${result.mealName}, ${result.estimatedCalories} kalori, ${confidence.label}`}>
      <View style={styles.headerBand}>
        <Text style={styles.kicker} maxFontSizeMultiplier={MAX_FONT_SCALE}>Tahmini sonuç</Text>
        <Text style={styles.meal} numberOfLines={3} maxFontSizeMultiplier={MAX_FONT_SCALE}>{result.mealName}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.kcalRow}>
          <Text style={styles.kcalValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{displayedCalories}</Text>
          <Text style={styles.kcalUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>kcal</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: confidence.bg }]}>
            <Ionicons name={confidence.icon} size={14} color={confidence.color} />
            <Text style={[styles.badgeText, { color: confidence.color }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{confidence.label}</Text>
          </View>
          {!!providerLabel && (
            <View style={styles.providerChip}>
              <Ionicons name="hardware-chip-outline" size={13} color={COLORS.textLight} />
              <Text style={styles.providerText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{providerLabel}</Text>
            </View>
          )}
        </View>

        {items.length > 0 && (
          <View style={styles.itemsBox}>
            <Text style={styles.itemsTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>Tahmini dağılım</Text>
            {items.map((it, i) => {
              const kcal = getItemKcal(it);
              return (
                <View key={i} style={styles.item}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemName} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{it.name || 'Öğe'}</Text>
                    <Text style={styles.itemKcal} maxFontSizeMultiplier={MAX_FONT_SCALE}>{kcal > 0 ? `${kcal} kcal` : '—'}</Text>
                  </View>
                  <ProgressBar value={Math.max(0.06, kcal / maxKcal)} height={6} />
                </View>
              );
            })}
          </View>
        )}

        {!!result.notes && <Text style={styles.notes} maxFontSizeMultiplier={MAX_FONT_SCALE}>{result.notes}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  headerBand: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SIZES.cardPadding, paddingVertical: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  kicker: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.primaryDark, textTransform: 'uppercase', letterSpacing: 0.6 },
  meal: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, marginTop: 4, letterSpacing: -0.2 },
  body: { padding: SIZES.cardPadding },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: SIZES.sm },
  kcalValue: { fontSize: 40, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  kcalUnit: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SIZES.sm, marginBottom: SIZES.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusFull },
  badgeText: { fontSize: SIZES.tiny, fontWeight: '700' },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.neutral100 },
  providerText: { fontSize: SIZES.tiny, color: COLORS.textLight, fontWeight: '600' },
  itemsBox: { backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md },
  itemsTitle: { fontSize: SIZES.small, fontWeight: '800', color: COLORS.text, marginBottom: SIZES.sm + 2 },
  item: { marginBottom: SIZES.sm + 2 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SIZES.sm, marginBottom: 6 },
  itemName: { flex: 1, fontSize: SIZES.small, color: COLORS.text, fontWeight: '600' },
  itemKcal: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primaryDark },
  notes: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 19, marginTop: SIZES.md, fontStyle: 'italic' },
});
