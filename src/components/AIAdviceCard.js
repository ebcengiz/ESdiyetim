import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

/**
 * VKİ ve tüm sekmelerde ortak modern AI kartı.
 * @param {string} [subtitle] — Başlık altında ince açıklama (beyaz/yarı saydam)
 * @param {React.ReactNode} [children] — loading değilken gövdede özel içerik (ör. Tips paragrafları)
 * @param {string} [footerDisclaimer] — Gövde altında küçük uyarı metni
 */
export default function AIAdviceCard({
  visible = true,
  loading = false,
  advice = '',
  onRefresh,
  gradientColors = [COLORS.primary, COLORS.primaryLight],
  iconTint = COLORS.primary,
  title = 'Yapay Zeka Tavsiyesi',
  loadingText = 'AI tavsiyeniz hazırlanıyor...',
  subtitle,
  footerDisclaimer,
  style,
  children,
}) {
  if (!visible) return null;

  const showBodyContent = !loading && (children != null || (advice && advice.length > 0));

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.cardOuter}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <Ionicons name="sparkles" size={18} color={iconTint} />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {onRefresh ? (
              <TouchableOpacity
                onPress={onRefresh}
                disabled={loading}
                style={styles.refreshBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="refresh" size={17} color="rgba(255,255,255,0.95)" />
              </TouchableOpacity>
            ) : (
              <View style={styles.refreshPlaceholder} />
            )}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={iconTint} />
              <Text style={[styles.loadingText, { color: iconTint }]}>
                {loadingText}
              </Text>
            </View>
          ) : showBodyContent ? (
            <>
              {children != null ? (
                <View style={styles.childrenWrap}>{children}</View>
              ) : (
                <Text style={styles.adviceText}>{advice}</Text>
              )}
              {footerDisclaimer ? (
                <View style={styles.footerRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={14}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.footerDisclaimer}>{footerDisclaimer}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SIZES.md,
  },
  cardOuter: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.large,
  },
  header: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
  },
  headerTextBlock: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    ...SHADOWS.small,
  },
  title: {
    fontSize: SIZES.body + 1,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    letterSpacing: -0.25,
  },
  subtitle: {
    marginTop: 3,
    fontSize: SIZES.small,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
  },
  refreshPlaceholder: {
    width: 36,
    height: 36,
  },
  body: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md + 2,
    paddingVertical: SIZES.lg,
  },
  childrenWrap: {
    gap: SIZES.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  loadingText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    flex: 1,
  },
  adviceText: {
    fontSize: SIZES.bodySmall,
    color: COLORS.text,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SIZES.lg,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  footerDisclaimer: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});
