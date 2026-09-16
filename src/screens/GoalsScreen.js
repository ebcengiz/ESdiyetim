import React, { useState, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import { goalsService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import GuestGateBanner from '../components/GuestGateBanner';
import MedicalInfoBanner from '../components/MedicalInfoBanner';
import GoalCard from '../components/goals/GoalCard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useFormModal } from '../hooks/useFormModal';
import { toDateString } from '../utils/date';
import { validateWeight } from '../utils/validation';
import {
  ScreenContainer, HeroHeader, ConfirmModal, BottomSheet, AppInput, AppButton, DateField,
  EmptyState, LoadingState, SectionHeader,
} from '../components/ui';

const EMPTY_GOAL = { title: '', currentWeight: '', targetWeight: '', notes: '' };

const defaultTargetDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d;
};

export default function GoalsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedTargetDate, setSelectedTargetDate] = useState(defaultTargetDate());
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
    if (!user) { setGoals([]); setGoalAdvices({}); setLoading(false); return; }
    loadGoals();
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;
    try {
      const data = await goalsService.getAll();
      setGoals(data || []);
      if (data?.length) data.forEach((goal) => fetchGoalAdvice(goal));
    } catch (error) {
      handleError(error, { context: 'goals.list', onRetry: loadGoals });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (!user) {
      showToast('Hedef oluşturmak için giriş yapın.', 'info');
      return;
    }
    setSelectedStartDate(new Date());
    setSelectedTargetDate(defaultTargetDate());
    setErrors({});
    modal.openAdd();
  };

  const openEditModal = (goal) => {
    setSelectedStartDate(new Date(goal.start_date));
    setSelectedTargetDate(new Date(goal.target_date));
    setErrors({});
    modal.openEdit(goal, (g) => ({
      title: g.title,
      currentWeight: g.current_weight?.toString() || '',
      targetWeight: g.target_weight.toString(),
      notes: g.notes || '',
    }));
  };

  const updateField = (key, value) => {
    modal.updateField(key, value);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!modal.form.title.trim()) errs.title = 'Hedef başlığı gerekli.';
    const tw = validateWeight(modal.form.targetWeight.replace(',', '.'));
    if (tw) errs.targetWeight = tw;
    if (modal.form.currentWeight) {
      const cw = validateWeight(modal.form.currentWeight.replace(',', '.'));
      if (cw) errs.currentWeight = cw;
    }
    if (selectedTargetDate <= selectedStartDate) errs.targetDate = 'Hedef tarihi başlangıçtan sonra olmalı.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveGoal = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const goalData = {
        title: modal.form.title.trim(),
        current_weight: modal.form.currentWeight ? parseFloat(modal.form.currentWeight.replace(',', '.')) : null,
        target_weight: parseFloat(modal.form.targetWeight.replace(',', '.')),
        start_date: toDateString(selectedStartDate),
        target_date: toDateString(selectedTargetDate),
        notes: modal.form.notes,
        status: 'active',
      };
      if (modal.editingId) await goalsService.update(modal.editingId, goalData);
      else await goalsService.create(goalData);
      showToast(modal.editingId ? 'Hedef güncellendi.' : 'Hedef oluşturuldu.', 'success');
      modal.close();
      loadGoals();
    } catch (error) {
      handleError(error, { context: 'goals.save', onRetry: saveGoal });
    } finally {
      setSaving(false);
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
      handleError(error, { context: 'goals.delete' });
    }
  };

  const toggleGoalStatus = async (goal) => {
    try {
      await goalsService.update(goal.id, { status: goal.status === 'active' ? 'completed' : 'active' });
      loadGoals();
    } catch (error) {
      handleError(error, { context: 'goals.toggle' });
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
    } catch (e) {
      handleError(e, { context: 'goals.advice', silent: true });
      setGoalAdvices((prev) => ({ ...prev, [id]: { advice: '', loading: false } }));
    }
  };

  // Kompakt başlık: sadece başlık + tek satır özet + "yeni hedef" aksiyonu
  const header = (
    <HeroHeader
      title="Hedeflerim"
      meta={user && goals.length > 0 ? `${stats.activeGoals} aktif · ${stats.completedGoals} tamamlanan` : undefined}
      actions={[{ icon: 'add', label: 'Yeni hedef', onPress: openAddModal }]}
    />
  );

  const advice = primaryAdviceGoal ? goalAdvices[primaryAdviceGoal.id] : null;

  return (
    <>
      <ScreenContainer tab edges={[]} header={header}>
        {!user ? (
          <GuestGateBanner navigation={navigation} message="Kilo hedefleri hesabınıza bağlıdır. Oluşturmak ve senkronize etmek için giriş yapın." />
        ) : (
          <MedicalInfoBanner title="Hedef ve yapay zeka">
            Hedef önerileri genel bilgilendirme içindir; kişisel tıbbi veya beslenme planı değildir. Karar
            vermeden önce uzmanınıza danışın.
          </MedicalInfoBanner>
        )}

        <SectionHeader title="Hedefler" subtitle={loading ? 'Yükleniyor…' : `${stats.total} hedef`} />

        <AppButton title="Yeni Hedef Ekle" icon="add-circle" fullWidth onPress={openAddModal} style={styles.addBtn} />

        {loading ? (
          <LoadingState variant="list" count={2} />
        ) : goals.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="Henüz hedef yok"
            message="Bir kilo hedefi belirle; ilerlemeni ve yapay zeka önerilerini burada takip et."
            actionLabel="Hedef ekle"
            onAction={openAddModal}
          />
        ) : (
          orderedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => openEditModal(goal)}
              onToggleStatus={() => toggleGoalStatus(goal)}
              onDelete={() => deleteGoal(goal.id)}
            />
          ))
        )}

        {advice && (advice.loading || advice.advice) ? (
          <View style={styles.adviceWrap}>
            <SectionHeader title="AI Tavsiyesi" subtitle={`"${primaryAdviceGoal.title}" hedefine göre`} />
            <AIAdviceCard
              visible
              loading={advice.loading}
              advice={advice.advice}
              onRefresh={() => fetchGoalAdvice(primaryAdviceGoal)}
              gradientColors={[COLORS.primary, COLORS.primaryLight]}
              iconTint={COLORS.primary}
              subtitle="Seçili hedefinize göre kişiselleştirilir"
              footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez."
            />
          </View>
        ) : null}
      </ScreenContainer>

      <BottomSheet
        visible={modal.visible}
        onClose={modal.close}
        title={modal.isEditing ? 'Hedefi Düzenle' : 'Yeni Hedef'}
        subtitle="Gerçekçi ve ölçülebilir bir hedef belirle"
        footer={
          <View style={styles.footer}>
            <AppButton title="İptal" variant="secondary" onPress={modal.close} style={styles.footerBtn} haptic={false} disabled={saving} />
            <AppButton title="Kaydet" icon="checkmark" onPress={saveGoal} loading={saving} style={styles.footerBtn} />
          </View>
        }
      >
        <AppInput
          label="Hedef Başlığı"
          icon="create-outline"
          value={modal.form.title}
          onChangeText={(t) => updateField('title', t)}
          error={errors.title}
          placeholder="Örn: 10 kilo ver"
          returnKeyType="next"
          autoCapitalize="sentences"
        />
        <AppInput
          label="Mevcut Kilo (opsiyonel)"
          icon="body-outline"
          unit="kg"
          value={modal.form.currentWeight}
          onChangeText={(t) => updateField('currentWeight', t)}
          error={errors.currentWeight}
          placeholder="75.5"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
        <AppInput
          label="Hedef Kilo"
          icon="flag-outline"
          unit="kg"
          value={modal.form.targetWeight}
          onChangeText={(t) => updateField('targetWeight', t)}
          error={errors.targetWeight}
          placeholder="65.0"
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
        <DateField label="Başlangıç Tarihi" value={selectedStartDate} onChange={setSelectedStartDate} />
        <DateField
          label="Hedef Tarihi"
          value={selectedTargetDate}
          onChange={(d) => { setSelectedTargetDate(d); setErrors((e) => ({ ...e, targetDate: undefined })); }}
          minimumDate={selectedStartDate}
          error={errors.targetDate}
        />
        <AppInput
          label="Notlar (opsiyonel)"
          icon="document-text-outline"
          value={modal.form.notes}
          onChangeText={(t) => updateField('notes', t)}
          placeholder="Notlarınızı yazın…"
          multiline
          textAlignVertical="top"
          inputStyle={styles.notesInput}
        />
      </BottomSheet>

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
    </>
  );
}

const styles = StyleSheet.create({
  addBtn: { marginBottom: SIZES.md },
  adviceWrap: { marginTop: SIZES.sm },
  footer: { flexDirection: 'row', gap: SIZES.sm },
  footerBtn: { flex: 1 },
  notesInput: { minHeight: 80, paddingTop: 12 },
});
