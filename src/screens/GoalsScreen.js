import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, scrollTabScreenBottomPad } from '../constants/theme';
import { goalsService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import GuestGateBanner from '../components/GuestGateBanner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useFormModal } from '../hooks/useFormModal';
import { toDateString, formatMediumDate, daysFromToday } from '../utils/date';
import ConfirmModal from '../components/ui/ConfirmModal';

const EMPTY_GOAL = { title: '', currentWeight: '', targetWeight: '', notes: '' };

const defaultTargetDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d;
};

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [goals, setGoals] = useState([]);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedTargetDate, setSelectedTargetDate] = useState(defaultTargetDate());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [goalAdvices, setGoalAdvices] = useState({});
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const modal = useFormModal(EMPTY_GOAL);

  const stats = useMemo(() => ({
    total: goals.length,
    activeGoals: goals.filter((g) => g.status === 'active').length,
    completedGoals: goals.filter((g) => g.status === 'completed').length,
  }), [goals]);
  const orderedGoals = useMemo(() => [...goals], [goals]);
  const primaryAdviceGoal = useMemo(
    () => orderedGoals.find((g) => g.status === 'active') || orderedGoals[0] || null,
    [orderedGoals]
  );

  useEffect(() => {
    if (!user) { setGoals([]); setGoalAdvices({}); return; }
    loadGoals();
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;
    try {
      const data = await goalsService.getAll();
      setGoals(data || []);
      if (data?.length) data.forEach((goal) => fetchGoalAdvice(goal));
    } catch (error) {
      console.error('Hedefler yükleme hatası:', error);
      showToast('Hedefler yüklenirken bir hata oluştu.', 'error');
    }
  };

  const openAddModal = () => {
    if (!user) {
      showToast('Hedef oluşturmak için giriş yapın.', 'info');
      return;
    }
    setSelectedStartDate(new Date());
    setSelectedTargetDate(defaultTargetDate());
    setShowStartDatePicker(false);
    setShowTargetDatePicker(false);
    modal.openAdd();
  };

  const openEditModal = (goal) => {
    setSelectedStartDate(new Date(goal.start_date));
    setSelectedTargetDate(new Date(goal.target_date));
    setShowStartDatePicker(false);
    setShowTargetDatePicker(false);
    modal.openEdit(goal, (g) => ({
      title: g.title,
      currentWeight: g.current_weight?.toString() || '',
      targetWeight: g.target_weight.toString(),
      notes: g.notes || '',
    }));
  };

  const onStartDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowStartDatePicker(false);
    if (date) setSelectedStartDate(date);
  };

  const onTargetDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowTargetDatePicker(false);
    if (date) setSelectedTargetDate(date);
  };

  const saveGoal = async () => {
    if (!modal.form.title) { showToast('Lütfen hedef başlığı girin.', 'warning'); return; }
    if (!modal.form.targetWeight) { showToast('Lütfen hedef kilonuzu girin.', 'warning'); return; }
    try {
      const goalData = {
        title: modal.form.title,
        current_weight: modal.form.currentWeight ? parseFloat(modal.form.currentWeight) : null,
        target_weight: parseFloat(modal.form.targetWeight),
        start_date: toDateString(selectedStartDate),
        target_date: toDateString(selectedTargetDate),
        notes: modal.form.notes,
        status: 'active',
      };
      if (modal.editingId) await goalsService.update(modal.editingId, goalData);
      else await goalsService.create(goalData);
      modal.close();
      loadGoals();
    } catch (error) {
      console.error('Hedef kaydetme hatası:', error);
      showToast('Hedef kaydedilirken bir hata oluştu.', 'error');
    }
  };

  const deleteGoal = (id) => setDeleteTargetId(id);

  const confirmDeleteGoal = async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await goalsService.delete(id);
      showToast('Hedef silindi.', 'success');
      loadGoals();
    } catch (error) {
      console.error('Hedef silme hatası:', error);
      showToast('Hedef silinirken bir hata oluştu.', 'error');
    }
  };

  const toggleGoalStatus = async (goal) => {
    try {
      await goalsService.update(goal.id, { status: goal.status === 'active' ? 'completed' : 'active' });
      loadGoals();
    } catch (error) {
      console.error('Hedef durumu güncelleme hatası:', error);
      showToast('Hedef durumu güncellenirken bir hata oluştu.', 'error');
    }
  };

  const fetchGoalAdvice = async (goal) => {
    const id = goal.id;
    setGoalAdvices((prev) => ({ ...prev, [id]: { advice: '', loading: true } }));
    try {
      const result = await aiService.getGoalAdvice({
        title: goal.title,
        currentWeight: goal.current_weight,
        targetWeight: goal.target_weight,
        startDate: goal.start_date,
        targetDate: goal.target_date,
      });
      setGoalAdvices((prev) => ({ ...prev, [id]: { advice: result.advice, loading: false } }));
    } catch {
      setGoalAdvices((prev) => ({ ...prev, [id]: { advice: '⚠️ Tavsiye alınamadı.', loading: false } }));
    }
  };

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
            <Ionicons name="trophy-outline" size={14} color={COLORS.textOnPrimary} />
            <Text style={styles.heroBadgeText}>Hedef Takibi</Text>
          </View>
          <Text style={styles.heroDate}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={styles.heroTitle}>Hedeflerim</Text>
        <Text style={styles.heroSubtitle}>Kilo hedeflerini planla, ilerlemeyi takip et ve duruma göre güncelle.</Text>
      </LinearGradient>

      {goals.length > 0 && (
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsHeader}>
          <StatCard label="Toplam" value={stats.total} icon="trophy" />
          <StatCard label="Aktif" value={stats.activeGoals} icon="flag" />
          <StatCard label="Tamamlanan" value={stats.completedGoals} icon="checkmark-circle" />
        </LinearGradient>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollTabScreenBottomPad(insets.bottom) }}
      >
        <View style={styles.content}>
          {!user ? (
            <GuestGateBanner navigation={navigation} message="Kilo hedefleri hesabınıza bağlıdır. Oluşturmak ve senkronize etmek için giriş yapın." />
          ) : null}

          <View style={styles.infoChipRow}>
            <InfoChip icon="flag-outline" text={`${stats.activeGoals} aktif`} />
            <InfoChip icon="checkmark-circle-outline" text={`${stats.completedGoals} tamamlanan`} />
          </View>

          <TouchableOpacity style={styles.inlineAddBtn} onPress={openAddModal} activeOpacity={0.86}>
            <Ionicons name="add-circle" size={18} color={COLORS.textOnPrimary} />
            <Text style={styles.inlineAddText}>Yeni Hedef Ekle</Text>
          </TouchableOpacity>

          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Henüz hedef yok</Text>
              <Text style={styles.emptySubtext}>Başlamak için + butonuna tıklayın</Text>
            </View>
          ) : (
            orderedGoals.map((goal) => {
              const daysRemaining = daysFromToday(goal.target_date);
              const isCompleted = goal.status === 'completed';
              const weightDiff = goal.current_weight ? Math.abs(goal.current_weight - goal.target_weight) : null;
              const gAdv = goalAdvices[goal.id];

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => openEditModal(goal)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleRow}>
                      <Ionicons name={isCompleted ? 'checkmark-circle' : 'flag'} size={24} color={isCompleted ? COLORS.success : COLORS.primary} />
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleGoalStatus(goal)} style={styles.statusButton}>
                      <Ionicons name={isCompleted ? 'refresh-circle-outline' : 'checkmark-done-circle-outline'} size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalBody}>
                    <View style={styles.goalInfo}>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.infoText}>{formatMediumDate(goal.start_date)} - {formatMediumDate(goal.target_date)}</Text>
                      </View>
                      {!isCompleted && daysRemaining >= 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons name="time-outline" size={16} color={COLORS.info} />
                          <Text style={[styles.infoText, { color: COLORS.info }]}>{daysRemaining} gün kaldı</Text>
                        </View>
                      )}
                      {!isCompleted && daysRemaining < 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
                          <Text style={[styles.infoText, { color: COLORS.error }]}>Hedef tarihi geçti</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.weightInfo}>
                      <View style={styles.statusPillRow}>
                        <View style={[styles.statusPill, isCompleted ? styles.statusPillDone : styles.statusPillActive]}>
                          <Ionicons
                            name={isCompleted ? 'checkmark-done' : 'time-outline'}
                            size={14}
                            color={isCompleted ? COLORS.success : COLORS.info}
                          />
                          <Text style={[styles.statusPillText, isCompleted ? styles.statusPillTextDone : styles.statusPillTextActive]}>
                            {isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                          </Text>
                        </View>
                      </View>
                      {goal.current_weight && (
                        <View style={styles.weightRow}>
                          <Text style={styles.weightLabel}>Mevcut:</Text>
                          <Text style={styles.weightValue}>{goal.current_weight} kg</Text>
                        </View>
                      )}
                      <View style={styles.weightRow}>
                        <Text style={styles.weightLabel}>Hedef:</Text>
                        <Text style={[styles.weightValue, styles.targetWeight]}>{goal.target_weight} kg</Text>
                      </View>
                      {weightDiff !== null && (
                        <View style={styles.weightRow}>
                          <Text style={styles.weightLabel}>Fark:</Text>
                          <Text style={[styles.weightValue, { color: COLORS.warning }]}>{weightDiff.toFixed(1)} kg</Text>
                        </View>
                      )}
                    </View>

                    {goal.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesText} numberOfLines={2}>{goal.notes}</Text>
                      </View>
                    )}

                    <View style={styles.goalActionsRow}>
                      <TouchableOpacity
                        style={styles.deleteActionBtn}
                        onPress={() => deleteGoal(goal.id)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                        <Text style={styles.deleteActionText}>Hedefi Sil</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {primaryAdviceGoal && goalAdvices[primaryAdviceGoal.id] ? (
            <View style={{ marginTop: SIZES.xs, marginBottom: SIZES.md }}>
              <View style={styles.adviceHeaderRow}>
                <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
                <Text style={styles.adviceHeaderTitle}>Seçili Hedef İçin AI Tavsiyesi</Text>
              </View>
              <AIAdviceCard
                visible={
                  goalAdvices[primaryAdviceGoal.id].loading ||
                  !!goalAdvices[primaryAdviceGoal.id].advice
                }
                loading={goalAdvices[primaryAdviceGoal.id].loading}
                advice={goalAdvices[primaryAdviceGoal.id].advice}
                onRefresh={() => fetchGoalAdvice(primaryAdviceGoal)}
                gradientColors={[COLORS.primary, COLORS.primaryLight]}
                iconTint={COLORS.primary}
                subtitle="Seçili hedefinize göre kişiselleştirilir"
                footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez."
              />
            </View>
          ) : null}
        </View>

      </ScrollView>

      <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={modal.close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboardView}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name={modal.isEditing ? 'create' : 'add-circle'} size={24} color={COLORS.primary} style={styles.modalIcon} />
                  <Text style={styles.modalTitle}>{modal.isEditing ? 'Hedefi Düzenle' : 'Yeni Hedef'}</Text>
                </View>
                <TouchableOpacity onPress={modal.close} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hedef Başlığı</Text>
                  <View style={styles.textInputContainer}>
                    <Ionicons name="create" size={20} color={COLORS.primary} />
                    <TextInput style={styles.textInput} value={modal.form.title} onChangeText={(t) => modal.updateField('title', t)} placeholder="Örn: 10 Kilo Ver" placeholderTextColor={COLORS.textLight} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mevcut Kilo (kg)</Text>
                  <View style={styles.weightInputContainer}>
                    <Ionicons name="body" size={20} color={COLORS.primary} />
                    <TextInput style={styles.weightInput} value={modal.form.currentWeight} onChangeText={(t) => modal.updateField('currentWeight', t)} placeholder="75.5" keyboardType="decimal-pad" placeholderTextColor={COLORS.textLight} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hedef Kilo (kg)</Text>
                  <View style={styles.weightInputContainer}>
                    <Ionicons name="flag" size={20} color={COLORS.primary} />
                    <TextInput style={styles.weightInput} value={modal.form.targetWeight} onChangeText={(t) => modal.updateField('targetWeight', t)} placeholder="65.0" keyboardType="decimal-pad" placeholderTextColor={COLORS.textLight} />
                  </View>
                </View>

                {/* Başlangıç Tarihi */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Başlangıç Tarihi</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)} activeOpacity={0.7}>
                    <Ionicons name="calendar" size={20} color={COLORS.primary} />
                    <Text style={styles.dateButtonText}>{selectedStartDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker value={selectedStartDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onStartDateChange} locale="tr-TR" />
                      {Platform.OS === 'ios' && <TouchableOpacity style={styles.datePickerCloseBtn} onPress={() => setShowStartDatePicker(false)}><Text style={styles.datePickerCloseText}>Tamam</Text></TouchableOpacity>}
                    </View>
                  )}
                </View>

                {/* Hedef Tarihi */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hedef Tarihi</Text>
                  <TouchableOpacity style={styles.dateButton} onPress={() => setShowTargetDatePicker(true)} activeOpacity={0.7}>
                    <Ionicons name="calendar" size={20} color={COLORS.primary} />
                    <Text style={styles.dateButtonText}>{selectedTargetDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {showTargetDatePicker && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker value={selectedTargetDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTargetDateChange} locale="tr-TR" minimumDate={selectedStartDate} />
                      {Platform.OS === 'ios' && <TouchableOpacity style={styles.datePickerCloseBtn} onPress={() => setShowTargetDatePicker(false)}><Text style={styles.datePickerCloseText}>Tamam</Text></TouchableOpacity>}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
                  <View style={styles.notesInputContainer}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} />
                    <TextInput style={styles.notesInput} value={modal.form.notes} onChangeText={(t) => modal.updateField('notes', t)} placeholder="Notlarınızı yazın..." multiline numberOfLines={3} placeholderTextColor={COLORS.textLight} />
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={modal.close}>
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.saveBtnModal]} onPress={saveGoal}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>Kaydet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={deleteTargetId !== null}
        title="Hedefi Sil"
        message="Bu hedefi silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        cancelText="İptal"
        type="danger"
        onConfirm={confirmDeleteGoal}
        onCancel={() => setDeleteTargetId(null)}
      />
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

