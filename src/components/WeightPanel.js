import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, SHADOWS, scrollTabScreenBottomPad } from '../constants/theme';
import { weightService, bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from './AIAdviceCard';
import { formatShortDate } from '../utils/date';
import { useFormModal } from '../hooks/useFormModal';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from './ui/ConfirmModal';

const EMPTY_FORM = { weight: '', notes: '' };
const toLocalDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const toDateKey = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return toLocalDateString(value);
};

export default function WeightPanel({ onWeightChange }) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [weights, setWeights] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeField, setActiveField] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const modal = useFormModal(EMPTY_FORM);
  const aiFailedRef = useRef(false);

  const stats = useMemo(() => {
    if (!weights?.length) return null;
    const latest = weights[0].weight;
    const oldest = weights[weights.length - 1].weight;
    const totalChange = latest - oldest;
    const average = (weights.reduce((s, w) => s + w.weight, 0) / weights.length).toFixed(1);
    return { latest, oldest, totalChange, average };
  }, [weights]);

  useEffect(() => { loadWeights(); }, []);

  // Ekran odağa her geldiğinde önceki AI çağrısı başarısız olduysa yeniden dene
  useFocusEffect(useCallback(() => {
    if (aiFailedRef.current && !loadingAdvice && weights.length > 0) {
      aiFailedRef.current = false;
      runWeightAIAdvice(weights);
    }
  }, [loadingAdvice, weights]));

  const loadWeights = async () => {
    try {
      const data = await weightService.getAll();
      setWeights(data || []);
      if (data?.length) runWeightAIAdvice(data);
      else { setAiAdvice(''); setLoadingAdvice(false); }
    } catch {
      showToast('Kilo kayıtlarınız yüklenirken bir sorun oluştu.', 'error');
    }
  };

  const runWeightAIAdvice = async (list) => {
    const w = list ?? weights;
    if (!w?.length) return;
    const latest = w[0].weight;
    const oldest = w[w.length - 1].weight;
    const totalChange = latest - oldest;
    const average = (w.reduce((s, x) => s + x.weight, 0) / w.length).toFixed(1);
    const st = { latest, oldest, totalChange, average };
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const result = await aiService.getWeightTrackingAdvice({ weights: w, stats: st });
      setAiAdvice(result.advice || '');
      aiFailedRef.current = false;
    } catch {
      aiFailedRef.current = true;
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const openAddModal = () => {
    setSelectedDate(new Date());
    setShowDatePicker(false);
    modal.openAdd();
  };

  const openEditModal = (record) => {
    setSelectedDate(new Date(record.date));
    setShowDatePicker(false);
    modal.openEdit(record, (r) => ({ weight: r.weight.toString(), notes: r.notes || '' }));
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const saveWeight = async () => {
    if (!modal.form.weight) { showToast('Lütfen kilonuzu girin.', 'warning'); return; }
    const parsedWeight = parseFloat(modal.form.weight);
    try {
      const selectedDateKey = toLocalDateString(selectedDate);
      const weightData = { date: selectedDateKey, weight: parsedWeight, notes: modal.form.notes };
      if (modal.editingId) {
        await weightService.update(modal.editingId, weightData);
        showToast('Kilo kaydınız güncellendi.', 'success');
      } else {
        const existingForDate = (weights || []).find(
          (r) => toDateKey(r.date) === selectedDateKey
        );
        if (existingForDate?.id) {
          await weightService.update(existingForDate.id, weightData);
          showToast('Aynı günün kilo kaydı güncellendi.', 'success');
        } else {
          await weightService.create(weightData);
          showToast('Yeni kilo kaydı eklendi.', 'success');
        }
      }
      modal.close();
      await loadWeights();
      const latestRecord = await weightService.getLatest();
      if (latestRecord) {
        await bodyInfoService.syncWeight(latestRecord.weight);
        onWeightChange(latestRecord.weight);
      }
    } catch (error) {
      if (error.code === 'DUPLICATE_DATE') showToast(error.message, 'warning');
      else showToast('Kilo kaydı kaydedilirken bir hata oluştu.', 'error');
    }
  };

  const deleteWeight = (id) => setDeleteTargetId(id);

  const confirmDeleteWeight = async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await weightService.delete(id);
      await loadWeights();
      const latestRecord = await weightService.getLatest();
      await bodyInfoService.syncWeight(latestRecord ? latestRecord.weight : null);
      onWeightChange(latestRecord ? latestRecord.weight : null);
    } catch {
      showToast('Silme başarısız. Lütfen tekrar deneyin.', 'error');
    }
  };

  const calculateChange = (index) =>
    index < weights.length - 1 ? weights[index].weight - weights[index + 1].weight : null;
  const modalFilledCount = [modal.form.weight, modal.form.notes]
    .filter((v) => typeof v === 'string' && v.trim().length > 0).length;
  const modalProgressPercent = Math.max(0, Math.min(100, Math.round((modalFilledCount / 2) * 100)));

  return (
    <View style={{ flex: 1 }}>
      {stats && (
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.statsHeader}>
          <MiniStat label="Mevcut" value={`${stats.latest} kg`} icon="fitness" />
          <MiniStat label="Değişim" value={`${stats.totalChange > 0 ? '+' : ''}${stats.totalChange.toFixed(1)} kg`} icon={stats.totalChange < 0 ? 'trending-down' : 'trending-up'} />
          <MiniStat label="Ortalama" value={`${stats.average} kg`} icon="stats-chart" />
        </LinearGradient>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scrollTabScreenBottomPad(insets.bottom) }}
      >
        <View style={{ padding: SIZES.containerPadding, paddingBottom: stats && (loadingAdvice || aiAdvice) ? SIZES.sm : 0 }}>
          <View style={s.listHeader}>
            <Text style={s.listTitle}>Kilo Geçmişi</Text>
            <Text style={s.listSub}>{weights.length} kayıt</Text>
          </View>

          <TouchableOpacity style={s.inlineAddBtn} onPress={openAddModal} activeOpacity={0.86}>
            <Ionicons name="add-circle" size={18} color={COLORS.textOnPrimary} />
            <Text style={s.inlineAddText}>Yeni Kilo Kaydı Ekle</Text>
          </TouchableOpacity>

          {weights.length > 0 && (
            <View style={s.infoMsg}>
              <Ionicons name="information-circle" size={15} color={COLORS.info} />
              <Text style={s.infoText}>Düzenlemek için dokunun, silmek için basılı tutun</Text>
            </View>
          )}

          {weights.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="scale-outline" size={60} color={COLORS.textLight} />
              <Text style={s.emptyText}>Henüz kilo kaydı yok</Text>
              <Text style={s.emptySub}>Başlamak için + butonuna tıklayın</Text>
            </View>
          ) : (
            weights.map((record, index) => {
              const change = calculateChange(index);
              return (
                <TouchableOpacity key={record.id} style={s.recordCard} onPress={() => openEditModal(record)} onLongPress={() => deleteWeight(record.id)} activeOpacity={0.7}>
                  <View style={s.recordTop}>
                    <Text style={s.recordDateText}>{formatShortDate(record.date)}</Text>
                    {change !== null && (
                      <View style={[s.changeBadge, { backgroundColor: change < 0 ? COLORS.success : COLORS.warning }]}>
                        <Text style={s.changeText}>{change > 0 ? '+' : ''}{change.toFixed(1)} kg</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.recordBottom}>
                    <Text style={s.recordWeight}>{record.weight}</Text>
                    <Text style={s.recordUnit}>kg</Text>
                    {record.notes ? <Text style={s.recordNotes} numberOfLines={1}>{record.notes}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {stats && (loadingAdvice || aiAdvice) ? (
          <View style={{ marginHorizontal: 0, marginTop: SIZES.xs }}>
            <AIAdviceCard visible loading={loadingAdvice} advice={aiAdvice} onRefresh={() => runWeightAIAdvice()} gradientColors={[COLORS.primary, COLORS.primaryLight]} iconTint={COLORS.primary} subtitle="Kilo kayıtlarınıza göre kişiselleştirilir" footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez." />
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={modal.close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHandle} />
              <View style={s.modalHead}>
                <View style={s.modalTitleWrap}>
                  <View style={s.modalIconBadge}>
                    <Ionicons name={modal.isEditing ? 'create' : 'add-circle'} size={18} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={s.modalTitle}>{modal.isEditing ? 'Kaydı Düzenle' : 'Yeni Kilo Kaydı'}</Text>
                    <Text style={s.modalSubtitle}>
                      {modal.isEditing ? 'Mevcut kaydı güncelleyin' : 'Günlük ölçümünüzü hızlıca ekleyin'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={modal.close} style={s.closeBtn}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={s.modalProgressRow}>
                <Text style={s.modalProgressText}>{modalFilledCount}/2 alan dolu</Text>
                <View style={s.modalProgressTrack}>
                  <View style={[s.modalProgressFill, { width: `${modalProgressPercent}%` }]} />
                </View>
              </View>
              <View style={s.modalDivider} />

              <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
                <Text style={s.modalHint}>Tarih ve kilo alanı yeterlidir, not alanı opsiyoneldir.</Text>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Tarih</Text>
                  <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                    <Ionicons name="calendar" size={20} color={COLORS.primary} />
                    <Text style={s.dateBtnText}>{selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <Text style={s.dateHintText}>Bu tarih için kayıt varsa üzerine yazılır.</Text>
                  {showDatePicker && (
                    <View style={s.datePickerWrap}>
                      <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} locale="tr-TR" maximumDate={new Date()} />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={s.datePickerClose}
                          onPress={() => {
                            setShowDatePicker(false);
                          }}
                        >
                          <Text style={s.datePickerCloseText}>Tamam</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Kilo (kg)</Text>
                  <View style={[s.textInputWrap, activeField === 'weight' && s.textInputWrapFocused]}>
                    <Ionicons name="fitness" size={20} color={COLORS.primary} />
                    <TextInput
                      style={s.textInput}
                      value={modal.form.weight}
                      onChangeText={(t) => modal.updateField('weight', t)}
                      placeholder="75.5"
                      keyboardType="decimal-pad"
                      placeholderTextColor={COLORS.textLight}
                      onFocus={() => setActiveField('weight')}
                      onBlur={() => setActiveField('')}
                    />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Notlar (Opsiyonel)</Text>
                  <View style={[s.textInputWrap, { alignItems: 'flex-start' }, activeField === 'notes' && s.textInputWrapFocused]}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
                    <TextInput
                      style={[s.textInput, { minHeight: 72, textAlignVertical: 'top' }]}
                      value={modal.form.notes}
                      onChangeText={(t) => modal.updateField('notes', t)}
                      placeholder="Notlarınızı yazın..."
                      multiline
                      placeholderTextColor={COLORS.textLight}
                      onFocus={() => setActiveField('notes')}
                      onBlur={() => setActiveField('')}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={s.modalFoot}>
                <TouchableOpacity style={[s.modalActionBtn, s.cancelBtnStyle]} onPress={modal.close}>
                  <Ionicons name="close-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={s.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalActionBtn, { overflow: 'hidden' }]} onPress={saveWeight}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.saveBtnGradient}>
                    <Ionicons name="checkmark-outline" size={18} color={COLORS.textOnPrimary} />
                    <Text style={s.saveBtnText}>Kaydet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={deleteTargetId !== null}
        title="Kaydı Sil"
        message="Bu kilo kaydını silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        cancelText="İptal"
        type="danger"
        onConfirm={confirmDeleteWeight}
        onCancel={() => setDeleteTargetId(null)}
      />
    </View>
  );
}

const MiniStat = ({ label, value, icon }) => (
  <View style={s.miniStat}>
    <Ionicons name={icon} size={24} color={COLORS.textOnPrimary} />
    <Text style={s.miniStatVal}>{value}</Text>
    <Text style={s.miniStatLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  statsHeader: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SIZES.containerPadding, paddingVertical: SIZES.md },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary, marginTop: 4 },
  miniStatLabel: { fontSize: SIZES.tiny, color: COLORS.textOnPrimary, opacity: 0.85 },
  listHeader: { marginBottom: SIZES.md },
  listTitle: { fontSize: SIZES.h3, fontWeight: '700', color: COLORS.text },
  listSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 11,
    marginBottom: SIZES.md,
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  inlineAddText: {
    fontSize: SIZES.bodySmall,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  infoMsg: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.highlight, borderRadius: SIZES.radiusSmall, paddingHorizontal: SIZES.sm, paddingVertical: 6, marginBottom: SIZES.md },
  infoText: { fontSize: SIZES.small, color: COLORS.textSecondary, flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary, marginTop: SIZES.md },
  emptySub: { fontSize: SIZES.body, color: COLORS.textLight, marginTop: 4 },
  recordCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  recordDateText: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  changeBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.radiusSmall },
  changeText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.textOnPrimary },
  recordBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  recordWeight: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.primary },
  recordUnit: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary },
  recordNotes: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, marginLeft: SIZES.sm },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXL, borderTopRightRadius: SIZES.radiusXL, maxHeight: '92%' },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.lg, paddingTop: SIZES.sm, paddingBottom: SIZES.sm },
  modalTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, flex: 1 },
  modalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  modalProgressRow: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.sm },
  modalProgressText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  modalProgressTrack: { width: '100%', height: 8, borderRadius: 999, backgroundColor: COLORS.borderLight, overflow: 'hidden' },
  modalProgressFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.primary },
  modalDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SIZES.lg },
  modalBody: { padding: SIZES.lg },
  modalHint: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginBottom: SIZES.md },
  modalFoot: { flexDirection: 'row', gap: SIZES.md, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md + 2, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface },
  modalActionBtn: { flex: 1, height: 52, borderRadius: 14 },
  cancelBtnStyle: { backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textSecondary },
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  saveBtnText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm },
  dateBtnText: { flex: 1, fontSize: SIZES.body, fontWeight: '600', color: COLORS.text },
  dateHintText: { marginTop: 6, fontSize: 11, color: COLORS.textLight },
  datePickerWrap: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, marginTop: SIZES.sm, overflow: 'hidden' },
  datePickerClose: { backgroundColor: COLORS.primary, paddingVertical: SIZES.md, alignItems: 'center' },
  datePickerCloseText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  inputGroup: { marginBottom: SIZES.md },
  inputLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  textInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, paddingHorizontal: SIZES.md, gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  textInputWrapFocused: { borderColor: COLORS.primary },
  textInput: { flex: 1, fontSize: SIZES.h4, fontWeight: '600', color: COLORS.text, paddingVertical: SIZES.md },
});
