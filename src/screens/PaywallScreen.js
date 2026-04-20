import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import {
  purchaseSubscription,
  restorePurchases,
  isActivePurchase,
  PLAN_META,
} from '../services/subscriptionService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useToast } from '../contexts/ToastContext';

const FEATURES = [
  { icon: 'home', text: 'Kişisel ana sayfa ve günlük özet' },
  { icon: 'restaurant', text: 'AI destekli günlük diyet planı' },
  { icon: 'camera', text: 'Günde 3 fotoğraftan kalori analizi' },
  { icon: 'fitness', text: 'Kilo & VKİ takibi ve grafik geçmişi' },
  { icon: 'trophy', text: 'Hedef belirleme ve ilerleme takibi' },
  { icon: 'bulb', text: 'Kişiselleştirilmiş sağlık tavsiyeleri' },
  { icon: 'stats-chart', text: 'Detaylı besin değeri analizi' },
  { icon: 'infinite', text: 'Reklamsız ve sınırsız kullanım' },
];

export default function PaywallScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { refreshSubscription, products, activateTestSubscription } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState(PLAN_META[2].id); // yearly default
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Ürün fiyatını Store'dan al, yoksa sabit göster
  const getPriceLabel = (planKey) => {
    const storeProduct = products.find((p) => p.productId === planKey);
    if (storeProduct?.localizedPrice) return storeProduct.localizedPrice;
    const meta = { monthly: '₺249,99', quarterly: '₺149,99', yearly: '₺79,99' };
    return meta[PLAN_META.find((p) => p.id === planKey)?.key] ?? '—';
  };

  const handlePurchase = async () => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const result = await purchaseSubscription(selectedPlan);
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
      showToast(e?.message || 'Satın alma başarısız. Tekrar deneyin.', 'error');
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
        Alert.alert('Geri Yükleme', 'Bu Apple ID ile aktif bir abonelik bulunamadı.');
      }
    } catch {
      showToast('Geri yükleme başarısız. Tekrar deneyin.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Kapat butonu */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Başlık */}
        <LinearGradient
          colors={['#6366F1', '#818CF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name="star" size={34} color="white" />
        </LinearGradient>

        <Text style={styles.title}>ESdiyet Premium</Text>
        <Text style={styles.subtitle}>
          Tüm premium özelliklere sınırsız eriş: diyet planı, kilo & VKİ takibi, hedefler,
          kişisel tavsiyeler ve fotoğraftan kalori analizi.
        </Text>

        {/* Özellik listesi */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Plan kartları */}
        <Text style={styles.sectionLabel}>Abonelik Seçin</Text>
        <View style={styles.planList}>
          {PLAN_META.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
              >
                {plan.highlight && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>En İyi Değer</Text>
                  </View>
                )}
                <View style={styles.planRow}>
                  <View style={styles.planRadio}>
                    {selected && <View style={styles.planRadioInner} />}
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>
                      {plan.label}
                    </Text>
                    <Text style={styles.planRate}>{plan.monthlyRate}</Text>
                  </View>
                  <View style={styles.planPriceWrap}>
                    <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
                      {getPriceLabel(plan.id)}
                    </Text>
                    {plan.savingPct && (
                      <View style={styles.savingBadge}>
                        <Text style={styles.savingText}>-%{plan.savingPct}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Satın al butonu */}
        <TouchableOpacity
          style={[styles.buyBtn, purchasing && styles.buyBtnDisabled]}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={purchasing}
        >
          <LinearGradient
            colors={[COLORS.primaryDark, COLORS.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyGradient}
          >
            {purchasing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buyText}>Abone Ol</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
          activeOpacity={0.7}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={COLORS.textLight} />
          ) : (
            <Text style={styles.restoreText}>Mevcut aboneliği geri yükle</Text>
          )}
        </TouchableOpacity>

        {/* Yasal uyarı */}
        <Text style={styles.legal}>
          Abonelikler iTunes hesabınızdan otomatik olarak yenilenir. Yenileme döneminden en az 24 saat önce iptal edilmezse dönem sonunda aynı fiyattan otomatik yenilenir. Aboneliği iTunes hesap ayarlarından yönetebilir ve satın alma sonrası iptal edebilirsiniz. Ödeme onaylandıktan sonra mevcut dönem için iade yapılmaz.
        </Text>

        {/* EULA + Gizlilik bağlantıları (Apple 3.1.2(c) zorunluluk) */}
        <View style={styles.legalLinksRow}>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
              )
            }
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>Kullanım Koşulları (EULA)</Text>
          </TouchableOpacity>
          <Text style={styles.linkSeparator}>·</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrivacyPolicy')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>Gizlilik Politikası</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 60 },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },

  featureList: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    ...SHADOWS.small,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  planList: { width: '100%', gap: 10, marginBottom: 24 },
  planCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    ...SHADOWS.small,
  },
  planCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accent,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: 'white' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  planInfo: { flex: 1 },
  planLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  planLabelSelected: { color: COLORS.text },
  planRate: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  planPriceWrap: { alignItems: 'flex-end', gap: 4 },
  planPrice: { fontSize: 16, fontWeight: '800', color: COLORS.textSecondary },
  planPriceSelected: { color: COLORS.primary },
  savingBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryDark },

  buyBtn: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12, ...SHADOWS.medium },
  buyBtnDisabled: { opacity: 0.7 },
  buyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: { fontSize: 17, fontWeight: '800', color: 'white', letterSpacing: 0.3 },

  restoreBtn: { paddingVertical: 10, marginBottom: 16 },
  restoreText: { fontSize: 14, color: COLORS.textLight, textDecorationLine: 'underline' },

  legal: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
  },
  linkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  linkSeparator: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
