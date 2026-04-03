import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { bodyInfoService } from '../services/supabase';

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, signOut, deleteAccount, updateProfile, leaveGuestMode, isGuest } = useAuth();
  const [bodyInfo, setBodyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadBodyInfo();
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
      Alert.alert('Uyarı', 'Lütfen adınızı ve soyadınızı girin.');
      return;
    }
    setSavingName(true);
    const { error } = await updateProfile({ full_name: fullName.trim() });
    setSavingName(false);
    if (error) {
      Alert.alert('Hata', 'İsim güncellenirken bir hata oluştu.');
    } else {
      setEditingName(false);
    }
  };

  const cancelEditName = () => {
    setFullName(user?.user_metadata?.full_name || '');
    setEditingName(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Hesabınızı ve tüm verilerinizi (diyet planları, kilo kayıtları, hedefler) kalıcı olarak silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount();
            if (error) {
              Alert.alert(
                'Hesap silinemedi',
                error.message ||
                  'Sunucu hesap silme işlemini reddetti. Supabase Edge Function (delete-account) dağıtıldı mı kontrol edin.'
              );
            }
          },
        },
      ]
    );
  };

  const bmi = getBMI();
  const bmiCategory = getBMICategory(bmi);

  if (!user && isGuest) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SIZES.lg }} />
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
          </View>
        </View>

        {/* Hesap İşlemleri */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            <Text style={styles.deleteText}>Hesabımı ve Tüm Verilerimi Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: SIZES.xl,
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
