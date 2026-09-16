import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import { dietPlanService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import GuestGateBanner from '../components/GuestGateBanner';
import MedicalInfoBanner from '../components/MedicalInfoBanner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { ScreenContainer, ConfirmModal, DatePickerSheet, AppButton, ActionCta, formatDayLabel } from '../components/ui';
import MealCard, { SectionTitle } from '../components/dietPlan/MealCard';
import DietPlanHeader from '../components/dietPlan/DietPlanHeader';
import DietPlanEditSheet from '../components/dietPlan/DietPlanEditSheet';
import DietPlanHistorySheet from '../components/dietPlan/DietPlanHistorySheet';
import { MEAL_FIELDS, EMPTY_FORM } from '../constants/dietPlanFields';
import { toDateStr, sumAllMealKcal } from '../utils/dietPlanUtils';

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function DietPlanScreen() {
  const navigation = useNavigation();
  const { handleError } = useAppError();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayPlan, setTodayPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [saving, setSaving] = useState(false);


  // ── Geçmiş planlar sheet ───────────────────────────────────────────────────
  const [historyVisible, setHistoryVisible] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterYear, setFilterYear] = useState(null);   // null = tümü
  const [filterMonth, setFilterMonth] = useState(null); // null = tümü
  const [searchQuery, setSearchQuery] = useState('');

  const openHistory = async () => {
    if (!user) { showToast('Giriş yapın.', 'info'); return; }
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      const data = await dietPlanService.getAll();
      setAllPlans(data || []);
      // Varsayılan filtre: bu yıl
      const thisYear = new Date().getFullYear();
      setFilterYear(thisYear);
      setFilterMonth(null);
      setSearchQuery('');
    } catch (e) {
      handleError(e, { context: 'dietPlan.history', onRetry: openHistory });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Mevcut filtreye göre plan listesi
  const filteredPlans = React.useMemo(() => {
    return allPlans.filter((p) => {
      const d = new Date(p.date);
      if (filterYear && d.getFullYear() !== filterYear) return false;
      if (filterMonth !== null && d.getMonth() !== filterMonth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = [p.breakfast, p.lunch, p.dinner, p.morning_snack, p.afternoon_snack, p.evening_snack, p.notes]
          .filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [allPlans, filterYear, filterMonth, searchQuery]);

  // Mevcut planlardaki benzersiz yıllar
  const availableYears = React.useMemo(() => {
    const yrs = [...new Set(allPlans.map((p) => new Date(p.date).getFullYear()))];
    return yrs.sort((a, b) => b - a);
  }, [allPlans]);

  /** Toplam kalori: besin satırlarından otomatik; kullanıcı alanı elle değiştirdiyse kilitle */
  const [totalCaloriesManual, setTotalCaloriesManual] = useState(false);

  const computedMealKcalTotal = useMemo(
    () => sumAllMealKcal(form),
    [
      form.breakfast,
      form.morning_snack,
      form.lunch,
      form.afternoon_snack,
      form.dinner,
      form.evening_snack,
    ]
  );

  const appendFoodLine = useCallback((mealKey, line) => {
    setForm((prev) => {
      const cur = (prev[mealKey] || '').trim();
      return { ...prev, [mealKey]: cur ? `${cur}\n${line}` : line };
    });
    setTotalCaloriesManual(false);
  }, []);

  const removeFoodLine = useCallback((mealKey, lineIndex) => {
    setForm((f) => {
      const lines = (f[mealKey] || '').split('\n').filter((l) => l.trim());
      lines.splice(lineIndex, 1);
      return { ...f, [mealKey]: lines.join('\n') };
    });
    setTotalCaloriesManual(false);
  }, []);

  useEffect(() => {
    if (!modalVisible || totalCaloriesManual) return;
    const next = computedMealKcalTotal > 0 ? String(computedMealKcalTotal) : '';
    setForm((f) => (f.total_calories === next ? f : { ...f, total_calories: next }));
  }, [modalVisible, computedMealKcalTotal, totalCaloriesManual]);

  const filledCount = MEAL_FIELDS.filter(
    (f) => todayPlan?.[f.key]?.trim()
  ).length;
  const progressPct = filledCount / MEAL_FIELDS.length;

  // ── Veri yükleme ──────────────────────────────────────────────────────────

  const lastLoadRef = React.useRef(0);
  const lastLoadedKey = React.useRef('');

  const loadPlan = useCallback(async (force = false) => {
    if (!user) { setTodayPlan(null); return; }
    const cacheKey = `${toDateStr(selectedDate)}_${user.id || ''}`;
    const now = Date.now();
    if (!force && cacheKey === lastLoadedKey.current && now - lastLoadRef.current < 30_000) return;
    lastLoadRef.current = now;
    lastLoadedKey.current = cacheKey;
    setLoading(true);
    try {
      const plan = await dietPlanService.getByDate(toDateStr(selectedDate));
      setTodayPlan(plan || null);
    } catch (e) {
      handleError(e, { context: 'dietPlan.load', onRetry: () => loadPlan(true) });
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  // İlk yükleme
  useEffect(() => { loadPlan(true); }, [loadPlan]);

  // Tab odağında — 30sn cache'i varsa atlar
  useFocusEffect(useCallback(() => { loadPlan(); }, [loadPlan]));

  // ── Tarih navigasyonu ──────────────────────────────────────────────────────

  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const dateLabel = formatDayLabel(selectedDate);

  // ── Modal aç/kapat ─────────────────────────────────────────────────────────

  const openModal = (scrollToField) => {
    if (!user) { showToast('Plan eklemek için giriş yapın.', 'info'); return; }
    const nextForm = todayPlan
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
      : { ...EMPTY_FORM };
    const parsedSum = sumAllMealKcal(nextForm);
    setForm(nextForm);
    setTotalCaloriesManual(!!(todayPlan?.total_calories && parsedSum === 0));
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const updateField = (key, val) => {
    if (key === 'total_calories') setTotalCaloriesManual(true);
    setForm((f) => ({ ...f, [key]: val }));
  };


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
        total_calories:   (() => {
          const t = parseInt(form.total_calories, 10);
          return Number.isFinite(t) && t >= 0 ? t : null;
        })(),
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
    } catch (e) {
      handleError(e, { context: 'dietPlan.save', onRetry: savePlan });
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
    } catch (e) {
      handleError(e, { context: 'dietPlan.delete' });
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
    } catch (e) {
      // Tavsiye isteğe bağlı — sessizce logla, ekranı kesme
      handleError(e, { context: 'dietPlan.advice', silent: true });
      setAiAdvice('');
    } finally {
      setLoadingAdvice(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const header = (
    <DietPlanHeader
      user={user}
      plan={todayPlan}
      filledCount={filledCount}
      totalFields={MEAL_FIELDS.length}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      onOpenPicker={() => setShowDatePicker(true)}
      onOpenHistory={openHistory}
      onDelete={() => setDeleteVisible(true)}
    />
  );

  return (
    <>
      <ScreenContainer tab edges={[]} header={header} scrollProps={{ style: styles.scroll }}>
        {!user && (
          <GuestGateBanner
            navigation={navigation}
            message="Diyet planlarınız bulutta saklanır. Giriş yaparak her cihazdan erişin."
          />
        )}

        <MedicalInfoBanner title="Önemli bilgilendirme">
          Bu ekran kişisel kayıt ve genel bilgilendirme amaçlıdır; tıbbi teşhis, tedavi veya uzman beslenme
          planı değildir ve bunların yerine geçmez. Kalori ve besin değerleri yaklaşıktır. Özel sağlık
          durumlarınız için hekim veya diyetisyene danışın. Acil durumlarda yerel acil hattınızı arayın (ör. 112).
        </MedicalInfoBanner>

        <ActionCta
          icon="camera"
          title="Fotoğraftan kalori tahmini"
          subtitle={user ? 'Yemeğin fotoğrafından tahmini kalori al' : 'Kullanmak için giriş yapın'}
          locked={!user}
          onPress={() => {
            if (!user) { showToast('Fotoğraftan kalori için giriş yapın.', 'info'); return; }
            navigation.navigate('MealCalorie');
          }}
        />

        <SectionTitle label="Ana Öğünler" />
        {MEAL_FIELDS.filter((f) => f.group === 'main').map((meal) => (
          <MealCard key={meal.key} meal={meal} value={todayPlan?.[meal.key] || ''} loading={loading} onPress={() => openModal(meal.key)} />
        ))}

        <SectionTitle label="Ara Öğünler" />
        {MEAL_FIELDS.filter((f) => f.group === 'snack').map((meal) => (
          <MealCard key={meal.key} meal={meal} value={todayPlan?.[meal.key] || ''} loading={loading} onPress={() => openModal(meal.key)} />
        ))}

        {todayPlan?.notes ? (
          <ActionCta
            icon="document-text-outline"
            title="Not"
            subtitle={todayPlan.notes}
            onPress={() => openModal('notes')}
            style={styles.notesCard}
          />
        ) : null}

        {user && (
          <AppButton
            title={todayPlan ? 'Planı Düzenle' : 'Plan Oluştur'}
            icon={todayPlan ? 'create-outline' : 'add-circle-outline'}
            size="lg"
            fullWidth
            onPress={() => openModal()}
            style={styles.addBtn}
          />
        )}

        {user && (loadingAdvice || aiAdvice) && (
          <AIAdviceCard
            visible
            loading={loadingAdvice}
            advice={aiAdvice}
            onRefresh={fetchAIAdvice}
            gradientColors={[COLORS.primary, COLORS.primaryLight]}
            iconTint={COLORS.primary}
            subtitle="Planlarınıza göre kişiselleştirilir"
            footerDisclaimer="Yapay zekâ metni genel bilgilendirme amaçlıdır; tıbbi teşhis, tedavi veya kişisel beslenme planı yerine geçmez. Özel durumlar için hekim veya diyetisyeninize danışın."
          />
        )}
      </ScreenContainer>

      <DietPlanEditSheet
        visible={modalVisible}
        onClose={closeModal}
        isEdit={!!todayPlan}
        dateLabel={dateLabel}
        form={form}
        onAppendLine={appendFoodLine}
        onRemoveLine={removeFoodLine}
        onUpdateField={updateField}
        computedKcal={computedMealKcalTotal}
        totalCaloriesManual={totalCaloriesManual}
        onResetAutoKcal={() => {
          setTotalCaloriesManual(false);
          const next = computedMealKcalTotal > 0 ? String(computedMealKcalTotal) : '';
          setForm((f) => ({ ...f, total_calories: next }));
        }}
        saving={saving}
        onSave={savePlan}
        showToast={showToast}
      />

      <DietPlanHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        allPlans={allPlans}
        filteredPlans={filteredPlans}
        historyLoading={historyLoading}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterYear={filterYear}
        onFilterYearChange={setFilterYear}
        filterMonth={filterMonth}
        onFilterMonthChange={setFilterMonth}
        availableYears={availableYears}
        selectedDate={selectedDate}
        onSelectPlanDate={(d) => {
          setSelectedDate(d);
          setHistoryVisible(false);
        }}
      />

      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={selectedDate}
        onChange={onDatePickerChange}
      />

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
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  notesCard: { marginTop: SIZES.sm },
  addBtn: { marginTop: SIZES.md, marginBottom: SIZES.lg },
});
