import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const MIN_TOUCH = 44;
const SMOOTH_EASING = Easing.bezier(0.42, 0, 0.58, 1);

function PulsingDots({ color }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(dot, { toValue: 1, duration: 360, easing: SMOOTH_EASING, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 360, easing: SMOOTH_EASING, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.dotsRow} accessibilityLiveRegion="polite" accessibilityLabel="Yükleniyor">
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: color,
            opacity: dot,
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}

/**
 * AI tavsiye kartı — minimalist yüzey, ince marka vurgusu
 */
export default function AIAdviceCard({
  visible = true,
  loading = false,
  advice = '',
  onRefresh,
  gradientColors = [COLORS.primary, COLORS.primaryLight],
  iconTint = COLORS.primary,
  title = 'Yapay Zeka Tavsiyesi',
  loadingText = 'Analiz yapılıyor',
  subtitle,
  footerDisclaimer,
  defaultExpanded = false,
  style,
  children,
}) {
  const accent = gradientColors[0] ?? iconTint;
  const { width: windowWidth, height: windowHeight, fontScale } = useWindowDimensions();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const layout = useMemo(() => {
    const narrow = windowWidth < 360;
    const compact = windowWidth < 400;
    const padH = narrow ? SIZES.sm + 4 : SIZES.md;
    const titleSize = Math.min(SIZES.body + 1, SIZES.body * Math.min(fontScale, 1.12));
    const subtitleSize = Math.min(SIZES.small, SIZES.small * Math.min(fontScale, 1.08));
    // Akordeon maxHeight: width*2.1 ~800px uzun AI metinlerini kesiyordu (overflow:hidden).
    // Ekran yüksekliğine göre geniş üst sınır — tipik 300+ kelime metinler sığar.
    const bodyMax = Math.min(48000, Math.max(windowHeight * 12, 9600));
    return { narrow, compact, padH, titleSize, subtitleSize, bodyMax };
  }, [windowWidth, windowHeight, fontScale]);

  useEffect(() => {
    if (loading && !expanded) {
      setExpanded(true);
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 240,
        easing: SMOOTH_EASING,
        useNativeDriver: false,
      }).start();
    }
  }, [loading]);

  const toggle = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.timing(expandAnim, {
      toValue,
      duration: 260,
      easing: SMOOTH_EASING,
      useNativeDriver: false,
    }).start();
  };

  const bodyMaxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, layout.bodyMax],
  });

  const chevronRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (!visible) return null;

  const showBodyContent = !loading && (children != null || (advice && advice.length > 0));

  return (
    <View style={[styles.wrap, { borderLeftColor: accent }, style]}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${expanded ? 'Açık' : 'Kapalı'}`}
        accessibilityHint="Tavsiye metnini gösterir veya gizler"
        accessibilityState={{ expanded, busy: loading }}
      >
        <View style={[styles.header, { paddingHorizontal: layout.padH }]}>
          <View style={[styles.headerRow, layout.compact && styles.headerRowCompact]}>
            <View style={[styles.iconMark, { backgroundColor: `${accent}14` }]}>
              <Ionicons name="sparkles-outline" size={layout.compact ? 18 : 20} color={accent} />
            </View>

            <View style={styles.headerTexts}>
              <Text style={styles.kicker} maxFontSizeMultiplier={1.3}>
                AI
              </Text>
              <Text
                style={[styles.headerTitle, { fontSize: layout.titleSize }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.headerSubtitle, { fontSize: layout.subtitleSize }]}
                  numberOfLines={layout.narrow ? 2 : 2}
                  maxFontSizeMultiplier={1.3}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {onRefresh ? (
                <Pressable
                  onPress={e => {
                    if (loading) return;
                    e?.stopPropagation?.();
                    onRefresh();
                  }}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Tavsiyeyi yenile"
                  accessibilityState={{ disabled: loading }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { minWidth: MIN_TOUCH - 8, minHeight: MIN_TOUCH - 8 },
                    pressed && !loading && styles.iconBtnPressed,
                    loading && styles.iconBtnDisabled,
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={layout.compact ? 18 : 19}
                    color={loading ? COLORS.textLight : COLORS.textSecondary}
                  />
                </Pressable>
              ) : null}

              <Animated.View
                style={[styles.chevronWrap, { transform: [{ rotate: chevronRotate }] }]}
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="chevron-down" size={layout.compact ? 18 : 20} color={COLORS.textLight} />
              </Animated.View>
            </View>
          </View>

          {expanded ? <View style={[styles.headerDivider, { marginHorizontal: -layout.padH }]} /> : null}
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.bodyClip, { maxHeight: bodyMaxHeight }]}>
        <View style={[styles.body, { paddingHorizontal: layout.padH }]}>
          {loading ? (
            <View style={styles.loadingRow}>
              <PulsingDots color={iconTint} />
              <Text style={[styles.loadingText, { color: COLORS.textSecondary }]} maxFontSizeMultiplier={1.3}>
                {loadingText}
              </Text>
            </View>
          ) : showBodyContent ? (
            <>
              <View style={styles.contentInner}>
                {children != null ? children : <Text style={styles.adviceText} maxFontSizeMultiplier={1.35}>{advice}</Text>}
              </View>

              {footerDisclaimer ? (
                <View style={styles.footer}>
                  <Text style={styles.footerText} maxFontSizeMultiplier={1.3}>
                    {footerDisclaimer}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    borderLeftWidth: 3,
    ...SHADOWS.small,
  },

  header: {
    paddingTop: SIZES.md - 2,
    paddingBottom: SIZES.md - 2,
    backgroundColor: COLORS.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm + 2,
  },
  headerRowCompact: {
    gap: SIZES.sm,
  },
  iconMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitle: {
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.25,
  },
  headerSubtitle: {
    marginTop: 3,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    flexShrink: 0,
    marginTop: 2,
  },
  iconBtn: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnPressed: {
    opacity: 0.65,
  },
  iconBtnDisabled: {
    opacity: 0.4,
  },
  chevronWrap: {
    width: MIN_TOUCH - 10,
    height: MIN_TOUCH - 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginTop: SIZES.md - 2,
  },

  bodyClip: {
    overflow: 'hidden',
    backgroundColor: COLORS.background,
  },
  body: {
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md + 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZES.sm + 4,
    paddingVertical: 2,
  },
  loadingText: {
    fontSize: SIZES.small,
    fontWeight: '500',
    letterSpacing: 0.05,
    flex: 1,
    minWidth: 120,
  },
  contentInner: {
    minWidth: 0,
  },
  adviceText: {
    fontSize: SIZES.bodySmall,
    color: COLORS.text,
    lineHeight: 24,
    letterSpacing: -0.05,
    fontWeight: '400',
  },

  footer: {
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textLight,
    fontWeight: '400',
  },
});
