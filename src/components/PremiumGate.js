import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { useSubscription } from '../contexts/SubscriptionContext';
import { bypassPaywall } from '../utils/environment';

/**
 * PremiumGate
 * ─────────────────────────────────────────────────────────────────────
 * Premium içerikleri modern glassmorphic bir overlay ile kilitler.
 *
 * Kullanım:
 *   <PremiumGate icon="restaurant" title="..." description="...">
 *     <KilidinAltındakiİçerik />
 *   </PremiumGate>
 *
 * - Aboneyse → children olduğu gibi render edilir.
 * - Değilse → children arka planda blur'lu, üstte cam efektli paywall CTA.
 *   Kartın tamamına dokunmak doğrudan paywall'u açar.
 */
export default function PremiumGate({
  children,
  icon = 'star',
  title,
  description,
}) {
  const { isSubscribed, openPaywall } = useSubscription();
  const insets = useSafeAreaInsets();

  if (bypassPaywall || isSubscribed) return children;

  return (
    <View style={styles.root}>
      {/* İçerik arkada — blur altında ipucu olarak görünür */}
      <View style={styles.behind} pointerEvents="none">
        {children}
      </View>

      {/* Blur katmanı — iOS'ta native blur, Android fallback yarı saydam */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 90}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.tint]} />

      {/* Dokunma alanı — herhangi bir noktaya tıklayınca paywall açılır */}
      <Pressable
        style={[styles.touchArea, { paddingBottom: insets.bottom + 100 }]}
        onPress={openPaywall}
        android_ripple={{ color: 'rgba(22,163,74,0.08)' }}
      >
        <View style={styles.card}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name={icon} size={32} color="white" />
            <View style={styles.lockBubble}>
              <Ionicons name="lock-closed" size={12} color={COLORS.primary} />
            </View>
          </LinearGradient>

          <View style={styles.badge}>
            <Ionicons name="star" size={11} color="white" />
            <Text style={styles.badgeText}>PREMIUM</Text>
          </View>

          <Text style={styles.title}>{title || 'Premium Üyelere Özel'}</Text>
          <Text style={styles.description}>
            {description ||
              'Bu özelliği kullanmak için premium üyelik gereklidir.'}
          </Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={openPaywall}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Ionicons name="sparkles" size={16} color="white" />
              <Text style={styles.btnText}>Premium'a Geç</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.hint}>İstediğin zaman iptal edebilirsin</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  behind: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  tint: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  touchArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    ...SHADOWS.medium,
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...SHADOWS.medium,
  },
  lockBubble: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  btn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.2,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 10,
  },
});
