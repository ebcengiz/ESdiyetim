import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { useSubscription } from '../contexts/SubscriptionContext';
import { bypassPaywall } from '../utils/environment';

export default function PremiumGate({ children, icon = 'star', title, description }) {
  const { isSubscribed, openPaywall } = useSubscription();
  const insets = useSafeAreaInsets();

  if (bypassPaywall || isSubscribed) return children;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>
      <LinearGradient
        colors={['#6366F1', '#818CF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Ionicons name={icon} size={32} color="white" />
      </LinearGradient>

      <View style={styles.lockBadge}>
        <Ionicons name="lock-closed" size={13} color="white" />
        <Text style={styles.lockBadgeText}>Premium</Text>
      </View>

      <Text style={styles.title}>{title || 'Premium Üyelere Özel'}</Text>
      <Text style={styles.description}>
        {description || 'Bu özelliği kullanmak için premium üyelik gereklidir.'}
      </Text>

      <TouchableOpacity style={styles.btn} onPress={openPaywall} activeOpacity={0.85}>
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          <Ionicons name="star" size={16} color="white" />
          <Text style={styles.btnText}>Premium'a Geç</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.sub}>
        Aylık ₺249,99 · İstediğin zaman iptal et
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  lockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
  },
  sub: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
