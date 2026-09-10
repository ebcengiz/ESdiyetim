/**
 * FoodLogScreen — Besin Günlüğü
 *
 * Diyetkolik.com benzeri kalori ve besin takip ekranı.
 * - Open Food Facts API ile anlık arama
 * - Groq AI ile Türkçe gıda tam analizi (vitaminler, mineraller, GI)
 * - Öğün bazlı günlük kayıt (Supabase food_logs)
 * - Günlük makro özeti
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SIZES } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { foodLogService } from '../services/supabase';
import GuestGateBanner from '../components/GuestGateBanner';
import MedicalInfoBanner from '../components/MedicalInfoBanner';
import ConfirmModal from '../components/ui/ConfirmModal';
import DatePickerSheet from '../components/ui/DatePickerSheet';
import MealSection from '../components/foodLog/MealSection';
import FoodSearchModal from '../components/foodLog/FoodSearchModal';
import { MacroPill } from '../components/foodLog/MacroWidgets';
import { MEAL_TYPES, DAILY_GOAL_KCAL, DAILY_GOAL } from '../constants/foodLogFields';
import { toLocalDate } from '../utils/foodLogUtils';

export default function FoodLogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [summary, setSummary] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  // Silme confirm
  const [deleteId, setDeleteId] = useState(null);

  // Arama modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState('breakfast');

  // Progress animasyonu
  const calorieAnim = useRef(new Animated.Value(0)).current;

  const dateStr = toLocalDate(selectedDate);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoadingLogs(true);
    try {
      const data = await foodLogService.getByDate(dateStr);
      setLogs(data);
      const s = data.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories || 0),
          protein: acc.protein + (l.protein || 0),
          carbs: acc.carbs + (l.carbs || 0),
          fat: acc.fat + (l.fat || 0),
          fiber: acc.fiber + (l.fiber || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      );
      setSummary(s);
      const pct = Math.min(1, s.calories / DAILY_GOAL_KCAL);
      Animated.timing(calorieAnim, {
        toValue: pct,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } catch (e) {
      showToast('Günlük kayıtlar yüklenemedi.', 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, [user, dateStr]);

  // Stack ekranı olduğu için her açılışta mount olur — useEffect yeterli
  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Tarih değiştirme
  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const isToday = toLocalDate(selectedDate) === toLocalDate(new Date());
  const dateLabel = isToday
    ? 'Bugün'
    : selectedDate.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      });

  const onDatePickerChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const openModal = (mealType) => {
    setActiveMealType(mealType);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await foodLogService.delete(id);
      showToast('Silindi.', 'success');
      loadLogs();
    } catch {
      showToast('Silme başarısız.', 'error');
    }
  };

  // Öğün bazında logları grupla
  const grouped = MEAL_TYPES.reduce((acc, m) => {
    acc[m.key] = logs.filter((l) => l.meal_type === m.key);
    return acc;
  }, {});

  const caloriePct = Math.min(1, summary.calories / DAILY_GOAL_KCAL);
  const calorieColor = caloriePct > 0.95 ? COLORS.error : caloriePct > 0.7 ? COLORS.warning : COLORS.primary;

  return (
    <View style={styles.container}>
      {/* ── HEADER ── */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 8) + 10 }]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroBadge}>
            <Ionicons name="nutrition-outline" size={13} color="#fff" />
            <Text style={styles.heroBadgeText}>Besin Takibi</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Besin Günlüğüm</Text>
        <Text style={styles.headerSub}>Yediklerini takip et, hedefine ulaş.</Text>

        {/* Tarih seçici */}
        <View style={styles.datePicker}>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateCenterTap} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <Text style={styles.dateLabelHint}>tarihe dokunarak değiştir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Kalori özeti */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieLabel}>Günlük Kalori</Text>
              <View style={styles.calorieValueRow}>
                <Text style={styles.calorieValue}>{Math.round(summary.calories)}</Text>
                <Text style={styles.calorieGoal}> / {DAILY_GOAL_KCAL} kcal</Text>
              </View>
            </View>
            <View style={styles.calorieRemain}>
              <Text style={styles.calorieRemainNum}>
                {Math.max(0, DAILY_GOAL_KCAL - Math.round(summary.calories))}
              </Text>
              <Text style={styles.calorieRemainLabel}>kalan</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: calorieColor,
                  width: calorieAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Macro pills */}
          <View style={styles.macroPills}>
            <MacroPill label="Protein" value={summary.protein} goal={DAILY_GOAL.protein} color="#4ADE80" unit="g" />
            <MacroPill label="Karb" value={summary.carbs} goal={DAILY_GOAL.carbs} color="#FBBF24" unit="g" />
            <MacroPill label="Yağ" value={summary.fat} goal={DAILY_GOAL.fat} color="#F87171" unit="g" />
            <MacroPill label="Lif" value={summary.fiber} goal={DAILY_GOAL.fiber} color="#34D399" unit="g" />
          </View>
        </View>
      </LinearGradient>

      {/* ── İÇERİK ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!user && isGuest ? (
          <GuestGateBanner
            navigation={navigation}
            message="Besin günlüğü hesabınıza bağlıdır. Giriş yaparak kullanabilirsiniz."
          />
        ) : null}

        {user ? (
          <MedicalInfoBanner title="Besin verileri hakkında">
            Veritabanı ve yapay zeka ile üretilen değerler yaklaşıktır; tıbbi teşhis, klinik beslenme veya
            tedavi planı yerine geçmez. Özel durumlarınız için hekim veya diyetisyene danışın.
          </MedicalInfoBanner>
        ) : null}

        {/* Öğün bölümleri */}
        {MEAL_TYPES.map((meal) => (
          <MealSection
            key={meal.key}
            meal={meal}
            logs={grouped[meal.key] || []}
            loading={loadingLogs}
            onAdd={() => user ? openModal(meal.key) : showToast('Giriş yapın.', 'info')}
            onDelete={(id) => setDeleteId(id)}
          />
        ))}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── ARAMA MODAL ── */}
      <FoodSearchModal
        visible={modalVisible}
        initialMealType={activeMealType}
        dateStr={dateStr}
        onClose={() => setModalVisible(false)}
        onSaved={loadLogs}
      />

      {/* ── TARİH SEÇİCİ MODAL ── */}
      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={selectedDate}
        onChange={onDatePickerChange}
      />

      {/* Silme onayı */}
      <ConfirmModal
        visible={deleteId !== null}
        title="Kaydı Sil"
        message="Bu yiyeceği günlükten silmek istediğinizden emin misiniz?"
        confirmText="Sil"
        cancelText="İptal"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingBottom: SIZES.lg },
  headerTopRow: { paddingHorizontal: SIZES.containerPadding, marginBottom: SIZES.sm, flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10,
  },
  heroBadgeText: { fontSize: SIZES.tiny, color: '#fff', fontWeight: '600' },
  headerTitle: {
    fontSize: SIZES.h2, fontWeight: '800', color: '#fff',
    paddingHorizontal: SIZES.containerPadding, letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: SIZES.small, color: 'rgba(255,255,255,0.85)',
    paddingHorizontal: SIZES.containerPadding, marginTop: 3, marginBottom: SIZES.md,
  },

  // Tarih seçici
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.containerPadding,
    marginBottom: SIZES.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: SIZES.radiusMedium,
    paddingVertical: 10,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SIZES.md,
  },
  dateCenterTap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38 },
  dateLabel: { textAlign: 'center', fontSize: SIZES.body, fontWeight: '700', color: '#fff' },
  dateLabelHint: { textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  // Kalori kartı
  calorieCard: {
    marginHorizontal: SIZES.containerPadding,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
  },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  calorieLabel: { fontSize: SIZES.small, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  calorieValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  calorieValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  calorieGoal: { fontSize: SIZES.small, color: 'rgba(255,255,255,0.7)' },
  calorieRemain: { alignItems: 'center' },
  calorieRemainNum: { fontSize: SIZES.h3, fontWeight: '800', color: '#fff' },
  calorieRemainLabel: { fontSize: SIZES.tiny, color: 'rgba(255,255,255,0.7)' },
  progressBarTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: SIZES.md, overflow: 'hidden',
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  macroPills: { flexDirection: 'row', gap: SIZES.xs },

  // İçerik
  scroll: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingTop: SIZES.lg },
  bottomPad: { height: 100 },
});
