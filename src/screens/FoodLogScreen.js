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
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Easing,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { foodLogService } from '../services/supabase';
import {
  searchOpenFoodFacts,
  getFoodNutritionAI,
  calcNutritionForGrams,
} from '../services/nutritionService';
import GuestGateBanner from '../components/GuestGateBanner';
import ConfirmModal from '../components/ui/ConfirmModal';

const { width } = Dimensions.get('window');
const DAILY_GOAL_KCAL = 2000;
const DAILY_GOAL = { protein: 150, carbs: 250, fat: 65, fiber: 25 };

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Kahvaltı',     icon: 'sunny-outline'          },
  { key: 'lunch',     label: 'Öğle Yemeği',  icon: 'partly-sunny-outline'   },
  { key: 'dinner',    label: 'Akşam Yemeği', icon: 'moon-outline'           },
  { key: 'snack',     label: 'Atıştırmalık', icon: 'cafe-outline'           },
  { key: 'drink',     label: 'İçecek',       icon: 'water-outline'          },
];

const toLocalDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const fmt = (n) => (n == null ? '—' : Number(n).toFixed(1));

function getSourceBadgeMeta(source) {
  switch (source) {
    case 'ai':
      return { label: '🤖 AI', style: 'ai' };
    case 'usda':
      return { label: '🇺🇸 USDA', style: 'db' };
    case 'openfoodfacts':
    default:
      return { label: '🌐 OFF', style: 'db' };
  }
}

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

  // Arama state'leri
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Seçilen yiyecek
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState('100');
  const [saving, setSaving] = useState(false);

  // Progress animasyonu
  const calorieAnim = useRef(new Animated.Value(0)).current;
  const searchRequestIdRef = useRef(0);
  const searchDebounceRef = useRef(null);
  const searchCacheRef = useRef(new Map());

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
  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

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

  // Arama (Open Food Facts)
  const handleSearch = useCallback(async (text) => {
    setQuery(text);
    setSelectedFood(null);
    const normalized = text.trim();
    const cacheKey = normalized.toLocaleLowerCase('tr-TR');

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    if (normalized.length < 2) {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setSearching(false);
      return;
    }

    if (searchCacheRef.current.has(cacheKey)) {
      setSearchResults(searchCacheRef.current.get(cacheKey));
      setSearching(false);
      return;
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      const requestId = ++searchRequestIdRef.current;
      try {
        const results = await searchOpenFoodFacts(normalized);
        if (requestId !== searchRequestIdRef.current) return; // Eski istek sonucunu yoksay
        const sliced = results.slice(0, 12);
        searchCacheRef.current.set(cacheKey, sliced);
        setSearchResults(sliced);
      } catch {
        if (requestId !== searchRequestIdRef.current) return;
        setSearchResults([]);
      } finally {
        if (requestId !== searchRequestIdRef.current) return;
        setSearching(false);
      }
    }, 450);
  }, []);

  // AI ile tam analiz
  const handleAISearch = async () => {
    if (!query.trim()) { showToast('Önce bir yiyecek adı girin.', 'warning'); return; }
    setAiLoading(true);
    setSelectedFood(null);
    try {
      // Önce Open Food Facts TR/WW veritabanını dene.
      const dbResults = await searchOpenFoodFacts(query.trim());
      if (dbResults.length > 0) {
        const trFirst = dbResults.find((item) => item.source === 'openfoodfacts') || dbResults[0];
        setSelectedFood(trFirst);
        setSearchResults(dbResults.slice(0, 12));
        showToast('Veritabanında bulundu, AI kullanılmadı.', 'success');
        return;
      }

      // Veritabanında yoksa AI fallback (Gemini -> Groq)
      const food = await getFoodNutritionAI(query.trim(), activeMealType === 'drink');
      setSelectedFood(food);
      setSearchResults([]);
    } catch (e) {
      showToast(e.message || 'AI analizi başarısız.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Sonuçtan seçim (OFF)
  const selectFood = (food) => {
    setSelectedFood(food);
    setSearchResults([]);
  };

  // Kaydet
  const handleSave = async () => {
    if (!selectedFood) { showToast('Önce bir yiyecek seçin.', 'warning'); return; }
    const g = parseFloat(grams);
    if (!g || g <= 0) { showToast(activeMealType === 'drink' ? 'Geçerli bir ml değeri girin.' : 'Geçerli bir gram değeri girin.', 'warning'); return; }

    setSaving(true);
    try {
      const calc = calcNutritionForGrams(selectedFood, g);
      await foodLogService.create({
        date: dateStr,
        meal_type: activeMealType,
        food_name: selectedFood.name,
        amount_grams: g,
        calories: calc.calories,
        protein: calc.protein,
        carbs: calc.carbs,
        fat: calc.fat,
        fiber: calc.fiber,
        sugar: calc.sugar,
        sodium: calc.sodium,
        nutrition_data: {
          per_100g: {
            calories: selectedFood.calories,
            protein: selectedFood.protein,
            carbs: selectedFood.carbs,
            fat: selectedFood.fat,
          },
          vitamins: selectedFood.vitamins || [],
          minerals: selectedFood.minerals || [],
          glycemic_index: selectedFood.glycemic_index,
          health_note: selectedFood.health_note,
          source: selectedFood.source,
        },
      });
      showToast(`${selectedFood.name} eklendi.`, 'success');
      closeModal();
      loadLogs();
    } catch (e) {
      showToast('Kaydetme başarısız.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (mealType) => {
    searchRequestIdRef.current += 1;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setActiveMealType(mealType);
    setQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setSearching(false);
    setGrams('100');
    setModalVisible(true);
  };

  const closeModal = () => {
    searchRequestIdRef.current += 1;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setModalVisible(false);
    setSelectedFood(null);
    setSearchResults([]);
    setQuery('');
    setSearching(false);
    setGrams('100');
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

  // Hesaplanan değerler (modal için)
  const calc = selectedFood && grams
    ? calcNutritionForGrams(selectedFood, parseFloat(grams) || 100)
    : null;

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
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal başlık */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <Ionicons
                  name={MEAL_TYPES.find((m) => m.key === activeMealType)?.icon || 'cafe-outline'}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.modalTitle}>
                  {MEAL_TYPES.find((m) => m.key === activeMealType)?.label} — {activeMealType === 'drink' ? 'İçecek Ekle' : 'Yiyecek Ekle'}
                </Text>
              </View>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Arama kutusu */}
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Yiyecek ara... (ör: elma, tavuk, pilav)"
                  placeholderTextColor={COLORS.textLight}
                  value={query}
                  onChangeText={handleSearch}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={handleAISearch}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => {
                    searchRequestIdRef.current += 1;
                    if (searchDebounceRef.current) {
                      clearTimeout(searchDebounceRef.current);
                      searchDebounceRef.current = null;
                    }
                    setQuery('');
                    setSearchResults([]);
                    setSelectedFood(null);
                    setSearching(false);
                  }}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                )}
              </View>

              {/* AI analiz butonu */}
              <TouchableOpacity
                style={styles.aiBtn}
                onPress={handleAISearch}
                disabled={aiLoading || !query.trim()}
                activeOpacity={0.8}
              >
                {aiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.aiBtnText}>
                      "{query || '...'}" için AI ile tam analiz yap
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Arama durumu */}
              {searching && (
                <View style={styles.searchingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.searchingText}>Aranıyor...</Text>
                </View>
              )}

              {/* Open Food Facts sonuçları */}
              {!selectedFood && searchResults.length > 0 && (
                <View>
                  <Text style={styles.resultsHeader}>
                    Ürün Veritabanı ({searchResults.length} sonuç)
                  </Text>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.id}_${idx}`}
                      style={styles.resultItem}
                      onPress={() => selectFood(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultLeft}>
                        <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                        {item.brand ? (
                          <Text style={styles.resultBrand} numberOfLines={1}>{item.brand}</Text>
                        ) : null}
                      </View>
                      <View style={styles.resultRight}>
                        <Text style={styles.resultKcal}>{item.calories}</Text>
                        <Text style={styles.resultKcalUnit}>{activeMealType === 'drink' ? 'kcal/100ml' : 'kcal/100g'}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Seçilen yiyecek detay kartı */}
              {selectedFood && (
                <View style={styles.foodDetailCard}>
                  {/* İsim ve kaynak */}
                  <View style={styles.foodDetailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodDetailName}>{selectedFood.name}</Text>
                      {selectedFood.brand && (
                        <Text style={styles.foodDetailBrand}>{selectedFood.brand}</Text>
                      )}
                      {selectedFood.category && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{selectedFood.category}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.sourceBadge,
                      getSourceBadgeMeta(selectedFood.source).style === 'ai' ? styles.sourceBadgeAI : styles.sourceBadgeDB]}>
                      <Text style={styles.sourceBadgeText}>
                        {getSourceBadgeMeta(selectedFood.source).label}
                      </Text>
                    </View>
                  </View>

                  {/* Ana makro - 100g/100ml başına */}
                  <Text style={styles.per100Label}>{activeMealType === 'drink' ? '100 ml başına' : '100 gram başına'}</Text>
                  <View style={styles.macroGrid}>
                    <MacroGridCell label="Kalori" value={selectedFood.calories} unit="kcal" color={COLORS.primary} />
                    <MacroGridCell label="Protein" value={selectedFood.protein} unit="g" color="#16A34A" />
                    <MacroGridCell label="Karbonhidrat" value={selectedFood.carbs} unit="g" color="#D97706" />
                    <MacroGridCell label="Yağ" value={selectedFood.fat} unit="g" color="#DC2626" />
                    {selectedFood.fiber != null && (
                      <MacroGridCell label="Lif" value={selectedFood.fiber} unit="g" color="#0F766E" />
                    )}
                    {selectedFood.sugar != null && (
                      <MacroGridCell label="Şeker" value={selectedFood.sugar} unit="g" color="#7C3AED" />
                    )}
                    {selectedFood.sodium != null && (
                      <MacroGridCell label="Sodyum" value={selectedFood.sodium} unit="mg" color="#9CA3AF" />
                    )}
                    {selectedFood.glycemic_index != null && (
                      <MacroGridCell label="Glisemik İndeks" value={selectedFood.glycemic_index} unit="" color="#6366F1" />
                    )}
                  </View>

                  {/* Vitaminler */}
                  {selectedFood.vitamins?.length > 0 && (
                    <View style={styles.microSection}>
                      <Text style={styles.microTitle}>
                        <Ionicons name="leaf-outline" size={14} color={COLORS.primary} /> Vitaminler
                      </Text>
                      <View style={styles.microGrid}>
                        {selectedFood.vitamins.map((v, i) => (
                          <View key={i} style={styles.microChip}>
                            <Text style={styles.microChipName}>{v.name}</Text>
                            <Text style={styles.microChipVal}>{v.amount}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Mineraller */}
                  {selectedFood.minerals?.length > 0 && (
                    <View style={styles.microSection}>
                      <Text style={styles.microTitle}>
                        <Ionicons name="diamond-outline" size={14} color={COLORS.primary} /> Mineraller
                      </Text>
                      <View style={styles.microGrid}>
                        {selectedFood.minerals.map((m, i) => (
                          <View key={i} style={[styles.microChip, styles.microChipMineral]}>
                            <Text style={styles.microChipName}>{m.name}</Text>
                            <Text style={styles.microChipVal}>{m.amount}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Sağlık notu */}
                  {selectedFood.health_note && (
                    <View style={styles.healthNoteBox}>
                      <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.healthNoteText}>{selectedFood.health_note}</Text>
                    </View>
                  )}

                  {/* Tipik porsiyon */}
                  {selectedFood.typical_portion && (
                    <Text style={styles.typicalPortion}>
                      Tipik porsiyon: {selectedFood.typical_portion}
                    </Text>
                  )}

                  {/* ─── Gram ve öğün seçimi ─── */}
                  <View style={styles.addSection}>
                    <Text style={styles.addSectionTitle}>Eklenecek Miktar</Text>

                    {/* Hızlı seçim */}
                    <View style={styles.quickGramRow}>
                      {(activeMealType === 'drink'
                        ? ['100', '200', '250', '330', '500']
                        : ['50', '100', '150', '200', '250']
                      ).map((g) => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.quickGramBtn, grams === g && styles.quickGramBtnActive]}
                          onPress={() => setGrams(g)}
                        >
                          <Text style={[styles.quickGramText, grams === g && styles.quickGramTextActive]}>
                            {activeMealType === 'drink' ? `${g}ml` : `${g}g`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Manuel giriş */}
                    <View style={styles.gramInputRow}>
                      <View style={styles.gramInputWrap}>
                        <TextInput
                          style={styles.gramInput}
                          value={grams}
                          onChangeText={setGrams}
                          keyboardType="numeric"
                          placeholder={activeMealType === 'drink' ? 'ml' : 'gram'}
                          placeholderTextColor={COLORS.textLight}
                        />
                        <Text style={styles.gramUnit}>{activeMealType === 'drink' ? 'ml' : 'gram'}</Text>
                      </View>
                    </View>

                    {/* Hesaplanan değerler */}
                    {calc && (
                      <View style={styles.calcBox}>
                        <Text style={styles.calcTitle}>{grams}{activeMealType === 'drink' ? 'ml' : 'g'} için hesaplanan değerler:</Text>
                        <View style={styles.calcRow}>
                          <CalcChip label="Kalori" value={`${calc.calories} kcal`} accent />
                          <CalcChip label="Protein" value={`${calc.protein}g`} />
                          <CalcChip label="Karb" value={`${calc.carbs}g`} />
                          <CalcChip label="Yağ" value={`${calc.fat}g`} />
                        </View>
                      </View>
                    )}

                    {/* Öğün seçimi */}
                    <Text style={styles.addSectionTitle}>Öğün</Text>
                    <View style={styles.mealTypeRow}>
                      {MEAL_TYPES.map((m) => (
                        <TouchableOpacity
                          key={m.key}
                          style={[
                            styles.mealTypeBtn,
                            activeMealType === m.key && styles.mealTypeBtnActive,
                          ]}
                          onPress={() => setActiveMealType(m.key)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={m.icon}
                            size={16}
                            color={activeMealType === m.key ? '#fff' : COLORS.textSecondary}
                          />
                          <Text style={[
                            styles.mealTypeBtnText,
                            activeMealType === m.key && styles.mealTypeBtnTextActive,
                          ]}>
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Kaydet */}
                    <TouchableOpacity
                      style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                      onPress={handleSave}
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveBtnGrad}
                      >
                        {saving ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="add-circle" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Günlüğe Ekle</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Boş state */}
              {!searching && !aiLoading && !selectedFood && searchResults.length === 0 && query.length >= 2 && (
                <View style={styles.emptySearch}>
                  <Ionicons name="search-outline" size={40} color={COLORS.textLight} />
                  <Text style={styles.emptySearchText}>
                    "{query}" için veritabanında sonuç yok.{'\n'}
                    AI ile tam analiz yapmayı deneyin.
                  </Text>
                </View>
              )}

              {query.length === 0 && !selectedFood && (
                <View style={styles.searchHint}>
                  <Ionicons name="bulb-outline" size={18} color={COLORS.textLight} />
                  <Text style={styles.searchHintText}>
                    Yiyecek adı yazın, Open Food Facts'ten anında sonuç alın.{'\n'}
                    Türkçe veya karmaşık yemekler için "AI ile tam analiz yap" butonunu kullanın.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* İptal butonu */}
            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
              <Text style={styles.cancelBtnText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.dpOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={styles.dpSheet}>
            <View style={styles.dpHandle} />
            <View style={styles.dpHeader}>
              <Text style={styles.dpTitle}>Tarih Seç</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.dpCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={onDatePickerChange}
              locale="tr-TR"
              style={{ width: '100%' }}
            />
            <TouchableOpacity
              style={styles.dpDoneBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.dpDoneGradient}
              >
                <Text style={styles.dpDoneText}>Tamam</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

// ─── Alt bileşenler ───────────────────────────────────────────────────────────

function MacroPill({ label, value, goal, color, unit }) {
  const pct = Math.min(1, (value || 0) / goal);
  return (
    <View style={pill.wrap}>
      <Text style={pill.label}>{label}</Text>
      <Text style={[pill.value, { color }]}>{Math.round(value || 0)}{unit}</Text>
      <View style={pill.track}>
        <View style={[pill.fill, { backgroundColor: color, width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  value: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  track: { width: '100%', height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  fill: { height: 3, borderRadius: 2 },
});

function MealSection({ meal, logs, loading, onAdd, onDelete }) {
  const total = logs.reduce((s, l) => s + (l.calories || 0), 0);
  return (
    <View style={mealSec.wrap}>
      <View style={mealSec.header}>
        <View style={mealSec.titleRow}>
          <View style={mealSec.iconBubble}>
            <Ionicons name={meal.icon} size={18} color={COLORS.primary} />
          </View>
          <Text style={mealSec.title}>{meal.label}</Text>
        </View>
        <View style={mealSec.headerRight}>
          {total > 0 && <Text style={mealSec.totalKcal}>{Math.round(total)} kcal</Text>}
          <TouchableOpacity style={mealSec.addBtn} onPress={onAdd} activeOpacity={0.75}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && logs.length === 0 && (
        <View style={mealSec.skeleton} />
      )}

      {logs.map((log) => (
        <TouchableOpacity
          key={log.id}
          style={mealSec.logItem}
          onLongPress={() => onDelete(log.id)}
          activeOpacity={0.75}
          delayLongPress={400}
        >
          <View style={mealSec.logLeft}>
            <Text style={mealSec.logName} numberOfLines={1}>{log.food_name}</Text>
            <Text style={mealSec.logSub}>{log.amount_grams}{log.meal_type === 'drink' ? 'ml' : 'g'}</Text>
          </View>
          <View style={mealSec.logRight}>
            <Text style={mealSec.logKcal}>{Math.round(log.calories || 0)}</Text>
            <Text style={mealSec.logKcalUnit}>kcal</Text>
          </View>
          <TouchableOpacity
            style={mealSec.deleteBtn}
            onPress={() => onDelete(log.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.textLight} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {logs.length === 0 && !loading && (
        <TouchableOpacity style={mealSec.empty} onPress={onAdd} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={16} color={COLORS.textLight} />
          <Text style={mealSec.emptyText}>Yiyecek ekle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const mealSec = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    marginHorizontal: SIZES.containerPadding,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  iconBubble: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  totalKcal: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.primary },
  addBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '60',
  },
  skeleton: {
    height: 42, backgroundColor: COLORS.shimmer,
    borderRadius: 8, margin: SIZES.md,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  logLeft: { flex: 1 },
  logName: { fontSize: SIZES.bodySmall, fontWeight: '600', color: COLORS.text },
  logSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 1 },
  logRight: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginRight: SIZES.sm },
  logKcal: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  logKcalUnit: { fontSize: SIZES.tiny, color: COLORS.textSecondary },
  deleteBtn: { padding: 4 },
  empty: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    padding: SIZES.md, opacity: 0.6,
  },
  emptyText: { fontSize: SIZES.small, color: COLORS.textLight },
});

function MacroGridCell({ label, value, unit, color }) {
  return (
    <View style={mgc.cell}>
      <Text style={[mgc.value, { color }]}>{fmt(value)}</Text>
      <Text style={mgc.unit}>{unit}</Text>
      <Text style={mgc.label}>{label}</Text>
    </View>
  );
}
const mgc = StyleSheet.create({
  cell: {
    width: (width - SIZES.containerPadding * 2 - SIZES.md * 3) / 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm,
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  value: { fontSize: SIZES.h4, fontWeight: '800' },
  unit: { fontSize: 9, color: COLORS.textSecondary, marginTop: 1 },
  label: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
});

function CalcChip({ label, value, accent }) {
  return (
    <View style={[cc.wrap, accent && cc.accentWrap]}>
      <Text style={[cc.val, accent && cc.accentVal]}>{value}</Text>
      <Text style={[cc.label, accent && cc.accentLabel]}>{label}</Text>
    </View>
  );
}
const cc = StyleSheet.create({
  wrap: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall, paddingVertical: SIZES.sm, marginHorizontal: 2,
  },
  accentWrap: { backgroundColor: COLORS.primary + '18' },
  val: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text },
  accentVal: { color: COLORS.primary },
  label: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2 },
  accentLabel: { color: COLORS.primaryDark },
});

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
  // Tarih seçici modal
  dpOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  dpSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  dpHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  dpHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.containerPadding, paddingVertical: SIZES.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dpTitle: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  dpCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  dpDoneBtn: {
    marginHorizontal: SIZES.containerPadding, marginTop: SIZES.sm,
    borderRadius: SIZES.radiusMedium, overflow: 'hidden',
  },
  dpDoneGradient: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  dpDoneText: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },

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

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: '92%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalHeader: { paddingHorizontal: SIZES.containerPadding, paddingTop: 12, paddingBottom: SIZES.sm },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SIZES.md,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  modalTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  modalScrollContent: { paddingHorizontal: SIZES.containerPadding, paddingBottom: SIZES.xl },

  // Arama
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: SIZES.sm, marginBottom: SIZES.sm, height: 48,
  },
  searchIcon: { marginRight: SIZES.xs },
  searchInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text, height: 48 },

  // AI butonu
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.sm, backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMedium, paddingVertical: 11,
    marginBottom: SIZES.md,
  },
  aiBtnText: { fontSize: SIZES.bodySmall, fontWeight: '700', color: '#fff' },

  // Arama yükleniyor
  searchingRow: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingVertical: SIZES.sm,
  },
  searchingText: { fontSize: SIZES.small, color: COLORS.textSecondary },

  // Sonuç listesi
  resultsHeader: {
    fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: SIZES.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall, marginBottom: SIZES.xs,
  },
  resultLeft: { flex: 1 },
  resultName: { fontSize: SIZES.bodySmall, fontWeight: '600', color: COLORS.text },
  resultBrand: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: 1 },
  resultRight: { alignItems: 'flex-end' },
  resultKcal: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.primary },
  resultKcalUnit: { fontSize: SIZES.tiny, color: COLORS.textSecondary },

  // Food detail
  foodDetailCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  foodDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.sm },
  foodDetailName: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  foodDetailBrand: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  categoryBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.primary + '18',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4,
  },
  categoryBadgeText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.primaryDark },
  sourceBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
  },
  sourceBadgeAI: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: COLORS.primary + '40' },
  sourceBadgeDB: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#93C5FD' },
  sourceBadgeText: { fontSize: SIZES.tiny, fontWeight: '700' },
  per100Label: {
    fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: SIZES.sm, marginTop: SIZES.xs,
  },
  macroGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: SIZES.sm, marginBottom: SIZES.sm,
  },

  // Vitaminler / mineraller
  microSection: { marginBottom: SIZES.sm },
  microTitle: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.xs },
  microGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  microChip: {
    backgroundColor: '#F0FDF4', borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.sm, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.border,
  },
  microChipMineral: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  microChipName: { fontSize: 10, color: COLORS.text, fontWeight: '600' },
  microChipVal: { fontSize: 10, color: COLORS.textSecondary },

  healthNoteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.xs,
    backgroundColor: COLORS.accent, borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm, marginBottom: SIZES.sm,
  },
  healthNoteText: { flex: 1, fontSize: SIZES.small, color: COLORS.text, lineHeight: 18 },
  typicalPortion: {
    fontSize: SIZES.small, color: COLORS.textSecondary,
    marginBottom: SIZES.md, fontStyle: 'italic',
  },

  // Gram + ekle bölümü
  addSection: {
    borderTopWidth: 1, borderTopColor: COLORS.divider,
    marginTop: SIZES.md, paddingTop: SIZES.md,
  },
  addSectionTitle: {
    fontSize: SIZES.bodySmall, fontWeight: '700', color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  quickGramRow: { flexDirection: 'row', gap: SIZES.xs, marginBottom: SIZES.sm },
  quickGramBtn: {
    paddingHorizontal: SIZES.sm, paddingVertical: 7,
    borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  quickGramBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickGramText: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary },
  quickGramTextActive: { color: '#fff' },
  gramInputRow: { marginBottom: SIZES.sm },
  gramInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: SIZES.radiusSmall, paddingHorizontal: SIZES.sm, height: 44,
    backgroundColor: COLORS.surface,
  },
  gramInput: { flex: 1, fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  gramUnit: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary },

  calcBox: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm, marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  calcTitle: { fontSize: SIZES.small, color: COLORS.textSecondary, marginBottom: SIZES.xs, fontWeight: '600' },
  calcRow: { flexDirection: 'row', gap: 4 },

  // Öğün seçimi
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs, marginBottom: SIZES.md },
  mealTypeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SIZES.sm, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  mealTypeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mealTypeBtnText: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  mealTypeBtnTextActive: { color: '#fff' },

  // Kaydet
  saveBtn: { borderRadius: SIZES.radiusMedium, overflow: 'hidden', ...SHADOWS.medium },
  saveBtnGrad: {
    height: 54, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: SIZES.sm,
  },
  saveBtnText: { fontSize: SIZES.h4, fontWeight: '700', color: '#fff' },

  // İptal
  cancelBtn: {
    marginHorizontal: SIZES.containerPadding,
    paddingVertical: 12, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  cancelBtnText: { fontSize: SIZES.body, fontWeight: '600', color: COLORS.textSecondary },

  // Boş state
  emptySearch: { alignItems: 'center', paddingVertical: SIZES.xl, gap: SIZES.sm },
  emptySearchText: {
    fontSize: SIZES.bodySmall, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  searchHint: {
    flexDirection: 'row', gap: SIZES.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall, padding: SIZES.md,
    marginTop: SIZES.sm,
  },
  searchHintText: {
    flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 20,
  },
});
