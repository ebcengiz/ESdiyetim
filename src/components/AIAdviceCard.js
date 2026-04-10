import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

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
          Animated.timing(dot, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 4,
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
function SparkleIcon({ tint }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Ionicons name="sparkles" size={20} color={tint} />
    </Animated.View>
  );
}

/**
 * Modern AI Tavsiye Kartı — akordion (açılır/kapanır)
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
  const [expanded, setExpanded] = useState(defaultExpanded);
  const expandAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  // Yükleme başladığında otomatik aç
  useEffect(() => {
    if (loading && !expanded) {
      setExpanded(true);
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.inOut(Easing.ease),
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
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const bodyMaxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 800],
  });

  const chevronRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (!visible) return null;

  const showBodyContent = !loading && (children != null || (advice && advice.length > 0));

  return (
    <View style={[styles.wrap, style]}>
      {/* ── Header (gradient + toggle) ────────────────────── */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.88}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          {/* Sol üst: AI rozeti */}
          <View style={styles.aiBadge}>
            <Ionicons name="flash" size={10} color={gradientColors[0]} />
            <Text style={[styles.aiBadgeText, { color: gradientColors[0] }]}>AI</Text>
          </View>

          <View style={styles.headerRow}>
            {/* İkon kutusu */}
            <View style={styles.iconBox}>
              <SparkleIcon tint={gradientColors[0]} />
            </View>

            {/* Başlık + alt başlık */}
            <View style={styles.headerTexts}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? (
                <Text style={styles.headerSubtitle} numberOfLines={2}>{subtitle}</Text>
              ) : null}
            </View>

            {/* Yenile butonu */}
            {onRefresh ? (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); onRefresh(); }}
                disabled={loading}
                style={styles.refreshBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            ) : null}

            {/* Şevron */}
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.85)" />
            </Animated.View>
          </View>

          {/* Alt ayraç çizgisi — sadece açıkken */}
          {expanded ? <View style={styles.headerDivider} /> : null}
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Body (akordion) ───────────────────────────────── */}
      <Animated.View style={{ maxHeight: bodyMaxHeight, overflow: 'hidden' }}>
        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingRow}>
              <PulsingDots color={iconTint} />
              <Text style={[styles.loadingText, { color: iconTint }]}>{loadingText}</Text>
            </View>
          ) : showBodyContent ? (
            <>
              <View style={styles.contentRow}>
                <View style={[styles.leftAccent, { backgroundColor: iconTint }]} />
                <View style={styles.contentInner}>
                  {children != null ? children : (
                    <Text style={styles.adviceText}>{advice}</Text>
                  )}
                </View>
              </View>

              {footerDisclaimer ? (
                <View style={styles.footer}>
                  <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.textLight} />
                  <Text style={styles.footerText}>{footerDisclaimer}</Text>
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
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.large,
  },

  // ── Header
  header: {
    paddingTop: SIZES.sm + 2,
    paddingBottom: SIZES.md,
    paddingHorizontal: SIZES.md,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
    marginBottom: SIZES.sm,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  headerTexts: {
    flex: 1,
  },
  headerTitle: {
    fontSize: SIZES.body + 1,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: SIZES.small,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 17,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: SIZES.md,
    marginHorizontal: -SIZES.md,
  },

  // ── Body
  body: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingVertical: SIZES.xs,
  },
  loadingText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  contentRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  leftAccent: {
    width: 3,
    borderRadius: 2,
    minHeight: 20,
    opacity: 0.7,
  },
  contentInner: {
    flex: 1,
  },
  adviceText: {
    fontSize: SIZES.bodySmall,
    color: COLORS.text,
    lineHeight: 26,
    letterSpacing: -0.1,
  },

  // ── Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});
