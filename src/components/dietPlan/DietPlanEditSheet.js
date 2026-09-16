import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE, HIT_SLOP } from '../../constants/theme';
import { BottomSheet, AppButton, AppInput, ProgressBar } from '../ui';
import MealFoodPickerSection from './MealFoodPickerSection';
import { MEAL_FIELDS } from '../../constants/dietPlanFields';

/**
 * Plan oluştur / düzenle alt sayfası.
 * Form state'i ekranda (DietPlanScreen) tutulur; burada yalnızca sunum + olaylar.
 */
export default function DietPlanEditSheet({
  visible,
  onClose,
  isEdit,
  dateLabel,
  form,
  onAppendLine,
  onRemoveLine,
  onUpdateField,
  computedKcal,
  totalCaloriesManual,
  onResetAutoKcal,
  saving,
  onSave,
  showToast,
}) {
  const filled = MEAL_FIELDS.filter((f) => form[f.key]?.trim()).length;

  const renderGroup = (group) =>
    MEAL_FIELDS.filter((f) => f.group === group).map((f) => (
      <MealFoodPickerSection
        key={f.key}
        field={f}
        formValue={form[f.key]}
        onAppend={(line) => onAppendLine(f.key, line)}
        onRemoveLine={(idx) => onRemoveLine(f.key, idx)}
        showToast={showToast}
      />
    ));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Planı Düzenle' : 'Plan Oluştur'}
      subtitle={dateLabel}
      maxHeight={0.92}
      footer={
        <View style={styles.footer}>
          <AppButton title="İptal" variant="secondary" onPress={onClose} disabled={saving} style={styles.footerBtn} haptic={false} />
          <AppButton title="Kaydet" icon="checkmark" onPress={onSave} loading={saving} style={styles.footerBtn} />
        </View>
      }
    >
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {filled}/{MEAL_FIELDS.length} öğün dolu
        </Text>
        <ProgressBar value={filled / MEAL_FIELDS.length} style={styles.progressBar} />
      </View>

      <Text style={styles.hint} maxFontSizeMultiplier={MAX_FONT_SCALE}>Boş alanlar opsiyoneldir.</Text>
      <Text style={styles.legalHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Eklediğiniz besin satırlarındaki kalori tahminleri veritabanı veya yapay zekâya dayanır; kişisel
        tıbbi öneri oluşturmaz. Şüphede uzmana danışın.
      </Text>

      <Text style={styles.groupTitle} accessibilityRole="header">Ana Öğünler</Text>
      {renderGroup('main')}

      <Text style={styles.groupTitle} accessibilityRole="header">Ara Öğünler</Text>
      {renderGroup('snack')}

      <Text style={styles.groupTitle} accessibilityRole="header">Ek Bilgiler</Text>

      {computedKcal > 0 && (
        <Text style={styles.kcalHint} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Besin satırlarından toplam: <Text style={styles.kcalHintBold}>{computedKcal} kcal</Text>
          {totalCaloriesManual ? ' (manuel toplam kullanılıyor)' : ''}
        </Text>
      )}

      <AppInput
        label="Toplam kalori"
        icon="flame-outline"
        unit="kcal"
        value={form.total_calories}
        onChangeText={(t) => onUpdateField('total_calories', t)}
        placeholder={totalCaloriesManual ? 'Toplam kalori (manuel)' : 'Otomatik; elle düzenlemek için yazın'}
        keyboardType="numeric"
        helper={
          totalCaloriesManual ? undefined : 'Besin satırlarından otomatik hesaplanır'
        }
      />
      {totalCaloriesManual && (
        <Pressable
          onPress={onResetAutoKcal}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          style={({ pressed }) => [styles.autoBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
          <Text style={styles.autoBtnText}>Satırlardan otomatik toplama dön</Text>
        </Pressable>
      )}

      <AppInput
        label="Notlar"
        icon="document-text-outline"
        value={form.notes}
        onChangeText={(t) => onUpdateField('notes', t)}
        placeholder="Notlar (opsiyonel)…"
        multiline
        textAlignVertical="top"
        inputStyle={styles.notesInput}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: SIZES.sm },
  footerBtn: { flex: 1 },
  progressRow: { marginBottom: SIZES.md },
  progressLabel: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  progressBar: {},
  hint: { fontSize: SIZES.small, color: COLORS.textLight, marginBottom: 4 },
  legalHint: { fontSize: SIZES.tiny, color: COLORS.textLight, lineHeight: 16, marginBottom: SIZES.sm },
  groupTitle: { fontSize: SIZES.small, fontWeight: '800', color: COLORS.text, marginTop: SIZES.md, marginBottom: SIZES.sm, letterSpacing: 0.2 },
  kcalHint: { fontSize: SIZES.small, color: COLORS.textSecondary, marginBottom: SIZES.sm },
  kcalHintBold: { fontWeight: '800', color: COLORS.text },
  autoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -SIZES.sm, marginBottom: SIZES.md, minHeight: 32 },
  autoBtnText: { fontSize: SIZES.small, color: COLORS.primary, fontWeight: '700' },
  notesInput: { minHeight: 88, paddingTop: 12 },
});