const InfoChip = ({ icon, text }) => (
  <View style={styles.infoChip}>
    <Ionicons name={icon} size={14} color={COLORS.textSecondary} />
    <Text style={styles.infoChipText}>{text}</Text>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: '700' },
  heroDate: { color: COLORS.textOnPrimary, fontSize: 11, opacity: 0.9, fontWeight: '600' },
  heroTitle: { fontSize: SIZES.h2, fontWeight: '800', letterSpacing: -0.45, color: COLORS.textOnPrimary },
  heroSubtitle: { marginTop: 4, fontSize: SIZES.tiny, color: COLORS.textOnPrimary, opacity: 0.92 },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SIZES.containerPadding,
    paddingVertical: SIZES.md,
    marginHorizontal: SIZES.containerPadding,
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
    borderRadius: SIZES.radiusLarge,
    ...SHADOWS.medium,
  },
  statCard: { alignItems: 'center' },
  statValue: { fontSize: SIZES.h2, fontWeight: '700', color: COLORS.textOnPrimary, marginVertical: SIZES.xs },
  statLabel: { fontSize: SIZES.tiny, color: COLORS.textOnPrimary, opacity: 0.9 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.sm, paddingBottom: SIZES.sm },
  infoChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs, marginBottom: SIZES.md },
  infoChip: {
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
  infoChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
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
  inlineAddText: { fontSize: SIZES.bodySmall, fontWeight: '700', color: COLORS.textOnPrimary },
  emptyState: { alignItems: 'center', paddingVertical: SIZES.xxxl },
  emptyText: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary, marginTop: SIZES.md, marginBottom: SIZES.xs },
  emptySubtext: { fontSize: SIZES.body, color: COLORS.textLight },
  goalCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  goalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, flex: 1 },
  goalTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text, flex: 1 },
  statusButton: { padding: SIZES.xs },
  goalBody: { gap: SIZES.md },
  goalInfo: { gap: SIZES.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.xs },
  infoText: { fontSize: SIZES.small, color: COLORS.textSecondary },
  weightInfo: { backgroundColor: COLORS.highlight, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.xs },
  statusPillRow: { marginBottom: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillActive: { backgroundColor: COLORS.info + '18' },
  statusPillDone: { backgroundColor: COLORS.success + '18' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusPillTextActive: { color: COLORS.info },
  statusPillTextDone: { color: COLORS.success },
  adviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  adviceHeaderTitle: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
  },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightLabel: { fontSize: SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },
  weightValue: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  targetWeight: { color: COLORS.primary },
  notesContainer: { paddingTop: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  notesText: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 20 },
  goalActionsRow: {
    marginTop: 2,
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.error + '12',
    borderWidth: 1,
    borderColor: COLORS.error + '45',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteActionText: {
    fontSize: SIZES.tiny,
    fontWeight: '700',
    color: COLORS.error,
  },
  modalKeyboardView: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXL, borderTopRightRadius: SIZES.radiusXL, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  modalIcon: { marginRight: SIZES.xs },
  modalTitle: { fontSize: SIZES.h3, fontWeight: '700', color: COLORS.text },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: SIZES.lg },
  inputGroup: { marginBottom: SIZES.md },
  inputLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  textInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, paddingHorizontal: SIZES.md, gap: SIZES.sm },
  textInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text, paddingVertical: SIZES.md },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm },
  dateButtonText: { flex: 1, fontSize: SIZES.body, fontWeight: '600', color: COLORS.text },
  datePickerContainer: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, marginTop: SIZES.sm, overflow: 'hidden' },
  datePickerCloseBtn: { backgroundColor: COLORS.primary, paddingVertical: SIZES.md, paddingHorizontal: SIZES.lg, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  datePickerCloseText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  weightInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, paddingHorizontal: SIZES.md, gap: SIZES.sm },
  weightInput: { flex: 1, fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text, paddingVertical: SIZES.md },
  notesInputContainer: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm, alignItems: 'flex-start' },
  notesInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text, minHeight: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: SIZES.md, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.lg, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface },
  modalBtn: { flex: 1, height: 56, borderRadius: SIZES.radiusMedium, overflow: 'hidden' },
  cancelBtn: { backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textSecondary },
  saveBtnModal: {},
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
});
