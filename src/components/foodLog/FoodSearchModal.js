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
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { MEAL_TYPES } from '../../constants/foodLogFields';
import { getSourceBadgeMeta } from '../../utils/foodLogUtils';
import { useToast } from '../../contexts/ToastContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { foodLogService } from '../../services/supabase';
import {
  searchOpenFoodFacts,
  getFoodNutritionAI,
  calcNutritionForGrams,
} from '../../services/nutritionService';
import { hasReachedDailyLimit, incrementDailyUsage } from '../../services/dailyUsageService';
import { MacroGridCell, CalcChip } from './MacroWidgets';

const { width } = Dimensions.get('window');
const MACRO_CELL_WIDTH = (width - SIZES.containerPadding * 2 - SIZES.md * 3) / 4;

// Ücretsiz kullanıcılar için günlük "AI ile tam analiz" hakkı — cihaz-yerel yumuşak limit.
const FREE_AI_SEARCH_DAILY_LIMIT = 3;
const AI_SEARCH_USAGE_KEY = 'food_ai_search';

/**
 * Yiyecek/içecek arama, AI tam analiz ve günlüğe ekleme sheet'i.
 * Kendi state'ini yönetir — parent sadece `visible`/`initialMealType`/`dateStr`
 * verir ve `onSaved` ile kayıttan sonra günlüğü yeniden yükler.
 */
export default function FoodSearchModal({ visible, initialMealType, dateStr, onClose, onSaved }) {
  const { showToast } = useToast();
  const { isSubscribed, openPaywall } = useSubscription();

  const [activeMealType, setActiveMealType] = useState(initialMealType || 'breakfast');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState('100');
  const [saving, setSaving] = useState(false);

  const searchRequestIdRef = useRef(0);
  const searchDebounceRef = useRef(null);
  const searchCacheRef = useRef(new Map());

  // Modal her açıldığında (yeni öğün türüyle) state'i sıfırla
  useEffect(() => {
    if (!visible) return;
    searchRequestIdRef.current += 1;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setActiveMealType(initialMealType || 'breakfast');
    setQuery('');
    setSearchResults([]);
    setSelectedFood(null);
    setSearching(false);
    setGrams('100');
  }, [visible, initialMealType]);

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  const handleClose = useCallback(() => {
    searchRequestIdRef.current += 1;
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setSelectedFood(null);
    setSearchResults([]);
    setQuery('');
    setSearching(false);
    setGrams('100');
    onClose();
  }, [onClose]);

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

      // Veritabanında yoksa AI fallback (Gemini -> Groq) — ücretsiz kullanıcılar için günlük yumuşak limit
      if (!isSubscribed) {
        const reached = await hasReachedDailyLimit(AI_SEARCH_USAGE_KEY, FREE_AI_SEARCH_DAILY_LIMIT);
        if (reached) {
          showToast(`Günlük ücretsiz AI analiz hakkınızı kullandınız (${FREE_AI_SEARCH_DAILY_LIMIT}/gün). Sınırsız analiz için Premium'a geçin.`, 'warning');
          openPaywall();
          return;
        }
      }

      const food = await getFoodNutritionAI(query.trim(), activeMealType === 'drink');
      if (!isSubscribed) await incrementDailyUsage(AI_SEARCH_USAGE_KEY);
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
      handleClose();
      onSaved?.();
    } catch (e) {
      showToast('Kaydetme başarısız.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Hesaplanan değerler (modal için)
  const calc = selectedFood && grams
    ? calcNutritionForGrams(selectedFood, parseFloat(grams) || 100)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
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
                  <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Kalori" value={selectedFood.calories} unit="kcal" color={COLORS.primary} />
                  <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Protein" value={selectedFood.protein} unit="g" color="#16A34A" />
                  <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Karbonhidrat" value={selectedFood.carbs} unit="g" color="#D97706" />
                  <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Yağ" value={selectedFood.fat} unit="g" color="#DC2626" />
                  {selectedFood.fiber != null && (
                    <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Lif" value={selectedFood.fiber} unit="g" color="#0F766E" />
                  )}
                  {selectedFood.sugar != null && (
                    <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Şeker" value={selectedFood.sugar} unit="g" color="#7C3AED" />
                  )}
                  {selectedFood.sodium != null && (
                    <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Sodyum" value={selectedFood.sodium} unit="mg" color="#9CA3AF" />
                  )}
                  {selectedFood.glycemic_index != null && (
                    <MacroGridCell cellWidth={MACRO_CELL_WIDTH} label="Glisemik İndeks" value={selectedFood.glycemic_index} unit="" color="#6366F1" />
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
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
