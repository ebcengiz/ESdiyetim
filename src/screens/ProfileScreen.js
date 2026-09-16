import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE, whiteAlpha, withAlpha } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { bodyInfoService } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useAIConsent } from '../contexts/AIConsentContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FREE_AI_SEARCH_DAILY_LIMIT, AI_SEARCH_USAGE_KEY, FALLBACK_PRICE_LABELS } from '../services/subscriptionService';
import { getDailyUsageCount } from '../services/dailyUsageService';
import { calculateBMI, getBMICategory } from '../utils/bmi';
import {
  ScreenContainer, HeroHeader, AppCard, AppButton, AppInput, ListRow, ConfirmModal, Skeleton, ProgressBar,
} from '../components/ui';

/** Ad soyad → baş harfler */
function initialsOf(user) {
  const name = user?.user_metadata?.full_name || user?.email || '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Boy / Kilo / Yaş üçlüsü */
function BodyStat({ icon, value, unit, label }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${value} ${unit}`}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.statValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {value}<Text style={styles.statUnit}> {unit}</Text>
      </Text>
      <Text style={styles.statLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
    </View>
  );
}

/** Günlük kullanım satırı (fotoğraf analizi / AI analiz) */
function UsageRow({ icon, label, used, limit }) {
  const unlimited = limit == null;
  return (
    <View style={styles.usage}>
      <View style={styles.usageTop}>
        <Ionicons name={icon} size={15} color={COLORS.textSecondary} />
        <Text style={styles.usageLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
        <Text style={styles.usageValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {unlimited ? 'Sınırsız' : `${used}/${limit} bugün`}
        </Text>
      </View>
      {!unlimited && <ProgressBar value={limit ? used / limit : 0} height={5} style={styles.usageBar} />}
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, signOut, deleteAccount, updateProfile, leaveGuestMode, isGuest } = useAuth();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const { consent: aiConsent, providers: aiProviders, grantConsent, revokeConsent } = useAIConsent();
  const { isSubscribed, dailyPhotoUsed, dailyLimit, openPaywall } = useSubscription();
  const [bodyInfo, setBodyInfo] = useState(null);
  const [aiSearchUsed, setAiSearchUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [nameError, setNameError] = useState(null);
  const [savingName, setSavingName] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadBodyInfo();
    getDailyUsageCount(AI_SEARCH_USAGE_KEY).then(setAiSearchUsed).catch(() => {});
  }, [user]);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
  }, [user?.user_metadata?.full_name]);

  const loadBodyInfo = async () => {
    if (!user) return;
    try {
      setBodyInfo(await bodyInfoService.getLatest());
    } catch (e) {
      handleError(e, { context: 'profile.bodyInfo', silent: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) { setNameError('Adınızı ve soyadınızı girin.'); return; }
    setSavingName(true);
    const { error } = await updateProfile({ full_name: fullName.trim() });
    setSavingName(false);
    if (error) handleError(error, { context: 'profile.updateName', onRetry: handleSaveName });
    else { showToast('İsim güncellendi.', 'success'); setEditingName(false); }
  };

  const cancelEditName = () => {
    setFullName(user?.user_metadata?.full_name || '');
    setNameError(null);
    setEditingName(false);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    const { error } = await signOut();
    if (error) handleError(error, { context: 'profile.signOut' });
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await deleteAccount();
    setDeleting(false);
    setShowDeleteModal(false);
    if (error) handleError(error, { context: 'profile.deleteAccount' });
  };

  const bmi = bodyInfo ? calculateBMI(bodyInfo.height, bodyInfo.weight) : null;
  const bmiCategory = getBMICategory(bmi);
  const isGuestView = !user && isGuest;

  // Kompakt başlık: avatar (sol) + ad (başlık) + e-posta (meta) + Premium rozeti (sağ)
  const header = (
    <HeroHeader
      title={isGuestView ? 'Misafir' : user?.user_metadata?.full_name || 'İsim Ekle'}
      meta={isGuestView ? 'Hesap olmadan geziniyorsunuz' : user?.email}
      left={
        <View style={styles.avatar} accessibilityLabel="Profil avatarı">
          <Text style={styles.avatarText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{isGuestView ? 'M' : initialsOf(user)}</Text>
        </View>
      }
      right={
        isSubscribed && !isGuestView ? (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={12} color={COLORS.warningText} />
            <Text style={styles.premiumBadgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>Premium</Text>
          </View>
        ) : null
      }
    />
  );

  // ── Misafir görünümü ──────────────────────────────────────────────────────
  if (isGuestView) {
    return (
      <ScreenContainer tab edges={[]} header={header}>
        <AppCard>
          <Text style={styles.guestText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Yalnızca sağlık ipuçları hesap olmadan kullanılabilir. Fotoğraftan kalori, diyet planı, kilo
            takibi, VKİ ve hedefler için giriş yapın veya kayıt olun.
          </Text>
          <AppButton title="Giriş yap veya kayıt ol" icon="log-in-outline" size="lg" fullWidth onPress={leaveGuestMode} />
        </AppCard>
        <AppCard title="Bilgi" icon="information-circle-outline" padding={SIZES.md}>
          <ListRow icon="library-outline" title="Kaynaklar ve sağlık uyarıları" onPress={() => navigation.navigate('HealthSourcesInfo')} />
          <ListRow icon="shield-outline" title="Gizlilik politikası" onPress={() => navigation.navigate('PrivacyPolicy')} last />
        </AppCard>
      </ScreenContainer>
    );
  }

  // ── Üye görünümü ──────────────────────────────────────────────────────────
  return (
    <>
      <ScreenContainer tab edges={[]} header={header} keyboard>
        {/* Vücut bilgileri */}
        <AppCard
          title="Vücut Bilgileri"
          icon="body-outline"
          actionLabel="Düzenle"
          onAction={() => navigation.navigate('WeightAndBMI')}
        >
          {loading ? (
            <View style={styles.statsRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={styles.stat}>
                  <Skeleton width={22} height={22} borderRadius={11} />
                  <Skeleton width={36} height={18} style={{ marginTop: 6 }} />
                  <Skeleton width={44} height={10} style={{ marginTop: 6 }} />
                </View>
              ))}
            </View>
          ) : bodyInfo ? (
            <>
              <View style={styles.statsRow}>
                <BodyStat icon="resize-outline" value={bodyInfo.height} unit="cm" label="Boy" />
                <BodyStat icon="fitness-outline" value={bodyInfo.weight} unit="kg" label="Kilo" />
                <BodyStat icon="calendar-outline" value={bodyInfo.age} unit="" label="Yaş" />
              </View>
              {bmi && bmiCategory && (
                <View style={[styles.bmiRow, { backgroundColor: withAlpha(bmiCategory.color, 0.08), borderColor: withAlpha(bmiCategory.color, 0.3) }]}>
                  <View style={[styles.bmiDot, { backgroundColor: bmiCategory.color }]} />
                  <Text style={styles.bmiLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>VKİ</Text>
                  <Text style={[styles.bmiValue, { color: bmiCategory.color }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{bmi}</Text>
                  <Text style={[styles.bmiCat, { color: bmiCategory.color }]} maxFontSizeMultiplier={MAX_FONT_SCALE}>{bmiCategory.name}</Text>
                </View>
              )}
            </>
          ) : (
            <AppButton title="Vücut bilgilerini ekle" icon="add-circle-outline" variant="secondary" fullWidth onPress={() => navigation.navigate('WeightAndBMI')} />
          )}
        </AppCard>

        {/* Üyelik */}
        <AppCard title="Üyelik" icon="star-outline" subtitle={isSubscribed ? 'Premium aktif' : 'Ücretsiz plan'}>
          {!isSubscribed && (
            <Text style={styles.membershipLine} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              Diyet planı, kilo & VKİ takibi, hedefler ve tavsiyeler herkese tamamen ücretsiz.
            </Text>
          )}
          <UsageRow icon="camera-outline" label="Fotoğraftan kalori" used={dailyPhotoUsed} limit={dailyLimit} />
          <UsageRow icon="sparkles-outline" label="AI ile tam analiz" used={aiSearchUsed} limit={isSubscribed ? null : FREE_AI_SEARCH_DAILY_LIMIT} />
          {isSubscribed ? (
            <AppButton
              title="Aboneliği App Store'dan yönet"
              iconRight="open-outline"
              variant="ghost"
              size="sm"
              onPress={() => Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')}
              style={styles.manageBtn}
            />
          ) : (
            <>
              <Text style={styles.pricing} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                Premium: Aylık {FALLBACK_PRICE_LABELS.monthly} · 3 Aylık {FALLBACK_PRICE_LABELS.quarterly} · Yıllık {FALLBACK_PRICE_LABELS.yearly}
              </Text>
              <AppButton title="Premium'a Geç" iconRight="chevron-forward" fullWidth onPress={openPaywall} />
            </>
          )}
        </AppCard>

        {/* Hesap bilgileri */}
        <AppCard
          title="Hesap Bilgileri"
          icon="person-outline"
          actionLabel={editingName ? undefined : 'Düzenle'}
          onAction={editingName ? undefined : () => setEditingName(true)}
          padding={SIZES.md}
        >
          {editingName ? (
            <View style={styles.nameEdit}>
              <AppInput
                label="Ad Soyad"
                icon="person-outline"
                value={fullName}
                onChangeText={(t) => { setFullName(t); if (nameError) setNameError(null); }}
                error={nameError}
                placeholder="Adınız ve soyadınız"
                autoCapitalize="words"
                autoFocus
                editable={!savingName}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <View style={styles.nameActions}>
                <AppButton title="İptal" variant="secondary" size="sm" onPress={cancelEditName} disabled={savingName} haptic={false} />
                <AppButton title="Kaydet" icon="checkmark" size="sm" onPress={handleSaveName} loading={savingName} />
              </View>
            </View>
          ) : (
            <ListRow icon="person-outline" title="Ad Soyad" value={user?.user_metadata?.full_name?.trim() || 'Henüz eklenmedi'} />
          )}
          <ListRow icon="mail-outline" title="E-posta" value={user?.email} />
          <ListRow icon="shield-checkmark-outline" iconColor={COLORS.success} title="Hesap Durumu" value="Aktif" valueColor={COLORS.success} last />
        </AppCard>

        {/* Uygulama */}
        <AppCard title="Uygulama" icon="settings-outline" padding={SIZES.md}>
          <ListRow icon="body-outline" title="Vücut Bilgilerini Düzenle" onPress={() => navigation.navigate('WeightAndBMI')} />
          <ListRow icon="trophy-outline" iconColor={COLORS.accents.indigo} title="Hedeflerim" onPress={() => navigation.navigate('Goals')} />
          <ListRow icon="library-outline" title="Kaynaklar ve uyarılar" subtitle="Tıbbi uyarı, resmî bağlantılar" onPress={() => navigation.navigate('HealthSourcesInfo')} />
          <ListRow icon="document-text-outline" title="Gizlilik politikası" subtitle="Veri toplama ve üçüncü taraflar" onPress={() => navigation.navigate('PrivacyPolicy')} />
          <ListRow
            icon="hardware-chip-outline"
            title="Yapay Zeka Veri Paylaşımı"
            subtitle={aiConsent.granted ? `${aiProviders.join(' ve ')} ile paylaşım açık` : 'Kapalı — AI önerileri ve fotoğraf analizi çalışmaz'}
            switchValue={!!aiConsent.granted}
            onSwitch={(value) => (value ? grantConsent() : revokeConsent())}
            last
          />
        </AppCard>

        {/* Hesap ve veriler — Apple 5.1.1(v): hesap silme uygulama içinde başlatılır */}
        <AppCard title="Hesap ve veriler" icon="person-remove-outline" padding={SIZES.md}>
          <Text style={styles.policyHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Hesabınızı silmek, sunucudaki profilinizi ve bu hesaba bağlı kayıtları kaldırır (pasifleştirme değil, kalıcı silme).
          </Text>
          <ListRow icon="log-out-outline" title="Çıkış Yap" onPress={() => setShowLogoutModal(true)} />
          <ListRow
            icon="trash-outline"
            title="Hesabımı ve Tüm Verilerimi Sil"
            destructive
            onPress={() => setShowDeleteModal(true)}
            accessibilityLabel="Hesabı ve tüm verileri kalıcı olarak sil"
            last
          />
        </AppCard>
      </ScreenContainer>

      <ConfirmModal
        visible={showLogoutModal}
        title="Çıkış Yap"
        message="Hesabınızdan çıkmak istediğinize emin misiniz?"
        confirmText="Çıkış Yap"
        cancelText="İptal"
        type="default"
        icon="log-out-outline"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
      <ConfirmModal
        visible={showDeleteModal}
        title="Hesabı Sil"
        message="Tüm verileriniz (diyet planları, kilo kayıtları, vücut bilgileri, hedefler) kalıcı olarak silinir. Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        type="danger"
        loading={deleting}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: whiteAlpha(0.25),
    borderWidth: 2,
    borderColor: whiteAlpha(0.6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.textOnPrimary },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.warningBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusFull },
  premiumBadgeText: { fontSize: SIZES.tiny, fontWeight: '800', color: COLORS.warningText },
  guestText: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SIZES.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginBottom: SIZES.sm + 2 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text },
  statUnit: { fontSize: SIZES.tiny, fontWeight: '600', color: COLORS.textSecondary },
  statLabel: { fontSize: SIZES.tiny, color: COLORS.textLight },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, borderRadius: SIZES.radiusMedium, borderWidth: 1, paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm + 2 },
  bmiDot: { width: 10, height: 10, borderRadius: 5 },
  bmiLabel: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary },
  bmiValue: { fontSize: SIZES.h5, fontWeight: '800' },
  bmiCat: { fontSize: SIZES.small, fontWeight: '700', flex: 1 },
  membershipLine: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SIZES.sm },
  usage: { marginBottom: SIZES.sm + 2 },
  usageTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  usageLabel: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary },
  usageValue: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text },
  usageBar: {},
  manageBtn: { alignSelf: 'flex-start', marginTop: SIZES.xs },
  pricing: { fontSize: SIZES.tiny, color: COLORS.textLight, marginBottom: SIZES.sm + 4, lineHeight: 16 },
  nameEdit: { paddingBottom: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider, marginBottom: SIZES.xs },
  nameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SIZES.sm },
  policyHint: { fontSize: SIZES.tiny, color: COLORS.textSecondary, lineHeight: 17, marginBottom: SIZES.sm },
});
