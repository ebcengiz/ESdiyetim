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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const MIN_TOUCH = 44;
// Hermes / bazı sürümlerde Easing.ease edge-case; tek bir eğri kullan (ease hatası önlemi)
const SMOOTH_EASING = Easing.bezier(0.42, 0, 0.58, 1);

// ─── Animasyonlu yükleme noktaları ───────────────────────────────────────────
function PulsingDots({ color }) {
  const dots = [useRef(new Animated.Value(0)).current,
                useRef(new Animated.Value(0)).current,
                useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(dot, { toValue: 1, duration: 400, easing: SMOOTH_EASING, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: SMOOTH_EASING, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View
      style={styles.dotsRow}
      accessibilityLiveRegion="polite"
      accessibilityLabel="Yükleniyor"
    >
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: color,
            opacity: dot,
            transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        />
      ))}
    </View>
  );
}

// ─── Sparkle animasyonu ───────────────────────────────────────────────────────
function SparkleIcon({ tint, size }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, easing: SMOOTH_EASING, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: SMOOTH_EASING, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Ionicons name="sparkles" size={size} color={tint} />
    </Animated.View>
  );
}

/**
 * AI tavsiye kartı — akordion, responsive ve erişilebilir (production UI)
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
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const layout = useMemo(() => {
    const narrow = windowWidth < 360;
    const compact = windowWidth < 400;
    const padH = narrow ? SIZES.sm + 6 : SIZES.md;
    const iconBox = compact ? 40 : 46;
    const titleSize = Math.min(SIZES.body + 2, (SIZES.body + 1) * Math.min(fontScale, 1.15));
    const subtitleSize = Math.min(SIZES.small, SIZES.small * Math.min(fontScale, 1.12));
    const bodyMax = Math.min(2400, Math.max(520, windowWidth * 2.2));
    return { narrow, compact, padH, iconBox, titleSize, subtitleSize, bodyMax };
  }, [windowWidth, fontScale]);

  // Yükleme başladığında otomatik aç
  useEffect(() => {
    if (loading && !expanded) {
      setExpanded(true);
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 260,
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
      duration: 280,
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
    <View style={[styles.wrap, style]}>
      {/* TouchableOpacity: Fabric/Expo Go’da Pressable + LinearGradient iç içe bazen native prop hatasına yol açabiliyor */}
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.96}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${expanded ? 'Açık' : 'Kapalı'}`}
        accessibilityHint="Tavsiye metnini gösterir veya gizler"
        accessibilityState={{ expanded, busy: loading }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingHorizontal: layout.padH }]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.aiBadge}>
              <Ionicons name="flash" size={11} color={gradientColors[0]} />
              <Text style={[styles.aiBadgeText, { color: gradientColors[0] }]} maxFontSizeMultiplier={1.4}>
                AI
              </Text>
            </View>
          </View>

          <View style={[styles.headerRow, layout.compact && styles.headerRowCompact]}>
            <View style={[styles.iconBox, { width: layout.iconBox, height: layout.iconBox, borderRadius: layout.iconBox / 2 }]}>
              <SparkleIcon tint={gradientColors[0]} size={layout.compact ? 18 : 22} />
            </View>

            <View style={styles.headerTexts}>
              <Text
                style={[styles.headerTitle, { fontSize: layout.titleSize }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.35}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.headerSubtitle, { fontSize: layout.subtitleSize }]}
                  numberOfLines={layout.narrow ? 2 : 3}
                  maxFontSizeMultiplier={1.35}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {onRefresh ? (
                <Pressable
                  onPress={(e) => {
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
                    styles.refreshBtn,
                    { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH },
                    pressed && !loading && styles.refreshBtnPressed,
                    loading && styles.refreshBtnDisabled,
                  ]}
                >
                  <Ionicons name="refresh-outline" size={layout.compact ? 17 : 19} color="rgba(255,255,255,0.95)" />
                </Pressable>
              ) : null}

              <Animated.View
                style={[styles.chevronWrap, { transform: [{ rotate: chevronRotate }] }]}
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="chevron-down" size={layout.compact ? 20 : 22} color="rgba(255,255,255,0.9)" />
              </Animated.View>
            </View>
          </View>

          {expanded ? (
            <View style={[styles.headerDivider, { marginHorizontal: -layout.padH }]} />
          ) : null}
        </LinearGradient>
      </TouchableOpacity>

      <Animated.View style={[styles.bodyClip, { maxHeight: bodyMaxHeight }]}>
        <View style={[styles.body, { paddingHorizontal: layout.padH }]}>
          {loading ? (
            <View style={styles.loadingRow}>
              <PulsingDots color={iconTint} />
              <Text
                style={[styles.loadingText, { color: iconTint }]}
                maxFontSizeMultiplier={1.35}
              >
                {loadingText}
              </Text>
            </View>
          ) : showBodyContent ? (
            <>
              <View style={styles.contentRow}>
                <View style={[styles.leftAccent, { backgroundColor: iconTint }]} />
                <View style={styles.contentInner}>
                  {children != null ? children : (
                    <Text style={styles.adviceText} maxFontSizeMultiplier={1.4}>{advice}</Text>
                  )}
                </View>
              </View>

              {footerDisclaimer ? (
                <View style={styles.footer}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.textLight} style={styles.footerIcon} />
                  <Text style={styles.footerText} maxFontSizeMultiplier={1.35}>{footerDisclaimer}</Text>
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
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.large,
  },

  header: {
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md + 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm + 2,
  },
  headerRowCompact: {
    gap: SIZES.sm,
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    ...SHADOWS.small,
  },
  headerTexts: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.35,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    marginTop: 4,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  refreshBtn: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  refreshBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  refreshBtnDisabled: {
    opacity: 0.45,
  },
  chevronWrap: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: SIZES.md,
  },

  bodyClip: {
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
  },
  body: {
    paddingVertical: SIZES.lg,
    paddingBottom: SIZES.lg + 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZES.md,
    paddingVertical: SIZES.xs,
  },
  loadingText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    letterSpacing: 0.15,
    flex: 1,
    minWidth: 120,
  },
  contentRow: {
    flexDirection: 'row',
    gap: SIZES.sm + 2,
    alignItems: 'flex-start',
  },
  leftAccent: {
    width: 4,
    borderRadius: 3,
    minHeight: 24,
    opacity: 0.75,
    marginTop: 2,
  },
  contentInner: {
    flex: 1,
    minWidth: 0,
  },
  adviceText: {
    fontSize: SIZES.bodySmall,
    color: COLORS.text,
    lineHeight: 26,
    letterSpacing: -0.08,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    paddingHorizontal: SIZES.xs,
    paddingBottom: 2,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.disclaimerBackground,
    marginHorizontal: -SIZES.xs,
  },
  footerIcon: {
    marginTop: 2,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});
