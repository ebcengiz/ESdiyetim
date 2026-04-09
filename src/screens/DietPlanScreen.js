import React, { useState, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { dietPlanService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import HealthSourcesCard from '../components/HealthSourcesCard';
import GuestGateBanner from '../components/GuestGateBanner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ui/ConfirmModal';

// ─── Sabitler ────────────────────────────────────────────────────────────────

const MEAL_FIELDS = [
  { key: 'breakfast',       icon: 'sunny-outline',        label: 'Kahvaltı',     color: '#F59E0B', placeholder: 'Kahvaltıda ne yenilecek?',          group: 'main'  },
  { key: 'lunch',           icon: 'partly-sunny-outline', label: 'Öğle Yemeği',  color: '#10B981', placeholder: 'Öğle yemeğinde ne yenilecek?',       group: 'main'  },
  { key: 'dinner',          icon: 'moon-outline',         label: 'Akşam Yemeği', color: '#6366F1', placeholder: 'Akşam yemeğinde ne yenilecek?',      group: 'main'  },
  { key: 'morning_snack',   icon: 'cafe-outline',         label: 'Kuşluk',       color: '#EC4899', placeholder: 'Sabah ara öğünü...',                 group: 'snack' },
  { key: 'afternoon_snack', icon: 'nutrition-outline',    label: 'İkindi',       color: '#14B8A6', placeholder: 'Öğleden sonra ara öğünü...',         group: 'snack' },
  { key: 'evening_snack',   icon: 'moon-outline',         label: 'Gece',         color: '#8B5CF6', placeholder: 'Akşam ara öğünü...',                 group: 'snack' },
];

const EMPTY_FORM = {
  breakfast: '', morning_snack: '', lunch: '',
  afternoon_snack: '', dinner: '', evening_snack: '',
  notes: '', total_calories: '',
};

function toDateStr(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function DietPlanScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayPlan, setTodayPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [focusedField, setFocusedField] = useState('');
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [saving, setSaving] = useState(false);

  const isToday =
    toDateStr(selectedDate) === toDateStr(new Date());

  const filledCount = MEAL_FIELDS.filter(
    (f) => todayPlan?.[f.key]?.trim()
  ).length;
  const progressPct = filledCount / MEAL_FIELDS.length;

  // ── Veri yükleme ──────────────────────────────────────────────────────────

  const loadPlan = useCallback(async () => {
    if (!user) { setTodayPlan(null); return; }
    setLoading(true);
    try {
      const plan = await dietPlanService.getByDate(toDateStr(selectedDate));
      setTodayPlan(plan || null);
    } catch {
      showToast('Plan yüklenirken hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useFocusEffect(useCallback(() => { loadPlan(); }, [loadPlan]));

  // ── Tarih navigasyonu ──────────────────────────────────────────────────────

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const dateLabel = isToday
    ? 'Bugün'
    : selectedDate.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', weekday: 'long',
      });

  // ── Modal aç/kapat ─────────────────────────────────────────────────────────

  const openModal = (scrollToField) => {
    if (!user) { showToast('Plan eklemek için giriş yapın.', 'info'); return; }
    setForm(
      todayPlan
        ? {
            breakfast:        todayPlan.breakfast        || '',
            morning_snack:    todayPlan.morning_snack    || '',
            lunch:            todayPlan.lunch            || '',
            afternoon_snack:  todayPlan.afternoon_snack  || '',
            dinner:           todayPlan.dinner           || '',
            evening_snack:    todayPlan.evening_snack    || '',
            notes:            todayPlan.notes            || '',
            total_calories:   todayPlan.total_calories?.toString() || '',
          }
        : EMPTY_FORM
    );
    setFocusedField(scrollToField || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFocusedField('');
  };

  const updateField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // ── Kaydet ─────────────────────────────────────────────────────────────────

  const savePlan = async () => {
    setSaving(true);
    try {
      const payload = {
        date:             toDateStr(selectedDate),
        breakfast:        form.breakfast,
        morning_snack:    form.morning_snack,
        lunch:            form.lunch,
        afternoon_snack:  form.afternoon_snack,
        dinner:           form.dinner,
        evening_snack:    form.evening_snack,
        notes:            form.notes,
        total_calories:   form.total_calories ? parseInt(form.total_calories) : null,
      };

      if (todayPlan?.id) {
        await dietPlanService.update(todayPlan.id, payload);
        showToast('Plan güncellendi.', 'success');
      } else {
        await dietPlanService.create(payload);
        showToast('Plan oluşturuldu.', 'success');
      }
      closeModal();
      await loadPlan();
      fetchAIAdvice();
    } catch {
      showToast('Plan kaydedilemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Sil ────────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    setDeleteVisible(false);
    if (!todayPlan?.id) return;
    try {
      await dietPlanService.delete(todayPlan.id);
      setTodayPlan(null);
      setAiAdvice('');
      showToast('Plan silindi.', 'success');
    } catch {
      showToast('Plan silinemedi.', 'error');
    }
  };

  // ── AI Tavsiye ─────────────────────────────────────────────────────────────

  const fetchAIAdvice = async () => {
    if (!user) return;
    try {
      const all = await dietPlanService.getAll();
      if (!all?.length) return;
      const withCal = all.filter((p) => p.total_calories);
      const avgCal  = withCal.length
        ? Math.round(all.reduce((s, p) => s + (p.total_calories || 0), 0) / withCal.length)
        : 0;
      const ago30   = new Date(); ago30.setDate(ago30.getDate() - 30);
      const monthly = all.filter((p) => new Date(p.date) >= ago30).length;
      setLoadingAdvice(true);
      setAiAdvice('');
      const res = await aiService.getDietPlanAdvice({
        stats: { totalPlans: all.length, avgCalories: avgCal, monthlyPlans: monthly },
        recentPlans: all,
      });
      setAiAdvice(res.advice || '');
    } catch {
      setAiAdvice('');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // ── Modal form dolu sayısı ─────────────────────────────────────────────────

  const modalFilled = MEAL_FIELDS.filter(
    (f) => form[f.key]?.trim()
  ).length;
  const modalProgress = Math.round((modalFilled / MEAL_FIELDS.length) * 100);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 10 }]}
      >
        {/* Rozet */}
        <View style={styles.headerTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={13} color="#fff" />
            <Text style={styles.heroBadgeText}>AI destekli plan takibi</Text>
          </View>
          {todayPlan && user && (
            <TouchableOpacity
              style={styles.deleteHeaderBtn}
              onPress={() => setDeleteVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.75)" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.headerTitle}>Diyet Planlarım</Text>
        <Text style={styles.headerSub}>Günlük öğünlerini planla ve takip et.</Text>

        {/* Tarih seçici */}
        <View style={styles.datePicker}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{dateLabel}</Text>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* İlerleme özeti */}
        {user && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {todayPlan ? `${filledCount} / ${MEAL_FIELDS.length} öğün planlandı` : 'Plan henüz oluşturulmadı'}
              </Text>
              {todayPlan?.total_calories ? (
                <View style={styles.caloriePill}>
                  <Ionicons name="flame" size={12} color="#F59E0B" />
                  <Text style={styles.caloriePillText}>{todayPlan.total_calories} kcal</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ── SCROLL ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!user && (
          <GuestGateBanner
            navigation={navigation}
            message="Diyet planlarınız bulutta saklanır. Giriş yaparak her cihazdan erişin."
          />
        )}

        {/* Fotoğraftan kalori CTA */}
        <TouchableOpacity
          style={styles.ctaCard}
          onPress={() => {
            if (!user) { showToast('Giriş yapın.', 'info'); return; }
            navigation.navigate('MealCalorie');
          }}
          activeOpacity={0.82}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="camera" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Fotoğraftan kalori tahmini</Text>
            <Text style={styles.ctaSub}>{user ? 'Yemeğin fotoğrafından tahmini kalori al' : 'Kullanmak için giriş yapın'}</Text>
          </View>
          <Ionicons name={user ? 'chevron-forward' : 'lock-closed-outline'} size={18} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* ─── Öğün Bölümleri ─── */}

        <SectionTitle label="Ana Öğünler" />
        {MEAL_FIELDS.filter((f) => f.group === 'main').map((meal) => (
          <MealCard
            key={meal.key}
            meal={meal}
            value={todayPlan?.[meal.key] || ''}
            loading={loading}
            onPress={() => openModal(meal.key)}
          />
        ))}

        <SectionTitle label="Ara Öğünler" />
        {MEAL_FIELDS.filter((f) => f.group === 'snack').map((meal) => (
          <MealCard
            key={meal.key}
            meal={meal}
            value={todayPlan?.[meal.key] || ''}
            loading={loading}
            onPress={() => openModal(meal.key)}
          />
        ))}

        {/* Notlar */}
        {todayPlan?.notes ? (
          <TouchableOpacity style={styles.notesCard} onPress={() => openModal('notes')} activeOpacity={0.8}>
            <View style={styles.notesIconWrap}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notesCardLabel}>Not</Text>
              <Text style={styles.notesCardText} numberOfLines={3}>{todayPlan.notes}</Text>
            </View>
            <Ionicons name="pencil-outline" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        ) : null}

        {/* Plan ekle / düzenle butonu */}
        {user && (
          <TouchableOpacity style={styles.addPlanBtn} onPress={() => openModal()} activeOpacity={0.88}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.addPlanGradient}
            >
              <Ionicons name={todayPlan ? 'create-outline' : 'add-circle-outline'} size={20} color="#fff" />
              <Text style={styles.addPlanText}>{todayPlan ? 'Planı Düzenle' : 'Plan Oluştur'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* AI Tavsiye */}
        {user && (loadingAdvice || aiAdvice) && (
          <AIAdviceCard
            visible
            loading={loadingAdvice}
            advice={aiAdvice}
            onRefresh={fetchAIAdvice}
            gradientColors={[COLORS.primary, COLORS.primaryLight]}
            iconTint={COLORS.primary}
            subtitle="Planlarınıza göre kişiselleştirilir"
            footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez."
            style={{ marginHorizontal: SIZES.containerPadding }}
          />
        )}

        <HealthSourcesCard
          variant="general"
          style={{ marginHorizontal: SIZES.containerPadding, marginTop: SIZES.lg }}
        />
      </ScrollView>

      {/* ── DÜZENLEME MODAL ────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Başlık */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {todayPlan ? 'Planı Düzenle' : 'Plan Oluştur'}
                </Text>
                <Text style={styles.modalSubtitle}>{dateLabel}</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* İlerleme */}
            <View style={styles.modalProgressRow}>
              <Text style={styles.modalProgressLabel}>{modalFilled}/{MEAL_FIELDS.length} öğün dolu</Text>
              <View style={styles.modalProgressTrack}>
                <View style={[styles.modalProgressFill, { width: `${modalProgress}%` }]} />
              </View>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalHint}>Boş alanlar opsiyoneldir.</Text>

              {/* Ana öğünler */}
              <Text style={styles.modalGroupTitle}>Ana Öğünler</Text>
              {MEAL_FIELDS.filter((f) => f.group === 'main').map((f) => (
                <FormMealInput
                  key={f.key}
                  field={f}
                  value={form[f.key]}
                  focused={focusedField === f.key}
                  onFocus={() => setFocusedField(f.key)}
                  onBlur={() => setFocusedField('')}
                  onChange={(t) => updateField(f.key, t)}
                />
              ))}

              {/* Ara öğünler */}
              <Text style={styles.modalGroupTitle}>Ara Öğünler</Text>
              {MEAL_FIELDS.filter((f) => f.group === 'snack').map((f) => (
                <FormMealInput
                  key={f.key}
                  field={f}
                  value={form[f.key]}
                  focused={focusedField === f.key}
                  onFocus={() => setFocusedField(f.key)}
                  onBlur={() => setFocusedField('')}
                  onChange={(t) => updateField(f.key, t)}
                  compact
                />
              ))}

              {/* Ek bilgiler */}
              <Text style={styles.modalGroupTitle}>Ek Bilgiler</Text>

              <View style={styles.extraRow}>
                <View style={[styles.extraIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="flame" size={16} color="#F59E0B" />
                </View>
                <TextInput
                  style={styles.extraInput}
                  value={form.total_calories}
                  onChangeText={(t) => updateField('total_calories', t)}
                  placeholder="Toplam kalori (opsiyonel)"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                />
                <Text style={styles.extraUnit}>kcal</Text>
              </View>

              <View style={[styles.extraRow, { alignItems: 'flex-start', paddingTop: SIZES.sm }]}>
                <View style={[styles.extraIconWrap, { backgroundColor: COLORS.highlight }]}>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                </View>
                <TextInput
                  style={[styles.extraInput, { minHeight: 72 }]}
                  value={form.notes}
                  onChangeText={(t) => updateField('notes', t)}
                  placeholder="Notlar (opsiyonel)..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Kaydet / İptal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={savePlan}
                disabled={saving}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.saveBtnGradient}
                >
                  <Ionicons name="checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── SİL ONAY ───────────────────────────────────────── */}
      <ConfirmModal
        visible={deleteVisible}
        title="Planı Sil"
        message="Bu günün diyet planını silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        cancelText="İptal"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteVisible(false)}
      />
    </View>
  );
}

// ─── Alt Bileşenler ───────────────────────────────────────────────────────────

function SectionTitle({ label }) {
  return (
    <View style={sec.titleRow}>
      <View style={sec.titleLine} />
      <Text style={sec.titleText}>{label}</Text>
      <View style={sec.titleLine} />
    </View>
  );
}

function MealCard({ meal, value, loading, onPress }) {
  const filled = !!value?.trim();
  return (
    <TouchableOpacity style={card.wrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[card.iconBubble, { backgroundColor: meal.color + '1A' }]}>
        <Ionicons name={meal.icon} size={20} color={meal.color} />
      </View>
      <View style={card.body}>
        <Text style={card.label}>{meal.label}</Text>
        {loading ? (
          <View style={card.skeleton} />
        ) : filled ? (
          <Text style={card.content} numberOfLines={2}>{value}</Text>
        ) : (
          <Text style={card.empty}>Eklemek için dokunun</Text>
        )}
      </View>
      <View style={[card.statusDot, { backgroundColor: filled ? '#22C55E' : COLORS.border }]} />
    </TouchableOpacity>
  );
}

function FormMealInput({ field, value, focused, onFocus, onBlur, onChange, compact }) {
  return (
    <View style={fm.wrap}>
      <View style={fm.labelRow}>
        <View style={[fm.iconBubble, { backgroundColor: field.color + '1A' }]}>
          <Ionicons name={field.icon} size={14} color={field.color} />
        </View>
        <Text style={fm.label}>{field.label}</Text>
      </View>
      <TextInput
        style={[
          fm.input,
          compact && fm.inputCompact,
          focused && fm.inputFocused,
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={field.placeholder}
        placeholderTextColor={COLORS.textLight}
        multiline={!compact}
        numberOfLines={compact ? 1 : 3}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </View>
  );
}

// ─── Stiller ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingBottom: SIZES.lg },
  headerTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10,
  },
  heroBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  deleteHeaderBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.h2, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, paddingHorizontal: SIZES.containerPadding,
  },
  headerSub: {
    fontSize: SIZES.small, color: 'rgba(255,255,255,0.88)',
    paddingHorizontal: SIZES.containerPadding, marginTop: 3, marginBottom: SIZES.md,
  },

  // Tarih
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: SIZES.containerPadding, marginBottom: SIZES.md,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
  },
  dateArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginHorizontal: SIZES.md,
  },
  dateLabel: { flex: 1, textAlign: 'center', fontSize: SIZES.body, fontWeight: '700', color: '#fff' },

  // İlerleme
  progressCard: {
    marginHorizontal: SIZES.containerPadding,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: SIZES.radius, padding: SIZES.sm + 2,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: SIZES.small, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  caloriePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  caloriePillText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: SIZES.md, paddingBottom: Platform.OS === 'ios' ? 120 : 110 },

  // CTA
  ctaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge, padding: SIZES.md,
    marginHorizontal: SIZES.containerPadding, marginBottom: SIZES.md,
    gap: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  ctaIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center',
  },
  ctaTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  ctaSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },

  // Plan ekle
  addPlanBtn: {
    marginHorizontal: SIZES.containerPadding,
    marginTop: SIZES.md, marginBottom: SIZES.lg,
    borderRadius: SIZES.radiusMedium, overflow: 'hidden', ...SHADOWS.medium,
  },
  addPlanGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.sm, paddingVertical: 14,
  },
  addPlanText: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },

  // Notlar kartı
  notesCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge, padding: SIZES.md,
    marginHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm,
    gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  notesIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center',
  },
  notesCardLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  notesCardText: { fontSize: SIZES.small, color: COLORS.text, lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: '94%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: SIZES.sm,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.containerPadding, paddingBottom: SIZES.sm,
  },
  modalTitle: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  modalSubtitle: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  modalProgressRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.containerPadding, gap: SIZES.sm, marginBottom: SIZES.sm,
  },
  modalProgressLabel: { fontSize: SIZES.small, color: COLORS.textSecondary, fontWeight: '600', minWidth: 90 },
  modalProgressTrack: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  modalProgressFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  modalBody: { flex: 1 },
  modalScrollContent: { paddingHorizontal: SIZES.containerPadding, paddingBottom: SIZES.xl },
  modalHint: { fontSize: SIZES.small, color: COLORS.textSecondary, marginBottom: SIZES.md },
  modalGroupTitle: {
    fontSize: SIZES.small, fontWeight: '800', color: COLORS.textSecondary,
    letterSpacing: 0.5, textTransform: 'uppercase', marginTop: SIZES.md, marginBottom: SIZES.sm,
  },

  // Extra (kalori/not) alanları
  extraRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radius, padding: SIZES.sm,
    gap: SIZES.sm, marginBottom: SIZES.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  extraIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  extraInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text },
  extraUnit: { fontSize: SIZES.small, color: COLORS.textSecondary, fontWeight: '600' },

  // Footer
  modalFooter: {
    flexDirection: 'row', gap: SIZES.sm,
    paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: SIZES.radiusMedium,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: { flex: 2, borderRadius: SIZES.radiusMedium, overflow: 'hidden', ...SHADOWS.small },
  saveBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.sm, paddingVertical: 13,
  },
  saveBtnText: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },
});

// Bölüm başlığı
const sec = StyleSheet.create({
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SIZES.containerPadding,
    marginTop: SIZES.md, marginBottom: SIZES.sm, gap: SIZES.sm,
  },
  titleLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  titleText: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
});

// Öğün kartı
const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge, padding: SIZES.md,
    marginHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm,
    gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  iconBubble: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  body: { flex: 1 },
  label: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  content: { fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  empty: { fontSize: SIZES.small, color: COLORS.textLight, fontStyle: 'italic' },
  skeleton: { height: 12, width: '60%', borderRadius: 6, backgroundColor: COLORS.shimmer },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});

// Form giriş
const fm = StyleSheet.create({
  wrap: { marginBottom: SIZES.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  iconBubble: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  label: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    fontSize: SIZES.body, color: COLORS.text, minHeight: 72,
    textAlignVertical: 'top',
  },
  inputCompact: { minHeight: 44, textAlignVertical: 'center' },
  inputFocused: { borderColor: COLORS.primary, borderWidth: 1.5 },
});
