import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../constants/theme';
import { weightService, bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from './AIAdviceCard';
import { formatShortDate, formatLongDate } from '../utils/date';
import { validateWeight } from '../utils/validation';
import { useFormModal } from '../hooks/useFormModal';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import {
  ScreenContainer, AppButton, AppInput, BottomSheet, ConfirmModal, DatePickerSheet,
  EmptyState, LoadingState, SectionHeader, IconBadge,
} from './ui';

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

/** Üst gradyan şeridindeki tekil istatistik */
const MiniStat = ({ label, value, icon }) => (
  <View style={s.miniStat} accessibilityLabel={`${label}: ${value}`}>
    <Ionicons name={icon} size={22} color={COLORS.textOnPrimary} />
    <Text style={s.miniStatVal} maxFontSizeMultiplier={MAX_FONT_SCALE}>{value}</Text>
    <Text style={s.miniStatLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
  </View>
);

/** Tek kilo kaydı satırı — dokun: düzenle, çöp ikonu: sil */
function WeightRecordCard({ record, change, onEdit, onDelete }) {
  return (
    <Pressable
      style={({ pressed }) => [s.recordCard, pressed && s.pressed]}
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`${formatShortDate(record.date)}, ${record.weight} kilogram${change !== null ? `, değişim ${change > 0 ? 'artı' : ''}${change.toFixed(1)}` : ''}`}
      accessibilityHint="Düzenlemek için dokunun"
    >
      <View style={s.recordTop}>
        <Text style={s.recordDate} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatShortDate(record.date)}</Text>
        <View style={s.recordTopRight}>
          {change !== null && (
            <View style={[s.changeBadge, { backgroundColor: change < 0 ? COLORS.successBg : change > 0 ? COLORS.warningBg : COLORS.neutral100 }]}>
              <Ionicons
                name={change < 0 ? 'trending-down' : change > 0 ? 'trending-up' : 'remove'}
                size={12}
                color={change < 0 ? COLORS.successText : change > 0 ? COLORS.warningText : COLORS.neutral500}
              />
              <Text style={[s.changeText, { color: change < 0 ? COLORS.successText : change > 0 ? COLORS.warningText : COLORS.neutral500 }]}>
                {change > 0 ? '+' : ''}{change.toFixed(1)} kg
              </Text>
            </View>
          )}
          <Pressable
            onPress={onDelete}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Kaydı sil"
            style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.textLight} />
          </Pressable>
        </View>
      </View>
      <View style={s.recordBottom}>
        <Text style={s.recordWeight} maxFontSizeMultiplier={MAX_FONT_SCALE}>{record.weight}</Text>
        <Text style={s.recordUnit} maxFontSizeMultiplier={MAX_FONT_SCALE}>kg</Text>
        {record.notes ? (
          <Text style={s.recordNotes} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{record.notes}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function WeightPanel({ onWeightChange }) {
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weightError, setWeightError] = useState(null);
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
    const average = (weights.reduce((sum, w) => sum + w.weight, 0) / weights.length).toFixed(1);
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
    } catch (e) {
      handleError(e, { context: 'weight.list', onRetry: loadWeights });
    } finally {
      setLoading(false);
    }
  };

  const runWeightAIAdvice = async (list) => {
    const w = list ?? weights;
    if (!w?.length) return;
    const latest = w[0].weight;
    const oldest = w[w.length - 1].weight;
    const totalChange = latest - oldest;
    const average = (w.reduce((sum, x) => sum + x.weight, 0) / w.length).toFixed(1);
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const result = await aiService.getWeightTrackingAdvice({ weights: w, stats: { latest, oldest, totalChange, average } });
      setAiAdvice(result.advice || '');
      aiFailedRef.current = false;
    } catch (e) {
      aiFailedRef.current = true;
      handleError(e, { context: 'weight.advice', silent: true });
      setAiAdvice('');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const openAddModal = () => {
    setSelectedDate(new Date());
    setWeightError(null);
    modal.openAdd();
  };

  const openEditModal = (record) => {
    setSelectedDate(new Date(record.date));
    setWeightError(null);
    modal.openEdit(record, (r) => ({ weight: r.weight.toString(), notes: r.notes || '' }));
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const saveWeight = async () => {
    const err = validateWeight(modal.form.weight.replace(',', '.'));
    if (err) { setWeightError(err); return; }
    const parsedWeight = parseFloat(modal.form.weight.replace(',', '.'));
    setSaving(true);
    try {
      const selectedDateKey = toLocalDateString(selectedDate);
      const weightData = { date: selectedDateKey, weight: parsedWeight, notes: modal.form.notes };
      if (modal.editingId) {
        await weightService.update(modal.editingId, weightData);
        showToast('Kilo kaydınız güncellendi.', 'success');
      } else {
        const existingForDate = (weights || []).find((r) => toDateKey(r.date) === selectedDateKey);
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
      handleError(error, { context: 'weight.save', onRetry: saveWeight });
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteWeight = async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await weightService.delete(id);
      showToast('Kayıt silindi.', 'success');
      await loadWeights();
      const latestRecord = await weightService.getLatest();
      await bodyInfoService.syncWeight(latestRecord ? latestRecord.weight : null);
      onWeightChange(latestRecord ? latestRecord.weight : null);
    } catch (e) {
      handleError(e, { context: 'weight.delete' });
    }
  };

  const calculateChange = (index) =>
    index < weights.length - 1 ? weights[index].weight - weights[index + 1].weight : null;

  const statsHeader = stats ? (
    <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.statsHeader}>
      <MiniStat label="Mevcut" value={`${stats.latest} kg`} icon="fitness" />
      <MiniStat label="Değişim" value={`${stats.totalChange > 0 ? '+' : ''}${stats.totalChange.toFixed(1)} kg`} icon={stats.totalChange < 0 ? 'trending-down' : 'trending-up'} />
      <MiniStat label="Ortalama" value={`${stats.average} kg`} icon="stats-chart" />
    </LinearGradient>
  ) : null;

  return (
    <>
      <ScreenContainer tab edges={[]} header={statsHeader}>
        <SectionHeader
          title="Kilo Geçmişi"
          subtitle={loading ? 'Yükleniyor…' : `${weights.length} kayıt`}
        />

        <AppButton title="Yeni Kilo Kaydı Ekle" icon="add-circle" fullWidth onPress={openAddModal} style={s.addBtn} />

        {loading ? (
          <LoadingState variant="list" count={3} />
        ) : weights.length === 0 ? (
          <EmptyState
            icon="scale-outline"
            title="Henüz kilo kaydı yok"
            message="İlk ölçümünü ekle; değişim ve ortalama burada oluşsun."
            actionLabel="Kilo ekle"
            onAction={openAddModal}
          />
        ) : (
          weights.map((record, index) => (
            <WeightRecordCard
              key={record.id}
              record={record}
              change={calculateChange(index)}
              onEdit={() => openEditModal(record)}
              onDelete={() => setDeleteTargetId(record.id)}
            />
          ))
        )}

        {stats && (loadingAdvice || aiAdvice) ? (
          <AIAdviceCard
            visible
            loading={loadingAdvice}
            advice={aiAdvice}
            onRefresh={() => runWeightAIAdvice()}
            gradientColors={[COLORS.primary, COLORS.primaryLight]}
            iconTint={COLORS.primary}
            subtitle="Kilo kayıtlarınıza göre kişiselleştirilir"
            footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez."
            style={s.advice}
          />
        ) : null}
      </ScreenContainer>

      <BottomSheet
        visible={modal.visible}
        onClose={modal.close}
        title={modal.isEditing ? 'Kaydı Düzenle' : 'Yeni Kilo Kaydı'}
        subtitle={modal.isEditing ? 'Mevcut kaydı güncelleyin' : 'Günlük ölçümünüzü hızlıca ekleyin'}
        footer={
          <View style={s.footer}>
            <AppButton title="İptal" variant="secondary" onPress={modal.close} style={s.footerBtn} haptic={false} disabled={saving} />
            <AppButton title="Kaydet" icon="checkmark" onPress={saveWeight} loading={saving} style={s.footerBtn} />
          </View>
        }
      >
        <Text style={s.hint} maxFontSizeMultiplier={MAX_FONT_SCALE}>Tarih ve kilo yeterli; not alanı opsiyoneldir.</Text>

        <Text style={s.label} maxFontSizeMultiplier={MAX_FONT_SCALE}>Tarih</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel={`Tarih: ${formatLongDate(selectedDate)}. Değiştirmek için dokunun`}
          style={({ pressed }) => [s.dateBtn, pressed && s.pressed]}
        >
          <IconBadge name="calendar-outline" size={36} shape="rounded" />
          <Text style={s.dateText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{formatLongDate(selectedDate)}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </Pressable>
        <Text style={s.dateHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>Bu tarih için kayıt varsa üzerine yazılır.</Text>

        <AppInput
          label="Kilo"
          icon="fitness-outline"
          unit="kg"
          value={modal.form.weight}
          onChangeText={(t) => { modal.updateField('weight', t); if (weightError) setWeightError(null); }}
          error={weightError}
          placeholder="75.5"
          keyboardType="decimal-pad"
          returnKeyType="done"
          inputStyle={s.weightInput}
        />

        <AppInput
          label="Notlar (opsiyonel)"
          icon="document-text-outline"
          value={modal.form.notes}
          onChangeText={(t) => modal.updateField('notes', t)}
          placeholder="Notlarınızı yazın…"
          multiline
          textAlignVertical="top"
          inputStyle={s.notesInput}
        />
      </BottomSheet>

      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={selectedDate}
        onChange={onDateChange}
        maximumDate={new Date()}
      />

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
    </>
  );
}

const s = StyleSheet.create({
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: SIZES.containerPadding, paddingVertical: SIZES.md },
  miniStat: { alignItems: 'center', flex: 1 },
  miniStatVal: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary, marginTop: 4 },
  miniStatLabel: { fontSize: SIZES.tiny, color: whiteAlpha(0.85) },
  addBtn: { marginBottom: SIZES.md },
  recordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  recordTopRight: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  recordDate: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.radiusFull },
  changeText: { fontSize: SIZES.tiny, fontWeight: '700' },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  recordBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  recordWeight: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.primary },
  recordUnit: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary },
  recordNotes: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, marginLeft: SIZES.sm },
  advice: { marginTop: SIZES.xs },
  footer: { flexDirection: 'row', gap: SIZES.sm },
  footerBtn: { flex: 1 },
  hint: { fontSize: SIZES.small, color: COLORS.textLight, marginBottom: SIZES.md },
  label: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.2, marginBottom: 6, marginLeft: 4 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.sm + 2,
    minHeight: SIZES.inputHeight,
    gap: SIZES.sm + 2,
    ...SHADOWS.small,
  },
  dateText: { flex: 1, fontSize: SIZES.body, fontWeight: '600', color: COLORS.text },
  dateHint: { fontSize: SIZES.tiny, color: COLORS.textLight, marginTop: 6, marginLeft: 4, marginBottom: SIZES.md },
  weightInput: { fontSize: SIZES.h4, fontWeight: '600' },
  notesInput: { minHeight: 80, paddingTop: 12 },
});
