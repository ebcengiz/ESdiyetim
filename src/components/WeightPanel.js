import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Modal, Platform, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { weightService, bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from './AIAdviceCard';
import { toDateString, formatShortDate } from '../utils/date';
import { useFormModal } from '../hooks/useFormModal';

const EMPTY_FORM = { weight: '', notes: '' };

export default function WeightPanel({ onWeightChange }) {
  const [weights, setWeights] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const modal = useFormModal(EMPTY_FORM);

  const stats = useMemo(() => {
    if (!weights?.length) return null;
    const latest = weights[0].weight;
    const oldest = weights[weights.length - 1].weight;
    const totalChange = latest - oldest;
    const average = (weights.reduce((s, w) => s + w.weight, 0) / weights.length).toFixed(1);
    return { latest, oldest, totalChange, average };
  }, [weights]);

  useEffect(() => { loadWeights(); }, []);

  const loadWeights = async () => {
    try {
      const data = await weightService.getAll();
      setWeights(data || []);
      if (data?.length) runWeightAIAdvice(data);
      else { setAiAdvice(''); setLoadingAdvice(false); }
    } catch {
      Alert.alert('⚠️ Yükleme Hatası', 'Kilo kayıtlarınız yüklenirken bir sorun oluştu.');
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
    } catch {
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
    if (!modal.form.weight) { Alert.alert('⚠️ Uyarı', 'Lütfen kilonuzu girin.'); return; }
    const parsedWeight = parseFloat(modal.form.weight);
    try {
      const weightData = { date: toDateString(selectedDate), weight: parsedWeight, notes: modal.form.notes };
      if (modal.editingId) {
        await weightService.update(modal.editingId, weightData);
        Alert.alert('✅ Güncellendi', 'Kilo kaydınız güncellendi.');
      } else {
        await weightService.create(weightData);
        Alert.alert('✅ Kaydedildi', 'Yeni kilo kaydı eklendi.');
      }
      modal.close();
      await loadWeights();
      const latestRecord = await weightService.getLatest();
      if (latestRecord) {
        await bodyInfoService.syncWeight(latestRecord.weight);
        onWeightChange(latestRecord.weight);
      }
    } catch (error) {
      if (error.code === 'DUPLICATE_DATE') Alert.alert('📆 Aynı Gün Kaydı', error.message);
      else Alert.alert('⚠️ İşlem Başarısız', 'Kilo kaydı kaydedilirken bir hata oluştu.');
    }
  };

  const deleteWeight = (id) => {
    Alert.alert('🗑️ Kaydı Sil', 'Bu kilo kaydını silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await weightService.delete(id);
            await loadWeights();
            const latestRecord = await weightService.getLatest();
            await bodyInfoService.syncWeight(latestRecord ? latestRecord.weight : null);
            onWeightChange(latestRecord ? latestRecord.weight : null);
          } catch {
            Alert.alert('⚠️ Silme Başarısız', 'Lütfen tekrar deneyin.');
          }
        },
      },
    ]);
  };

  const calculateChange = (index) =>
    index < weights.length - 1 ? weights[index].weight - weights[index + 1].weight : null;

  return (
    <View style={{ flex: 1 }}>
      {stats && (
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.statsHeader}>
          <MiniStat label="Mevcut" value={`${stats.latest} kg`} icon="fitness" />
          <MiniStat label="Değişim" value={`${stats.totalChange > 0 ? '+' : ''}${stats.totalChange.toFixed(1)} kg`} icon={stats.totalChange < 0 ? 'trending-down' : 'trending-up'} />
          <MiniStat label="Ortalama" value={`${stats.average} kg`} icon="stats-chart" />
        </LinearGradient>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: SIZES.containerPadding, paddingBottom: stats && (loadingAdvice || aiAdvice) ? SIZES.md : 100 }}>
          <View style={s.listHeader}>
            <Text style={s.listTitle}>Kilo Geçmişi</Text>
            <Text style={s.listSub}>{weights.length} kayıt</Text>
          </View>

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
          <View style={{ marginBottom: 100 }}>
            <AIAdviceCard visible loading={loadingAdvice} advice={aiAdvice} onRefresh={() => runWeightAIAdvice()} gradientColors={[COLORS.primary, COLORS.primaryLight]} iconTint={COLORS.primary} subtitle="Kilo kayıtlarınıza göre kişiselleştirilir" footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez." />
          </View>
        ) : null}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openAddModal} activeOpacity={0.8}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.fabGradient}>
          <Text style={s.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modal.visible} animationType="slide" transparent onRequestClose={modal.close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
              <View style={s.modalHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZES.sm }}>
                  <Ionicons name={modal.isEditing ? 'create' : 'add-circle'} size={22} color={COLORS.primary} />
                  <Text style={s.modalTitle}>{modal.isEditing ? 'Düzenle' : 'Yeni Kayıt'}</Text>
                </View>
                <TouchableOpacity onPress={modal.close} style={s.closeBtn}>
                  <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Tarih</Text>
                  <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                    <Ionicons name="calendar" size={20} color={COLORS.primary} />
                    <Text style={s.dateBtnText}>{selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <View style={s.datePickerWrap}>
                      <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} locale="tr-TR" maximumDate={new Date()} />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity style={s.datePickerClose} onPress={() => setShowDatePicker(false)}>
                          <Text style={s.datePickerCloseText}>Tamam</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Kilo (kg)</Text>
                  <View style={s.textInputWrap}>
                    <Ionicons name="fitness" size={20} color={COLORS.primary} />
                    <TextInput style={s.textInput} value={modal.form.weight} onChangeText={(t) => modal.updateField('weight', t)} placeholder="75.5" keyboardType="decimal-pad" placeholderTextColor={COLORS.textLight} />
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Notlar (Opsiyonel)</Text>
                  <View style={[s.textInputWrap, { alignItems: 'flex-start' }]}>
                    <Ionicons name="document-text" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
                    <TextInput style={[s.textInput, { minHeight: 72, textAlignVertical: 'top' }]} value={modal.form.notes} onChangeText={(t) => modal.updateField('notes', t)} placeholder="Notlarınızı yazın..." multiline placeholderTextColor={COLORS.textLight} />
                  </View>
                </View>
              </ScrollView>

              <View style={s.modalFoot}>
                <TouchableOpacity style={[s.modalActionBtn, s.cancelBtnStyle]} onPress={modal.close}>
                  <Text style={s.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalActionBtn, { overflow: 'hidden' }]} onPress={saveWeight}>
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.saveBtnGradient}>
                    <Text style={s.saveBtnText}>Kaydet</Text>
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
  infoMsg: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.highlight, borderRadius: SIZES.radiusSmall, paddingHorizontal: SIZES.sm, paddingVertical: 6, marginBottom: SIZES.md },
  infoText: { fontSize: SIZES.small, color: COLORS.textSecondary, flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary, marginTop: SIZES.md },
  emptySub: { fontSize: SIZES.body, color: COLORS.textLight, marginTop: 4 },
  recordCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md, ...SHADOWS.small },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  recordDateText: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  changeBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.radiusSmall },
  changeText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.textOnPrimary },
  recordBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  recordWeight: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.primary },
  recordUnit: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary },
  recordNotes: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, marginLeft: SIZES.sm },
  fab: { position: 'absolute', bottom: SIZES.lg, right: SIZES.lg, width: 60, height: 60, borderRadius: 30, overflow: 'hidden', ...SHADOWS.large },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fabText: { fontSize: 32, fontWeight: '300', color: COLORS.textOnPrimary },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXL, borderTopRightRadius: SIZES.radiusXL, maxHeight: '90%' },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  modalTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: SIZES.lg },
  modalFoot: { flexDirection: 'row', gap: SIZES.md, paddingHorizontal: SIZES.lg, paddingVertical: SIZES.lg, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface },
  modalActionBtn: { flex: 1, height: 52, borderRadius: SIZES.radiusMedium },
  cancelBtnStyle: { backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textSecondary },
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  saveBtnText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm },
  dateBtnText: { flex: 1, fontSize: SIZES.body, fontWeight: '600', color: COLORS.text },
  datePickerWrap: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, marginTop: SIZES.sm, overflow: 'hidden' },
  datePickerClose: { backgroundColor: COLORS.primary, paddingVertical: SIZES.md, alignItems: 'center' },
  datePickerCloseText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  inputGroup: { marginBottom: SIZES.md },
  inputLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  textInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, paddingHorizontal: SIZES.md, gap: SIZES.sm },
  textInput: { flex: 1, fontSize: SIZES.h4, fontWeight: '600', color: COLORS.text, paddingVertical: SIZES.md },
});
