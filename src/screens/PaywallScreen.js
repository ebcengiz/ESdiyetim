import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, HIT_SLOP, MAX_FONT_SCALE, withAlpha } from '../constants/theme';
import {
  purchaseSubscription,
  restorePurchases,
  isActivePurchase,
  PLAN_META,
  FALLBACK_PRICE_LABELS,
} from '../services/subscriptionService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useResponsive } from '../hooks/useResponsive';
import { ERROR_CODES } from '../services/errors';
import { ScreenContainer, AppButton, IconBadge, SectionHeader } from '../components/ui';

const FEATURES = [
  { icon: 'camera', text: 'Günde 5 fotoğraftan kalori analizi (ücretsiz planda günde 1)' },
  { icon: 'sparkles', text: 'AI ile sınırsız besin analizi (ücretsiz planda günde 3)' },
  { icon: 'infinite', text: 'Uygulamanın tamamına reklamsız, sınırsız erişim' },
];

export default function PaywallScreen({ navigation }) {
  const { topPad } = useResponsive();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const { refreshSubscription, products, activateTestSubscription } = useSubscription();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState(PLAN_META[2].id); // yearly default
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Ürün fiyatını Store'dan al, yoksa sabit göster
  // Not: expo-iap v4 Product tipinde alan adları `id` ve `displayPrice`'tır
  // (eski v2 API'sindeki `productId`/`localizedPrice` değil) — bkz. expo-iap ProductCommon tipi.
  const getPriceLabel = (planKey) => {
    const storeProduct = products.find((p) => p.id === planKey);
    if (storeProduct?.displayPrice) return storeProduct.displayPrice;
    return FALLBACK_PRICE_LABELS[PLAN_META.find((p) => p.id === planKey)?.key] ?? '—';
  };

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      // appAccountToken: abonelik sunucuda yalnızca bu hesaba bağlanır (verify-subscription)
      const result = await purchaseSubscription(selectedPlan, { appAccountToken: user?.id });
      if (result?.testBlocked) {
        // Test/Simulator: Apple StoreKit sheet açılamaz. Kullanıcının premium
        // ekranları önizleyebilmesi için aboneliği lokal olarak aktif ediyoruz.
        await activateTestSubscription();
        showToast('Test modu: Premium aktif edildi.', 'success');
        navigation.goBack();
        return;
      }
      if (result?.cancelled) return;
      if (result?.success) {
        await refreshSubscription();
        showToast('Aboneliğiniz aktifleştirildi!', 'success');
        navigation.goBack();
      }
    } catch (e) {
      // Kullanıcı iptali sessiz; StoreKit/Play hataları sakin mesaja çevrilir
      handleError(e, { context: 'paywall.purchase', fallbackCode: ERROR_CODES.IAP_FAILED });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const purchases = await restorePurchases();
      const active = purchases.some(isActivePurchase);
      if (active) {
        await refreshSubscription();
        showToast('Aboneliğiniz geri yüklendi!', 'success');
        navigation.goBack();
      } else {
        showToast('Bu hesapla ilişkili aktif bir abonelik bulunamadı.', 'info');
      }
    } catch (e) {
      handleError(e, { context: 'paywall.restore', fallbackCode: ERROR_CODES.IAP_UNAVAILABLE });
    } finally {
      setRestoring(false);
    }
  };

  const footer = (
    <View>
      <AppButton title="Abone Ol" size="lg" fullWidth onPress={handlePurchase} loading={purchasing} disabled={restoring} />
      <AppButton
        title="Mevcut aboneliği geri yükle"
        variant="ghost"
        size="sm"
        onPress={handleRestore}
        loading={restoring}
        disabled={purchasing}
        haptic={false}
        style={styles.restoreBtn}
      />
    </View>
  );

  return (
    <ScreenContainer edges={[]} footer={footer} contentContainerStyle={{ paddingTop: topPad }}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
        style={({ pressed }) => [styles.closeBtn, { top: topPad - SIZES.sm }, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="close" size={22} color={COLORS.textSecondary} />
      </Pressable>

      <IconBadge name="star" tone="solid" color={COLORS.accents.indigo} size={72} iconSize={34} style={styles.heroIcon} />
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>ESdiyet Premium</Text>
      <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Diyet planı, kilo & VKİ takibi, hedefler ve tavsiyeler zaten ücretsiz. Premium,
        yapay zeka destekli fotoğraf ve besin analizinde günlük limitleri ve reklamları kaldırır.
      </Text>

      <View style={styles.featureList}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <IconBadge name={f.icon} size={32} iconSize={16} shape="rounded" />
            <Text style={styles.featureText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{f.text}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Abonelik Seçin" />
      <View style={styles.planList} accessibilityRole="radiogroup">
        {PLAN_META.map((plan) => {
          const selected = selectedPlan === plan.id;
          return (
            <Pressable
              key={plan.id}
              style={({ pressed }) => [styles.planCard, selected && styles.planCardSelected, pressed && styles.pressed]}
              onPress={() => setSelectedPlan(plan.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={`${plan.label}, ${getPriceLabel(plan.id)}, ${plan.monthlyRate}${plan.savingPct ? `, yüzde ${plan.savingPct} tasarruf` : ''}`}
            >
              {plan.highlight && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>En İyi Değer</Text>
                </View>
              )}
              <View style={styles.planRow}>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planLabel, selected && styles.planLabelSelected]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{plan.label}</Text>
                  <Text style={styles.planRate} maxFontSizeMultiplier={MAX_FONT_SCALE}>{plan.monthlyRate}</Text>
                </View>
                <View style={styles.planPriceWrap}>
                  <Text style={[styles.planPrice, selected && styles.planPriceSelected]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{getPriceLabel(plan.id)}</Text>
                  {!!plan.savingPct && (
                    <View style={styles.savingBadge}>
                      <Text style={styles.savingText} maxFontSizeMultiplier={MAX_FONT_SCALE}>-%{plan.savingPct}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.legal} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Abonelikler iTunes hesabınızdan otomatik olarak yenilenir. Yenileme döneminden en az 24 saat önce iptal edilmezse dönem sonunda aynı fiyattan otomatik yenilenir. Aboneliği iTunes hesap ayarlarından yönetebilir ve satın alma sonrası iptal edebilirsiniz. Ödeme onaylandıktan sonra mevcut dönem için iade yapılmaz.
      </Text>

      {/* EULA + Gizlilik bağlantıları (Apple 3.1.2(c) zorunluluk) */}
      <View style={styles.legalLinksRow}>
        <Pressable
          onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
          hitSlop={HIT_SLOP}
          accessibilityRole="link"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.linkText}>Kullanım Koşulları (EULA)</Text>
        </Pressable>
        <Text style={styles.linkSeparator}>·</Text>
        <Pressable
          onPress={() => navigation.navigate('PrivacyPolicy')}
          hitSlop={HIT_SLOP}
          accessibilityRole="link"
          style={({ pressed }) => pressed && { opacity: 0.6 }}
        >
          <Text style={styles.linkText}>Gizlilik Politikası</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    right: SIZES.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  heroIcon: { alignSelf: 'center', marginTop: SIZES.xl, marginBottom: SIZES.md, ...SHADOWS.medium },
  title: { fontSize: SIZES.h2, fontWeight: '800', color: COLORS.text, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: SIZES.sm, marginBottom: SIZES.lg, paddingHorizontal: SIZES.sm },
  featureList: { gap: SIZES.sm + 2, marginBottom: SIZES.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm + 2 },
  featureText: { flex: 1, fontSize: SIZES.small, color: COLORS.text, lineHeight: 20 },
  planList: { gap: SIZES.sm + 2, marginBottom: SIZES.md },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  planCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceAlt },
  badge: { position: 'absolute', top: -10, right: SIZES.md, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: SIZES.radiusFull },
  badgeText: { fontSize: SIZES.micro + 1, fontWeight: '800', color: COLORS.white, letterSpacing: 0.3 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm + 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  planInfo: { flex: 1 },
  planLabel: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  planLabelSelected: { color: COLORS.primaryDark },
  planRate: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: 2 },
  planPriceWrap: { alignItems: 'flex-end', gap: 4 },
  planPrice: { fontSize: SIZES.h5, fontWeight: '800', color: COLORS.text },
  planPriceSelected: { color: COLORS.primaryDark },
  savingBadge: { backgroundColor: withAlpha(COLORS.primary, 0.12), paddingHorizontal: 8, paddingVertical: 2, borderRadius: SIZES.radiusFull },
  savingText: { fontSize: SIZES.micro + 1, fontWeight: '800', color: COLORS.primaryDark },
  restoreBtn: { alignSelf: 'center', marginTop: SIZES.xs },
  legal: { fontSize: SIZES.micro + 1, color: COLORS.textLight, lineHeight: 15, textAlign: 'center', marginTop: SIZES.sm },
  legalLinksRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SIZES.sm, marginTop: SIZES.sm, minHeight: SIZES.minTouch - 8 },
  linkText: { fontSize: SIZES.tiny, color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' },
  linkSeparator: { color: COLORS.textLight },
});
