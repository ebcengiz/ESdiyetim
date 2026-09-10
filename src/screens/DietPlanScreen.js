import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Modal, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { dietPlanService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import GuestGateBanner from '../components/GuestGateBanner';
import PremiumGate from '../components/PremiumGate';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import MealCard, { SectionTitle } from '../components/dietPlan/MealCard';
import MealFoodPickerSection from '../components/dietPlan/MealFoodPickerSection';
import DietPlanHistorySheet from '../components/dietPlan/DietPlanHistorySheet';
import DatePickerSheet from '../components/dietPlan/DatePickerSheet';
import { MEAL_FIELDS, EMPTY_FORM } from '../constants/dietPlanFields';
import { toDateStr, sumAllMealKcal } from '../utils/dietPlanUtils';

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
    } catch {
      showToast('Planlar yüklenemedi.', 'error');
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

  const isToday =
    toDateStr(selectedDate) === toDateStr(new Date());

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
    } catch {
      showToast('Plan yüklenirken hata oluştu.', 'error');
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

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const onDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const dateLabel = isToday
    ? 'Bugün'
    : selectedDate.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', weekday: 'long',
      });

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
    <PremiumGate
      icon="restaurant"
      title="Diyet Planı Premium'a Özel"
      description="Günlük öğün planlaması ve yapay zeka beslenme analizine erişmek için premium üyelik gereklidir."
    >
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
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {user && (
              <TouchableOpacity
                style={styles.deleteHeaderBtn}
                onPress={openHistory}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            )}
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
        </View>

        <Text style={styles.headerTitle}>Diyet Planlarım</Text>
        <Text style={styles.headerSub}>Günlük öğünlerini planla ve takip et.</Text>

        {/* Tarih seçici */}
        <View style={styles.datePicker}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <Text style={styles.dateLabelHint}>tarihe dokunarak değiştir</Text>
          </TouchableOpacity>
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

        <View style={styles.legalBanner} accessibilityRole="text">
          <View style={styles.legalBannerIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.legalBannerTitle}>Önemli bilgilendirme</Text>
            <Text style={styles.legalBannerText}>
              Bu ekran kişisel kayıt ve genel bilgilendirme amaçlıdır; tıbbi teşhis, tedavi veya uzman beslenme
              planı değildir ve bunların yerine geçmez. Kalori ve besin değerleri yaklaşıktır. Özel sağlık
              durumlarınız için hekim veya diyetisyene danışın. Acil durumlarda yerel acil hattınızı arayın (ör. 112).
            </Text>
          </View>
        </View>

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
            footerDisclaimer="Yapay zekâ metni genel bilgilendirme amaçlıdır; tıbbi teşhis, tedavi veya kişisel beslenme planı yerine geçmez. Özel durumlar için hekim veya diyetisyeninize danışın."
            style={{ marginHorizontal: SIZES.containerPadding }}
          />
        )}

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
              <Text style={styles.modalLegalHint}>
                Eklediğiniz besin satırlarındaki kalori tahminleri veritabanı veya yapay zekâya dayanır; kişisel
                tıbbi öneri oluşturmaz. Şüphede uzmana danışın.
              </Text>

              {/* Ana öğünler */}
              <Text style={styles.modalGroupTitle}>Ana Öğünler</Text>
              {MEAL_FIELDS.filter((f) => f.group === 'main').map((f) => (
                <MealFoodPickerSection
                  key={f.key}
                  field={f}
                  formValue={form[f.key]}
                  onAppend={(line) => {
                    setForm((prev) => {
                      const cur = (prev[f.key] || '').trim();
                      return { ...prev, [f.key]: cur ? `${cur}\n${line}` : line };
                    });
                    setTotalCaloriesManual(false);
                  }}
                  onRemoveLine={(idx) => removeFoodLine(f.key, idx)}
                  showToast={showToast}
                />
              ))}

              {/* Ara öğünler */}
              <Text style={styles.modalGroupTitle}>Ara Öğünler</Text>
              {MEAL_FIELDS.filter((f) => f.group === 'snack').map((f) => (
                <MealFoodPickerSection
                  key={f.key}
                  field={f}
                  formValue={form[f.key]}
                  onAppend={(line) => {
                    setForm((prev) => {
                      const cur = (prev[f.key] || '').trim();
                      return { ...prev, [f.key]: cur ? `${cur}\n${line}` : line };
                    });
                    setTotalCaloriesManual(false);
                  }}
                  onRemoveLine={(idx) => removeFoodLine(f.key, idx)}
                  showToast={showToast}
                />
              ))}

              {/* Ek bilgiler */}
              <Text style={styles.modalGroupTitle}>Ek Bilgiler</Text>

              {computedMealKcalTotal > 0 && (
                <Text style={styles.kcalHint}>
                  Besin satırlarından toplam:{' '}
                  <Text style={styles.kcalHintBold}>{computedMealKcalTotal} kcal</Text>
                  {totalCaloriesManual ? ' (manuel toplam kullanılıyor)' : ''}
                </Text>
              )}
              <View style={styles.extraRow}>
                <View style={[styles.extraIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="flame" size={16} color="#F59E0B" />
                </View>
                <TextInput
                  style={styles.extraInput}
                  value={form.total_calories}
                  onChangeText={(t) => updateField('total_calories', t)}
                  placeholder={
                    totalCaloriesManual
                      ? 'Toplam kalori (manuel)'
                      : 'Otomatik veya elle düzenlemek için dokunun'
                  }
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numeric"
                />
                <Text style={styles.extraUnit}>kcal</Text>
              </View>
              {totalCaloriesManual && (
                <TouchableOpacity
                  style={styles.autoKcalBtn}
                  onPress={() => {
                    setTotalCaloriesManual(false);
                    const next = computedMealKcalTotal > 0 ? String(computedMealKcalTotal) : '';
                    setForm((f) => ({ ...f, total_calories: next }));
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.autoKcalBtnText}>
                    Satırlardan otomatik toplama dön
                  </Text>
                </TouchableOpacity>
              )}

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

      {/* ── GEÇMİŞ PLANLAR SHEET ──────────────────────────── */}
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

      {/* ── TARİH SEÇİCİ MODAL ─────────────────────────────── */}
      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={selectedDate}
        onChange={onDatePickerChange}
      />

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
    </PremiumGate>
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
  dateLabel: { textAlign: 'center', fontSize: SIZES.body, fontWeight: '700', color: '#fff' },
  dateLabelHint: { textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

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

  legalBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    marginHorizontal: SIZES.containerPadding,
    marginBottom: SIZES.md,
    padding: SIZES.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  legalBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalBannerTitle: {
    fontSize: SIZES.small,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  legalBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

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
  modalHint: { fontSize: SIZES.small, color: COLORS.textSecondary, marginBottom: SIZES.sm },
  modalLegalHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: SIZES.md,
    fontStyle: 'italic',
  },
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
    flexDirection: 'row', alignItems: 'stretch', gap: SIZES.sm,
    paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.md, paddingBottom: SIZES.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: SIZES.radiusMedium,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: { flex: 2, height: 50, borderRadius: SIZES.radiusMedium, overflow: 'hidden' },
  saveBtnGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.sm,
  },
  saveBtnText: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },

  kcalHint: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
    lineHeight: 20,
  },
  kcalHintBold: { fontWeight: '800', color: COLORS.text },
  autoKcalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: SIZES.md,
    paddingVertical: 6,
  },
  autoKcalBtnText: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primary },
});

