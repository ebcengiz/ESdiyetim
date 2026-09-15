import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { bodyInfoService } from '../services/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useAIConsent } from '../contexts/AIConsentContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  PLAN_META,
  FREE_AI_SEARCH_DAILY_LIMIT,
  AI_SEARCH_USAGE_KEY,
  FALLBACK_PRICE_LABELS,
} from '../services/subscriptionService';
import { getDailyUsageCount } from '../services/dailyUsageService';
import ConfirmModal from '../components/ui/ConfirmModal';
import Skeleton from '../components/ui/Skeleton';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
  const [savingName, setSavingName] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadBodyInfo();
    getDailyUsageCount(AI_SEARCH_USAGE_KEY).then(setAiSearchUsed).catch(() => {});
  }, [user]);

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name || '');
  }, [user?.user_metadata?.full_name]);

  const loadBodyInfo = async () => {
    if (!user) return;
    try {
      const data = await bodyInfoService.getLatest();
      setBodyInfo(data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getBMI = () => {
    if (!bodyInfo?.height || !bodyInfo?.weight) return null;
    const h = bodyInfo.height / 100;
    return (bodyInfo.weight / (h * h)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    const b = parseFloat(bmi);
    if (b < 18.5) return { name: 'Zayıf', color: COLORS.info };
    if (b < 25) return { name: 'Normal', color: COLORS.success };
    if (b < 30) return { name: 'Fazla Kilolu', color: COLORS.warning };
    return { name: 'Obez', color: COLORS.error };
  };

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      showToast('Lütfen adınızı ve soyadınızı girin.', 'warning');
      return;
    }
    setSavingName(true);
    const { error } = await updateProfile({ full_name: fullName.trim() });
    setSavingName(false);
    if (error) {
      showToast('İsim güncellenirken bir hata oluştu.', 'error');
    } else {
      showToast('İsim güncellendi.', 'success');
      setEditingName(false);
    }
  };

  const cancelEditName = () => {
    setFullName(user?.user_metadata?.full_name || '');
    setEditingName(false);
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    const { error } = await signOut();
    if (error) showToast('Çıkış yapılırken bir hata oluştu.', 'error');
  };

  const handleDeleteAccount = () => setShowDeleteModal(true);

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false);
    const { error } = await deleteAccount();
    if (error) handleError(error, { context: 'profile.deleteAccount' });
  };

  const bmi = getBMI();
  const bmiCategory = getBMICategory(bmi);

  if (!user && isGuest) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>M</Text>
            </View>
          </View>
          <Text style={styles.userName}>Misafir</Text>
          <Text style={styles.userEmail}>Hesap olmadan geziniyorsunuz</Text>
        </LinearGradient>
        <View style={styles.content}>
          <Text style={styles.guestExplainer}>
            Yalnızca sağlık ipuçları hesap olmadan kullanılabilir. Fotoğraftan kalori, diyet planı, kilo
            takibi, VKİ ve hedefler için giriş yapın veya kayıt olun.
          </Text>
          <TouchableOpacity
            style={styles.guestSourcesLink}
            onPress={() => navigation.navigate('HealthSourcesInfo')}
            activeOpacity={0.75}
          >
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            <Text style={styles.guestSourcesLinkText}>Kaynaklar ve sağlık uyarıları</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestSourcesLink}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            activeOpacity={0.75}
          >
            <Ionicons name="shield-outline" size={18} color={COLORS.primary} />
            <Text style={styles.guestSourcesLinkText}>Gizlilik politikası</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestPrimaryBtn}
            onPress={() => leaveGuestMode()}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.guestPrimaryGrad}
            >
              <Ionicons name="log-in-outline" size={22} color={COLORS.textOnPrimary} />
              <Text style={styles.guestPrimaryText}>Giriş yap veya kayıt ol</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 28 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
        </View>

        <Text style={styles.userName}>
          {user?.user_metadata?.full_name || 'İsim Ekle'}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Vücut Bilgileri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="body-outline" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Vücut Bilgileri</Text>
          </View>

          {loading ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Skeleton width={22} height={22} borderRadius={11} />
                  <Skeleton width={30} height={18} style={{ marginTop: 4 }} />
                  <Skeleton width={44} height={10} />
                </View>
                <View style={styles.statItem}>
                  <Skeleton width={22} height={22} borderRadius={11} />
                  <Skeleton width={30} height={18} style={{ marginTop: 4 }} />
                  <Skeleton width={44} height={10} />
                </View>
                <View style={styles.statItem}>
                  <Skeleton width={22} height={22} borderRadius={11} />
                  <Skeleton width={30} height={18} style={{ marginTop: 4 }} />
                  <Skeleton width={44} height={10} />
                </View>
              </View>
              <Skeleton height={44} borderRadius={SIZES.radiusMedium} />
            </>
          ) : bodyInfo ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Ionicons name="resize" size={22} color={COLORS.primary} />
                  <Text style={styles.statValue}>{bodyInfo.height}</Text>
                  <Text style={styles.statLabel}>cm / Boy</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="fitness" size={22} color={COLORS.primary} />
                  <Text style={styles.statValue}>{bodyInfo.weight}</Text>
                  <Text style={styles.statLabel}>kg / Kilo</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={22} color={COLORS.primary} />
                  <Text style={styles.statValue}>{bodyInfo.age}</Text>
                  <Text style={styles.statLabel}>Yaş</Text>
                </View>
              </View>

              {bmi && bmiCategory && (
                <View style={[styles.bmiRow, { borderColor: bmiCategory.color + '40' }]}>
                  <View style={[styles.bmiDot, { backgroundColor: bmiCategory.color }]} />
                  <Text style={styles.bmiLabel}>VKİ:</Text>
                  <Text style={[styles.bmiValue, { color: bmiCategory.color }]}>{bmi}</Text>
                  <Text style={[styles.bmiCategory, { color: bmiCategory.color }]}>— {bmiCategory.name}</Text>
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => navigation.navigate('WeightAndBMI')}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.emptyText}>Vücut bilgilerini ekle</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Üyelik */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Üyelik</Text>
          </View>

          {isSubscribed ? (
            <View style={styles.membershipCard}>
              <View style={styles.membershipBadgeRow}>
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={14} color="white" />
                  <Text style={styles.premiumBadgeText}>Premium Aktif</Text>
                </View>
              </View>
              <Text style={styles.membershipLine}>
                Fotoğraftan kalori analizi: bugün {dailyPhotoUsed}/{dailyLimit} kullanıldı
              </Text>
              <Text style={styles.membershipLine}>AI ile tam analiz: sınırsız</Text>
              <TouchableOpacity
                style={styles.manageSubBtn}
                onPress={() =>
                  Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')
                }
                activeOpacity={0.7}
              >
                <Text style={styles.manageSubText}>Aboneliği App Store'dan yönet</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.membershipCard}>
              <Text style={styles.membershipFreeTitle}>Ücretsiz Plan</Text>
              <Text style={styles.membershipLine}>
                Diyet planı, kilo & VKİ takibi, hedefler ve tavsiyeler herkese tamamen ücretsiz.
              </Text>
              <View style={styles.usageRow}>
                <Ionicons name="camera-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.usageText}>
                  Fotoğraftan kalori analizi: bugün {dailyPhotoUsed}/{dailyLimit} kullanıldı
                </Text>
              </View>
              <View style={styles.usageRow}>
                <Ionicons name="sparkles-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.usageText}>
                  AI ile tam analiz: bugün {aiSearchUsed}/{FREE_AI_SEARCH_DAILY_LIMIT} kullanıldı
                </Text>
              </View>
              <Text style={styles.membershipPricing}>
                Premium: Aylık {FALLBACK_PRICE_LABELS.monthly} · 3 Aylık {FALLBACK_PRICE_LABELS.quarterly} · Yıllık {FALLBACK_PRICE_LABELS.yearly}
              </Text>
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={openPaywall}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Premium'a Geç</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textOnPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Hesap Bilgileri */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.nameBlock}>
              <View style={styles.nameBlockHeader}>
                <View style={styles.nameBlockTitleRow}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.infoLabel}>Ad Soyad</Text>
                </View>
                {!editingName ? (
                  <TouchableOpacity
                    onPress={() => setEditingName(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editLink}>Düzenle</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {editingName ? (
                <View style={styles.nameEditBox}>
                  <TextInput
                    style={styles.nameFieldInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Adınız ve soyadınız"
                    placeholderTextColor={COLORS.textLight}
                    autoCapitalize="words"
                    editable={!savingName}
                  />
                  <View style={styles.nameEditActions}>
                    <TouchableOpacity
                      style={styles.nameBtnSecondary}
                      onPress={cancelEditName}
                      disabled={savingName}
                    >
                      <Text style={styles.nameBtnSecondaryText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.nameBtnPrimary}
                      onPress={handleSaveName}
                      disabled={savingName}
                    >
                      {savingName ? (
                        <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
                      ) : (
                        <Text style={styles.nameBtnPrimaryText}>Kaydet</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.nameDisplay}>
                  {user?.user_metadata?.full_name?.trim() || 'Henüz eklenmedi'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-posta</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.success} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Hesap Durumu</Text>
                <Text style={[styles.infoValue, { color: COLORS.success }]}>Aktif</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Uygulama Ayarları */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Uygulama</Text>
          </View>

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('WeightAndBMI')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.highlight }]}>
                  <Ionicons name="body-outline" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.menuText}>Vücut Bilgilerini Düzenle</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('Goals')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.highlight }]}>
                  <Ionicons name="trophy-outline" size={18} color={COLORS.primaryDark} />
                </View>
                <Text style={styles.menuText}>Hedeflerim</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('HealthSourcesInfo')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.accent }]}>
                  <Ionicons name="library-outline" size={18} color={COLORS.primaryDark} />
                </View>
                <View>
                  <Text style={styles.menuText}>Kaynaklar ve uyarılar</Text>
                  <Text style={styles.menuSub}>Tıbbi uyarı, resmî bağlantılar</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.highlight }]}>
                  <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.menuText}>Gizlilik politikası</Text>
                  <Text style={styles.menuSub}>Veri toplama ve üçüncü taraflar</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.menuItem}>
              <View style={[styles.menuLeft, { flex: 1 }]}>
                <View style={[styles.menuIcon, { backgroundColor: COLORS.highlight }]}>
                  <Ionicons name="hardware-chip-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.menuText}>Yapay Zeka Veri Paylaşımı</Text>
                  <Text style={styles.menuSub} numberOfLines={2}>
                    {aiConsent.granted
                      ? `${aiProviders.join(' ve ')} ile paylaşım açık`
                      : 'Kapalı — AI önerileri ve fotoğraf analizi çalışmaz'}
                  </Text>
                </View>
              </View>
              <Switch
                value={!!aiConsent.granted}
                onValueChange={(value) => (value ? grantConsent() : revokeConsent())}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFFFFF"
                style={{ flexShrink: 0 }}
              />
            </View>
          </View>
        </View>

        {/* Hesap — Apple 5.1.1(v): hesap silme uygulama içinde başlatılır */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-remove-outline" size={20} color={COLORS.text} />
            <Text style={styles.sectionTitle}>Hesap ve veriler</Text>
          </View>
          <Text style={styles.accountPolicyHint}>
            Hesabınızı silmek, sunucudaki profilinizi ve bu hesaba bağlı kayıtları kaldırır (pasifleştirme değil, kalıcı silme).
          </Text>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Hesabı ve tüm verileri kalıcı olarak sil"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.deleteText}>Hesabımı ve Tüm Verilerimi Sil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Confirm */}
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

      {/* Delete Account Confirm */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Hesabı Sil"
        message="Tüm verileriniz (diyet planları, kilo kayıtları, vücut bilgileri, hedefler) kalıcı olarak silinir. Bu işlem geri alınamaz."
        confirmText="Evet, Sil"
        cancelText="İptal"
        type="danger"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingBottom: SIZES.xl,
    paddingHorizontal: SIZES.containerPadding,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  nameBlock: {
    paddingVertical: SIZES.sm,
  },
  nameBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  nameBlockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  editLink: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nameDisplay: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 26, // ikon (18) + nameBlockTitleRow gap (SIZES.sm=8) ile hizalı
  },
  nameEditBox: {
    gap: SIZES.md,
  },
  nameFieldInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    backgroundColor: COLORS.surfaceAlt,
  },
  nameEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.sm,
  },
  nameBtnSecondary: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nameBtnSecondaryText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  nameBtnPrimary: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.primary,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBtnPrimaryText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  userName: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginBottom: SIZES.xs,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.85,
    textAlign: 'center',
  },
  content: {
    padding: SIZES.containerPadding,
  },
  section: {
    marginBottom: SIZES.sectionSpacing,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: COLORS.text,
  },
  accountPolicyHint: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.md,
    marginTop: -SIZES.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    alignItems: 'center',
    gap: SIZES.xs,
    ...SHADOWS.small,
  },
  statValue: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  bmiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bmiLabel: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  bmiValue: {
    fontSize: SIZES.h4,
    fontWeight: '700',
  },
  bmiCategory: {
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    ...SHADOWS.small,
  },
  membershipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    ...SHADOWS.small,
  },
  membershipBadgeRow: { flexDirection: 'row' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.sm + 2,
    paddingVertical: 6,
  },
  premiumBadgeText: { fontSize: SIZES.small, fontWeight: '700', color: 'white' },
  membershipFreeTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  membershipLine: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 20 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  usageText: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary },
  membershipPricing: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSmall,
    paddingVertical: SIZES.sm + 2,
    marginTop: SIZES.xs,
  },
  upgradeBtnText: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.textOnPrimary },
  manageSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SIZES.xs,
  },
  manageSubText: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.primary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.xs,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuSub: {
    fontSize: SIZES.micro + 1,
    color: COLORS.textLight,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    ...SHADOWS.small,
  },
  logoutText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    ...SHADOWS.small,
  },
  deleteText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.error,
  },
  guestExplainer: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SIZES.md,
  },
  guestSourcesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  guestSourcesLinkText: {
    flex: 1,
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.text,
  },
  guestPrimaryBtn: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  guestPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.md + 2,
  },
  guestPrimaryText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
});
