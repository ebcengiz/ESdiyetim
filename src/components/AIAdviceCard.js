import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

/**
 * VKİ (BMIPanel) ile aynı görünüm/davranış: gradient başlık, yenile, yükleme metni.
 * @param {boolean} visible - Kartı göster (genelde loading || advice)
 * @param {boolean} loading
 * @param {string} advice
 * @param {() => void} onRefresh
 * @param {[string, string]} gradientColors - LinearGradient colors
 * @param {string} iconTint - sparkles ikon rengi (genelde ana vurgu rengi)
 * @param {string} [title='Yapay Zeka Tavsiyesi']
 * @param {string} [loadingText='AI tavsiyeniz hazırlanıyor...']
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
  style,
}) {
  if (!visible) return null;

  return (
    <View style={[styles.card, style]}>
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
          <Text style={styles.title}>{title}</Text>
          {onRefresh ? (
            <TouchableOpacity
              onPress={onRefresh}
              disabled={loading}
              style={styles.refreshBtn}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.9)" />
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
            <Text style={[styles.loadingText, { color: iconTint }]}>{loadingText}</Text>
          </View>
        ) : (
          <Text style={styles.adviceText}>{advice}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.medium,
    marginTop: SIZES.md,
  },
  header: {
    padding: SIZES.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: SIZES.body,
    fontWeight: '700',
    color: '#fff',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshPlaceholder: {
    width: 32,
    height: 32,
  },
  body: {
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.sm,
  },
  loadingText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    flex: 1,
  },
  adviceText: {
    fontSize: SIZES.body,
    color: COLORS.text,
    lineHeight: 24,
  },
});
