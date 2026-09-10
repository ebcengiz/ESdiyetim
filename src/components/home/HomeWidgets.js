import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';

// Küçük, tekrar kullanılan sunum bileşenleri — HomeScreen ve alt bölümleri
// (HomeHeroHeader, HomeStatsRow, HomeSections) arasında paylaşılır.

export const MealItem = ({ icon, label, text }) => (
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

export const KpiPill = ({ icon, label, value, compact, onPress }) => {
  const pressAnim = useRef(new Animated.Value(0)).current;

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

export const SectionHeader = ({ icon, title, subtitle, actionText, onPress }) => (
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

export const QuickActionButton = ({ icon, label, color, onPress, style }) => (
  <TouchableOpacity
    style={[styles.quickActionBtn, style]}
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

/** "Fotoğraftan kalori" / "Besin Takibi" gibi tek satırlık CTA kartı — ikisi de aynı desen. */
export const HomeActionCta = ({ icon, iconBg, iconColor, title, subtitle, user, onPress }) => (
  <TouchableOpacity
    style={[styles.calorieCta, !user && styles.calorieCtaGuest]}
    onPress={onPress}
    activeOpacity={0.82}
  >
    <View style={[styles.calorieCtaIcon, iconBg ? { backgroundColor: iconBg } : null]}>
      <Ionicons name={icon} size={22} color={iconColor || COLORS.primary} />
    </View>
    <View style={styles.calorieCtaText}>
      <Text style={styles.calorieCtaTitle}>{title}</Text>
      <Text style={styles.calorieCtaSub}>{subtitle}</Text>
    </View>
    <Ionicons
      name={user ? 'chevron-forward' : 'lock-closed-outline'}
      size={20}
      color={COLORS.textLight}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // MealItem
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
  mealContent: { flex: 1 },
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

  // KpiPill
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
  kpiPillCompact: { paddingRight: 10 },
  kpiLabel: { fontSize: SIZES.tiny, color: COLORS.textSecondary },
  kpiValue: {
    flex: 1,
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },

  // SectionHeader
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  sectionTitleWrap: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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

  // QuickActionButton (genişlik parent'tan hesaplanır, bkz. QuickActionsSection)
  quickActionBtn: {
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

  // HomeActionCta
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
  calorieCtaGuest: { opacity: 0.92, borderStyle: 'dashed' },
  calorieCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCtaText: { flex: 1 },
  calorieCtaTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  calorieCtaSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
});
