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
import { View, Text, StyleSheet, Pressable, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useResponsive } from '../hooks/useResponsive';
import { foodLogService } from '../services/supabase';
import GuestGateBanner from '../components/GuestGateBanner';
import MedicalInfoBanner from '../components/MedicalInfoBanner';
import MealSection from '../components/foodLog/MealSection';
import FoodSearchModal from '../components/foodLog/FoodSearchModal';
import { MacroPill } from '../components/foodLog/MacroWidgets';
import { ScreenContainer, ConfirmModal, DatePickerSheet, DateStepper } from '../components/ui';
import { MEAL_TYPES, DAILY_GOAL_KCAL, DAILY_GOAL, MACRO_COLORS } from '../constants/foodLogFields';
import { toLocalDate } from '../utils/foodLogUtils';

export default function FoodLogScreen({ navigation }) {
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const { topPad } = useResponsive();

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
      handleError(e, { context: 'foodLog.load', onRetry: loadLogs });
    } finally {
      setLoadingLogs(false);
    }
  }, [user, dateStr]);

  // Stack ekranı olduğu için her açılışta mount olur — useEffect yeterli
  useEffect(() => { loadLogs(); }, [loadLogs]);

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
    } catch (e) {
      handleError(e, { context: 'foodLog.delete' });
    }
  };

  // Öğün bazında logları grupla
  const grouped = MEAL_TYPES.reduce((acc, m) => {
    acc[m.key] = logs.filter((l) => l.meal_type === m.key);
    return acc;
  }, {});

  const caloriePct = Math.min(1, summary.calories / DAILY_GOAL_KCAL);
  // Yeşil zemin üstünde: normal beyaz, hedefe yaklaşınca amber, aşınca coral (yeşil üstüne yeşil görünmüyordu)
  const calorieColor = caloriePct > 0.95 ? COLORS.accents.coral : caloriePct > 0.7 ? COLORS.accents.amber : COLORS.white;

  const header = (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: topPad - SIZES.xs }]}
    >
      <View style={styles.headerTop}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Geri"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </Pressable>
        <View style={styles.badge}>
          <Ionicons name="nutrition-outline" size={13} color={COLORS.white} />
          <Text style={styles.badgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>Besin Takibi</Text>
        </View>
      </View>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>Besin Günlüğüm</Text>
      <Text style={styles.sub} maxFontSizeMultiplier={MAX_FONT_SCALE}>Yediklerini takip et, hedefine ulaş.</Text>

      <DateStepper date={selectedDate} onChange={setSelectedDate} onOpenPicker={() => setShowDatePicker(true)} style={styles.stepper} />

      <View style={styles.calorieCard} accessibilityLabel={`Günlük kalori ${Math.round(summary.calories)} / ${DAILY_GOAL_KCAL}`}>
        <View style={styles.calorieRow}>
          <View>
            <Text style={styles.calorieLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>Günlük Kalori</Text>
            <View style={styles.calorieValueRow}>
              <Text style={styles.calorieValue} maxFontSizeMultiplier={MAX_FONT_SCALE}>{Math.round(summary.calories)}</Text>
              <Text style={styles.calorieGoal} maxFontSizeMultiplier={MAX_FONT_SCALE}> / {DAILY_GOAL_KCAL} kcal</Text>
            </View>
          </View>
          <View style={styles.remain}>
            <Text style={styles.remainNum} maxFontSizeMultiplier={MAX_FONT_SCALE}>{Math.max(0, DAILY_GOAL_KCAL - Math.round(summary.calories))}</Text>
            <Text style={styles.remainLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>kalan</Text>
          </View>
        </View>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { backgroundColor: calorieColor, width: calorieAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
        <View style={styles.macros}>
          <MacroPill label="Protein" value={summary.protein} goal={DAILY_GOAL.protein} color={MACRO_COLORS.protein} unit="g" />
          <MacroPill label="Karb" value={summary.carbs} goal={DAILY_GOAL.carbs} color={MACRO_COLORS.carbs} unit="g" />
          <MacroPill label="Yağ" value={summary.fat} goal={DAILY_GOAL.fat} color={MACRO_COLORS.fat} unit="g" />
          <MacroPill label="Lif" value={summary.fiber} goal={DAILY_GOAL.fiber} color={MACRO_COLORS.fiber} unit="g" />
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <>
      <ScreenContainer edges={[]} header={header} scrollProps={{ style: styles.scroll }}>
        {!user && isGuest ? (
          <GuestGateBanner navigation={navigation} message="Besin günlüğü hesabınıza bağlıdır. Giriş yaparak kullanabilirsiniz." />
        ) : null}

        {user ? (
          <MedicalInfoBanner title="Besin verileri hakkında">
            Veritabanı ve yapay zeka ile üretilen değerler yaklaşıktır; tıbbi teşhis, klinik beslenme veya
            tedavi planı yerine geçmez. Özel durumlarınız için hekim veya diyetisyene danışın.
          </MedicalInfoBanner>
        ) : null}

        {MEAL_TYPES.map((meal) => (
          <MealSection
            key={meal.key}
            meal={meal}
            logs={grouped[meal.key] || []}
            loading={loadingLogs}
            onAdd={() => (user ? openModal(meal.key) : showToast('Besin eklemek için giriş yapın.', 'info'))}
            onDelete={(id) => setDeleteId(id)}
          />
        ))}
      </ScreenContainer>

      <FoodSearchModal
        visible={modalVisible}
        initialMealType={activeMealType}
        dateStr={dateStr}
        onClose={() => setModalVisible(false)}
        onSaved={loadLogs}
      />

      <DatePickerSheet
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        value={selectedDate}
        onChange={onDatePickerChange}
      />

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
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SIZES.lg, paddingHorizontal: SIZES.containerPadding },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, marginBottom: SIZES.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: whiteAlpha(0.18), justifyContent: 'center', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: whiteAlpha(0.18), borderRadius: SIZES.radiusFull, paddingVertical: 5, paddingHorizontal: 10 },
  badgeText: { fontSize: SIZES.tiny, color: COLORS.white, fontWeight: '600' },
  title: { fontSize: SIZES.h2, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  sub: { fontSize: SIZES.small, color: whiteAlpha(0.85), marginTop: 3, marginBottom: SIZES.md },
  stepper: { marginBottom: SIZES.md },
  calorieCard: { backgroundColor: whiteAlpha(0.16), borderRadius: SIZES.radiusLarge, padding: SIZES.md, borderWidth: 1, borderColor: whiteAlpha(0.25) },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  calorieLabel: { fontSize: SIZES.small, color: whiteAlpha(0.8), marginBottom: 2 },
  calorieValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  calorieValue: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  calorieGoal: { fontSize: SIZES.small, color: whiteAlpha(0.7) },
  remain: { alignItems: 'center' },
  remainNum: { fontSize: SIZES.h3, fontWeight: '800', color: COLORS.white },
  remainLabel: { fontSize: SIZES.tiny, color: whiteAlpha(0.7) },
  track: { height: 6, borderRadius: 3, backgroundColor: whiteAlpha(0.2), marginBottom: SIZES.md, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  macros: { flexDirection: 'row', gap: SIZES.xs },
});
