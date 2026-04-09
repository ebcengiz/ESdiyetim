import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { dietPlanService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import HealthSourcesCard from '../components/HealthSourcesCard';
import GuestGateBanner from '../components/GuestGateBanner';
import { useAuth } from '../contexts/AuthContext';
import { useFormModal } from '../hooks/useFormModal';
import { toDateString, formatShortDate } from '../utils/date';

const EMPTY_DIET_PLAN = {
  breakfast: '', morning_snack: '', lunch: '',
  afternoon_snack: '', dinner: '', evening_snack: '',
  notes: '', total_calories: '',
};

const MEAL_FIELDS = [
  { key: 'breakfast',      icon: 'sunny',        label: 'Kahvaltı',    placeholder: 'Kahvaltıda ne yediniz?',           compact: false },
  { key: 'lunch',          icon: 'partly-sunny', label: 'Öğle Yemeği', placeholder: 'Öğle yemeğinde ne yediniz?',      compact: false },
  { key: 'dinner',         icon: 'moon',         label: 'Akşam Yemeği',placeholder: 'Akşam yemeğinde ne yediniz?',     compact: false },
  { key: 'morning_snack',  icon: 'cafe',         label: 'Kuşluk',      placeholder: 'Sabah ara öğünü...',              compact: true  },
  { key: 'afternoon_snack',icon: 'nutrition',    label: 'İkindi',      placeholder: 'Öğleden sonra ara öğünü...',      compact: true  },
  { key: 'evening_snack',  icon: 'moon-outline', label: 'Gece',        placeholder: 'Akşam ara öğünü...',              compact: true  },
];

const getFilledMealsCount = (plan) =>
  [plan.breakfast, plan.lunch, plan.dinner, plan.morning_snack, plan.afternoon_snack, plan.evening_snack]
    .filter((m) => typeof m === 'string' && m.trim().length > 0).length;

export default function DietPlanScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [dietPlans, setDietPlans] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const modal = useFormModal(EMPTY_DIET_PLAN);

  const stats = useMemo(() => {
    if (!dietPlans || dietPlans.length === 0) return null;
    const totalPlans = dietPlans.length;
    const withCalories = dietPlans.filter((p) => p.total_calories).length;
    const avgCalories = withCalories > 0 ? Math.round(dietPlans.reduce((sum, p) => sum + (p.total_calories || 0), 0) / withCalories) : 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyPlans = dietPlans.filter((p) => new Date(p.date) >= thirtyDaysAgo).length;
    return { totalPlans, avgCalories, monthlyPlans };
  }, [dietPlans]);

  useEffect(() => {
    if (!user) { setDietPlans([]); setAiAdvice(''); setLoadingAdvice(false); return; }
    loadDietPlans();
  }, [user]);

  const loadDietPlans = async () => {
    if (!user) return;
    try {
      const data = await dietPlanService.getAll();
      setDietPlans(data || []);
      if (data?.length) fetchDietAdvice(data);
      else { setAiAdvice(''); setLoadingAdvice(false); }
    } catch (error) {
      console.error('Diyet planları yükleme hatası:', error);
      Alert.alert('Hata', 'Diyet planları yüklenirken bir hata oluştu.');
    }
  };

  const openAddModal = () => {
    if (!user) {
      Alert.alert('Giriş gerekli', 'Diyet planı oluşturmak için hesap açın veya giriş yapın.', [
        { text: 'Tamam', onPress: () => navigation.navigate('Profile') },
      ]);
      return;
    }
    setSelectedDate(new Date());
    setShowDatePicker(false);
    modal.openAdd();
  };

  const openEditModal = (plan) => {
    setSelectedDate(new Date(plan.date));
    setShowDatePicker(false);
    modal.openEdit(plan, (p) => ({
      breakfast: p.breakfast || '', morning_snack: p.morning_snack || '',
      lunch: p.lunch || '', afternoon_snack: p.afternoon_snack || '',
      dinner: p.dinner || '', evening_snack: p.evening_snack || '',
      notes: p.notes || '', total_calories: p.total_calories?.toString() || '',
    }));
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (!date) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const picked = new Date(date);
    picked.setHours(0, 0, 0, 0);

    if (picked < today) {
      setSelectedDate(today);
      return;
    }

    setSelectedDate(picked);
  };

  const saveDietPlan = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const picked = new Date(selectedDate);
      picked.setHours(0, 0, 0, 0);
      if (picked < today) {
        Alert.alert('Geçersiz tarih', 'Plan tarihi bugünden önce olamaz.');
        return;
      }

      const planData = {
        date: toDateString(selectedDate),
        breakfast: modal.form.breakfast,
        morning_snack: modal.form.morning_snack,
        lunch: modal.form.lunch,
        afternoon_snack: modal.form.afternoon_snack,
        dinner: modal.form.dinner,
        evening_snack: modal.form.evening_snack,
        notes: modal.form.notes,
        total_calories: modal.form.total_calories ? parseInt(modal.form.total_calories) : null,
      };
      if (modal.editingId) {
        await dietPlanService.update(modal.editingId, planData);
        Alert.alert('✅ Başarılı', 'Diyet planı güncellendi!');
      } else {
        const existingForDate = (dietPlans || []).find(
          (p) => toDateString(new Date(p.date)) === planData.date
        );
        if (existingForDate?.id) {
          await dietPlanService.update(existingForDate.id, planData);
          Alert.alert('✅ Başarılı', 'Aynı günün planı güncellendi!');
        } else {
          await dietPlanService.create(planData);
          Alert.alert('✅ Başarılı', 'Diyet planı eklendi!');
        }
      }
      modal.close();
      loadDietPlans();
    } catch (error) {
      console.error('Diyet planı kaydetme hatası:', error);
      Alert.alert('❌ Hata', 'Diyet planı kaydedilirken bir hata oluştu.');
    }
  };

  const deleteDietPlan = (id) => {
    Alert.alert('Diyet Planını Sil', 'Bu diyet planını silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await dietPlanService.delete(id);
            Alert.alert('✅ Başarılı', 'Diyet planı silindi!');
            loadDietPlans();
          } catch (error) {
            console.error('Diyet planı silme hatası:', error);
            Alert.alert('❌ Hata', 'Diyet planı silinirken bir hata oluştu.');
          }
        },
      },
    ]);
  };

  const fetchDietAdvice = async (currentPlans) => {
    const plans = Array.isArray(currentPlans) ? currentPlans : dietPlans;
    if (!stats && !plans?.length) return;
    const totalPlans = plans.length;
    const withCalories = plans.filter((p) => p.total_calories).length;
    const avgCalories = withCalories > 0 ? Math.round(plans.reduce((sum, p) => sum + (p.total_calories || 0), 0) / withCalories) : 0;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyPlans = plans.filter((p) => new Date(p.date) >= thirtyDaysAgo).length;
    const currentStats = { totalPlans, avgCalories, monthlyPlans };
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const result = await aiService.getDietPlanAdvice({ stats: currentStats, recentPlans: plans });
      setAiAdvice(result.advice || '');
    } catch {
      setAiAdvice('⚠️ Tavsiye alınamadı.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const getMealSummary = (plan) => {
    const meals = [];
    if (plan.breakfast) meals.push('Kahvaltı');
    if (plan.lunch) meals.push('Öğle');
    if (plan.dinner) meals.push('Akşam');
    return meals.length > 0 ? meals.join(' • ') : 'Öğün yok';
  };
  const modalFilledCount = [
    modal.form.breakfast,
    modal.form.lunch,
    modal.form.dinner,
    modal.form.morning_snack,
    modal.form.afternoon_snack,
    modal.form.evening_snack,
  ].filter((v) => typeof v === 'string' && v.trim().length > 0).length;
  const modalProgressPercent = Math.max(0, Math.min(100, Math.round((modalFilledCount / 6) * 100)));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={14} color={COLORS.textOnPrimary} />
            <Text style={styles.heroBadgeText}>AI destekli plan takibi</Text>
          </View>
          <Text style={styles.heroDateText}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={styles.heroTitle}>Diyet Planlarım</Text>
        <Text style={styles.heroSubtitle}>Öğünlerini kaydet, düzenle ve ilerlemeni takip et.</Text>
      </LinearGradient>

      {stats && (
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsHeader}>
          <StatCard label="Toplam Plan" value={stats.totalPlans} icon="restaurant" />
          <StatCard label="Ort. Kalori" value={stats.avgCalories > 0 ? `${stats.avgCalories}` : '-'} icon="flame" />
          <StatCard label="Bu Ay Eklenen" value={stats.monthlyPlans} icon="calendar" />
        </LinearGradient>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {!user ? (
            <GuestGateBanner navigation={navigation} message="Diyet planlarınız bulutta saklanır ve hesabınıza bağlıdır. Hesap oluşturarak veya giriş yaparak kullanabilirsiniz." />
          ) : null}

          <View style={styles.quickInfoRow}>
            <MiniInfoChip icon="list-outline" text={`${dietPlans.length} plan`} />
            <MiniInfoChip icon="create-outline" text="Dokun düzenle" />
            <MiniInfoChip icon="trash-outline" text="Basılı tut sil" />
          </View>

          <TouchableOpacity
            style={[styles.caloriePhotoCard, !user && styles.caloriePhotoCardGuest]}
            onPress={() => {
              if (!user) {
                Alert.alert('Giriş gerekli', 'Fotoğraftan kalori tahmini için hesap oluşturun veya giriş yapın.', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Profil', onPress: () => navigation.navigate('Profile') },
                ]);
                return;
              }
              navigation.navigate('MealCalorie');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.caloriePhotoIcon}><Ionicons name="camera" size={22} color={COLORS.primary} /></View>
            <View style={styles.caloriePhotoText}>
              <Text style={styles.caloriePhotoTitle}>Fotoğraftan kalori tahmini</Text>
              <Text style={styles.caloriePhotoSub}>{user ? 'Yemeğin fotoğrafından tahmini kalori' : 'Kullanmak için giriş yapın'}</Text>
            </View>
            <Ionicons name={user ? 'chevron-forward' : 'lock-closed-outline'} size={20} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.inlineAddBtn} onPress={openAddModal} activeOpacity={0.86}>
            <Ionicons name="add-circle" size={20} color={COLORS.textOnPrimary} />
            <Text style={styles.inlineAddBtnText}>Yeni Plan Ekle</Text>
          </TouchableOpacity>

          {dietPlans.length > 0 && (
            <View style={styles.infoMessage}>
              <Ionicons name="information-circle" size={16} color={COLORS.info} />
              <Text style={styles.infoText}>Düzenlemek için dokunun, silmek için basılı tutun</Text>
            </View>
          )}

          {dietPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Henüz diyet planı yok</Text>
              <Text style={styles.emptySubtext}>Başlamak için + butonuna tıklayın</Text>
              <TouchableOpacity style={styles.emptyActionBtn} onPress={openAddModal} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.textOnPrimary} />
                <Text style={styles.emptyActionText}>İlk planı oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            dietPlans.map((plan) => (
              <TouchableOpacity key={plan.id} style={styles.planCard} onPress={() => openEditModal(plan)} onLongPress={() => deleteDietPlan(plan.id)} activeOpacity={0.7}>
                <View style={styles.planHeader}>
                  <View style={styles.planDateContainer}>
                    <Ionicons name="calendar" size={16} color={COLORS.primary} />
                    <Text style={styles.planDate}>{formatShortDate(plan.date)}</Text>
                  </View>
                  {plan.total_calories && (
                    <View style={styles.calorieBadge}>
                      <Ionicons name="flame" size={14} color={COLORS.textOnPrimary} />
                      <Text style={styles.calorieText}>{plan.total_calories} kcal</Text>
                    </View>
                  )}
                </View>
                <View style={styles.planBody}>
                  <View style={styles.mealSummaryContainer}>
                    <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                    <Text style={styles.mealSummary}>{getMealSummary(plan)}</Text>
                  </View>
                  <View style={styles.planMetaRow}>
                    <View style={styles.planMetaPill}>
                      <Ionicons name="layers-outline" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.planMetaText}>{getFilledMealsCount(plan)} alan dolu</Text>
                    </View>
                    {plan.notes ? (
                      <View style={styles.planMetaPill}>
                        <Ionicons name="document-text-outline" size={13} color={COLORS.textSecondary} />
                        <Text style={styles.planMetaText}>Not var</Text>
                      </View>
                    ) : null}
                  </View>
                  {plan.notes && (
                    <View style={styles.notesPreview}>
                      <Ionicons name="document-text" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.notesPreviewText} numberOfLines={1}>{plan.notes}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {stats && (loadingAdvice || aiAdvice) ? (
          <View style={{ marginBottom: SIZES.lg }}>
            <AIAdviceCard visible loading={loadingAdvice} advice={aiAdvice} onRefresh={() => fetchDietAdvice()} gradientColors={[COLORS.primary, COLORS.primaryLight]} iconTint={COLORS.primary} subtitle="Planınıza ve kayıtlarınıza göre kişiselleştirilir" footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez." />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: SIZES.containerPadding, marginBottom: 100 }}>
          <HealthSourcesCard variant="general" />
        </View>
      </ScrollView>

      <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={modal.close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboardView}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderRow}>
                  <View style={styles.modalTitleContainer}>
                    <View style={styles.modalIconBadge}>
                      <Ionicons name={modal.isEditing ? 'create' : 'add-circle'} size={19} color={COLORS.primary} style={styles.modalIcon} />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>{modal.isEditing ? 'Planı Düzenle' : 'Yeni Plan'}</Text>
                      <Text style={styles.modalSubtitle}>
                        {modal.isEditing ? 'Mevcut planınızı güncelleyin' : 'Yeni günlük planınızı oluşturun'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={modal.close} style={styles.closeButton}>
                    <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalProgressRow}>
                  <Text style={styles.modalProgressLabel}>{modalFilledCount}/6 öğün dolu</Text>
                  <View style={styles.modalProgressTrack}>
                    <View style={[styles.modalProgressFill, { width: `${modalProgressPercent}%` }]} />
                  </View>
                </View>
              </View>
              <View style={styles.modalHeaderDivider} />

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalHint}>Boş alanlar opsiyoneldir, istediğiniz öğünleri doldurabilirsiniz.</Text>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Tarih</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Plan tarihi</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, (showDatePicker || focusedField === 'date') && styles.inputFocused]}
                      onPress={() => {
                        setFocusedField('date');
                        setShowDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar" size={20} color={COLORS.primary} />
                      <Text style={styles.dateButtonText}>{selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                      <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={selectedDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={onDateChange}
                          locale="tr-TR"
                          minimumDate={new Date()}
                        />
                        {Platform.OS === 'ios' && (
                          <TouchableOpacity
                            style={styles.datePickerCloseBtn}
                            onPress={() => {
                              setShowDatePicker(false);
                              setFocusedField('');
                            }}
                          >
                            <Text style={styles.datePickerCloseText}>Tamam</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Ana Öğünler</Text>
                  {MEAL_FIELDS.filter((f) => !f.compact).map(({ key, icon, label, placeholder }) => (
                    <MealInput
                      key={key}
                      fieldKey={key}
                      icon={icon}
                      label={label}
                      placeholder={placeholder}
                      value={modal.form[key]}
                      onChangeText={(t) => modal.updateField(key, t)}
                      focusedField={focusedField}
                      setFocusedField={setFocusedField}
                    />
                  ))}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Ara Öğünler</Text>
                  {MEAL_FIELDS.filter((f) => f.compact).map(({ key, icon, label, placeholder }) => (
                    <MealInput
                      key={key}
                      fieldKey={key}
                      icon={icon}
                      label={label}
                      placeholder={placeholder}
                      value={modal.form[key]}
                      onChangeText={(t) => modal.updateField(key, t)}
                      compact
                      focusedField={focusedField}
                      setFocusedField={setFocusedField}
                    />
                  ))}
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Ek Bilgiler</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Toplam Kalori</Text>
                    <View style={styles.calorieInputContainer}>
                      <Ionicons name="flame" size={20} color={COLORS.primary} />
                      <TextInput
                        style={styles.calorieInput}
                        value={modal.form.total_calories}
                        onChangeText={(t) => modal.updateField('total_calories', t)}
                        placeholder="1500"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
                    <View style={styles.notesInputContainer}>
                      <Ionicons name="document-text" size={20} color={COLORS.primary} />
                      <TextInput
                        style={styles.notesInput}
                        value={modal.form.notes}
                        onChangeText={(t) => modal.updateField('notes', t)}
                        placeholder="Notlarınızı yazın..."
                        multiline
                        numberOfLines={3}
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={modal.close}>
                  <Ionicons name="close-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtnModal]} onPress={saveDietPlan}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.saveBtnGradient}>
                    <Ionicons name="checkmark-outline" size={18} color={COLORS.textOnPrimary} />
                    <Text style={styles.saveBtnText}>Kaydet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={28} color={COLORS.textOnPrimary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const MealInput = ({ fieldKey, icon, label, placeholder, value, onChangeText, compact, focusedField, setFocusedField }) => (
  <View style={[styles.mealInputGroup, compact && styles.mealInputGroupCompact]}>
    <View style={styles.mealInputHeader}>
      <View style={styles.mealIconBadge}><Ionicons name={icon} size={16} color={COLORS.primary} /></View>
      <Text style={styles.mealInputLabel}>{label}</Text>
    </View>
    <TextInput
      style={[styles.mealInput, compact && styles.mealInputCompact, focusedField === fieldKey && styles.inputFocused]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      multiline
      onFocus={() => setFocusedField(fieldKey)}
      onBlur={() => setFocusedField('')}
    />
  </View>
);

const MiniInfoChip = ({ icon, text }) => (
  <View style={styles.miniInfoChip}>
    <Ionicons name={icon} size={14} color={COLORS.textSecondary} />
    <Text style={styles.miniInfoText}>{text}</Text>
  </View>
);

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  heroHeader: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroBadgeText: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  heroDateText: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: SIZES.h2,
    color: COLORS.textOnPrimary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: SIZES.small,
    color: COLORS.textOnPrimary,
    opacity: 0.92,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.md,
    marginHorizontal: SIZES.containerPadding,
    borderRadius: SIZES.radiusLarge,
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  statCard: { alignItems: 'center' },
  statValue: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.textOnPrimary, marginBottom: SIZES.xs, marginTop: SIZES.xs },
  statLabel: { fontSize: SIZES.tiny, color: COLORS.textOnPrimary, opacity: 0.9 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.sm, paddingBottom: SIZES.sm },
  quickInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginBottom: SIZES.md,
  },
  miniInfoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniInfoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  caloriePhotoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md, gap: SIZES.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  caloriePhotoCardGuest: { opacity: 0.92, borderStyle: 'dashed' },
  caloriePhotoIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center' },
  caloriePhotoText: { flex: 1 },
  caloriePhotoTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  caloriePhotoSub: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: 2 },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 12,
    marginBottom: SIZES.md,
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  inlineAddBtnText: {
    fontSize: SIZES.bodySmall,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  infoMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.highlight, paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusSmall, marginBottom: SIZES.md, gap: SIZES.xs },
  infoText: { fontSize: SIZES.small, color: COLORS.textSecondary, flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: SIZES.xxxl },
  emptyText: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.body, color: COLORS.textLight },
  emptyActionBtn: {
    marginTop: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  emptyActionText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.small,
    fontWeight: '700',
  },
  planCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  planDateContainer: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs },
  planDate: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  calorieBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusSmall, gap: 4 },
  calorieText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.textOnPrimary },
  planBody: { gap: SIZES.xs },
  mealSummaryContainer: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  mealSummary: { fontSize: SIZES.body, fontWeight: '600', color: COLORS.text, flex: 1 },
  planMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  planMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  planMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  notesPreview: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs, marginTop: SIZES.xs },
  notesPreviewText: { fontSize: SIZES.small, color: COLORS.textSecondary, flex: 1 },
  modalKeyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXL, borderTopRightRadius: SIZES.radiusXL, maxHeight: '92%' },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  modalHeader: { paddingHorizontal: SIZES.lg, paddingTop: SIZES.sm, paddingBottom: SIZES.md, backgroundColor: COLORS.surface },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, flex: 1 },
  modalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIcon: { marginRight: 0 },
  modalTitle: { fontSize: SIZES.h3, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { marginTop: 2, fontSize: SIZES.tiny, color: COLORS.textSecondary },
  modalProgressRow: {
    marginTop: SIZES.sm,
  },
  modalProgressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  modalProgressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  modalHeaderDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SIZES.lg,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBody: { padding: SIZES.lg },
  modalHint: {
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  sectionCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SIZES.md,
    marginBottom: SIZES.sm + 4,
    ...SHADOWS.none,
  },
  sectionTitle: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.sm },
  inputGroup: { marginBottom: SIZES.sm + 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    paddingVertical: 12,
    gap: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateButtonText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  datePickerContainer: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, marginTop: SIZES.sm, overflow: 'hidden' },
  datePickerCloseBtn: { backgroundColor: COLORS.primary, paddingVertical: SIZES.md, paddingHorizontal: SIZES.lg, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  datePickerCloseText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  mealInputGroup: { marginBottom: SIZES.sm + 2 },
  mealInputGroupCompact: { marginBottom: SIZES.sm },
  mealInputHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: SIZES.xs },
  mealIconBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center' },
  mealInputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  mealInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    paddingVertical: 11,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 52,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealInputCompact: { minHeight: 46 },
  calorieInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    gap: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calorieInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.text, paddingVertical: 10 },
  notesInputContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    paddingVertical: 11,
    gap: SIZES.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesInput: { flex: 1, fontSize: 15, color: COLORS.text, minHeight: 72, textAlignVertical: 'top' },
  inputFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  modalFooter: { flexDirection: 'row', gap: SIZES.md, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md + 2, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface, ...SHADOWS.small },
  modalBtn: { flex: 1, height: 52, borderRadius: 14, overflow: 'hidden' },
  cancelBtn: {
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textSecondary },
  saveBtnModal: {},
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  saveBtnText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
});
