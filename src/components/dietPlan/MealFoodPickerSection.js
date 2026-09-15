import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import {
  searchOpenFoodFacts,
  getFoodNutritionAI,
  calcNutritionForGrams,
} from '../../services/nutritionService';
import { hasReachedDailyLimit, incrementDailyUsage } from '../../services/dailyUsageService';
import { FREE_AI_SEARCH_DAILY_LIMIT, AI_SEARCH_USAGE_KEY } from '../../services/subscriptionService';
import { useSubscription } from '../../contexts/SubscriptionContext';

/** Besin günlüğü ile aynı kaynak: OFF/USDA araması + AI + gram/ml → satıra yazılır (kendi state'i var) */
export default function MealFoodPickerSection({ field, formValue, onAppend, onRemoveLine, showToast }) {
  const { isSubscribed, openPaywall } = useSubscription();
  const [pickQuery, setPickQuery] = React.useState('');
  const [pickResults, setPickResults] = React.useState([]);
  const [pickSearching, setPickSearching] = React.useState(false);
  const [pickFood, setPickFood] = React.useState(null);
  const [pickGrams, setPickGrams] = React.useState('100');
  const [pickAiLoading, setPickAiLoading] = React.useState(false);

  const foodLines = React.useMemo(() => {
    if (!formValue?.trim()) return [];
    return formValue.split('\n').filter((l) => l.trim());
  }, [formValue]);

  const handleSearch = React.useCallback(async (text) => {
    setPickQuery(text);
    setPickFood(null);
    if (text.trim().length < 2) { setPickResults([]); return; }
    setPickSearching(true);
    try {
      const results = await searchOpenFoodFacts(text.trim());
      setPickResults(results.slice(0, 12));
    } catch {
      setPickResults([]);
    } finally {
      setPickSearching(false);
    }
  }, []);

  const handleAISearch = async () => {
    if (!pickQuery.trim()) { showToast('Önce bir besin adı girin.', 'warning'); return; }

    // Ücretsiz kullanıcılar için günlük yumuşak limit (FoodSearchModal.js ile aynı kaynak/limit).
    if (!isSubscribed) {
      const reached = await hasReachedDailyLimit(AI_SEARCH_USAGE_KEY, FREE_AI_SEARCH_DAILY_LIMIT);
      if (reached) {
        showToast(`Günlük ücretsiz AI analiz hakkınızı kullandınız (${FREE_AI_SEARCH_DAILY_LIMIT}/gün). Sınırsız analiz için Premium'a geçin.`, 'warning');
        openPaywall();
        return;
      }
    }

    setPickAiLoading(true);
    setPickFood(null);
    try {
      const food = await getFoodNutritionAI(pickQuery.trim(), false);
      if (!isSubscribed) await incrementDailyUsage(AI_SEARCH_USAGE_KEY);
      setPickFood(food);
      setPickResults([]);
    } catch (e) {
      showToast(e.message || 'AI analizi başarısız.', 'error');
    } finally {
      setPickAiLoading(false);
    }
  };

  const handleAppend = () => {
    if (!pickFood) { showToast('Önce bir besin seçin.', 'warning'); return; }
    const g = parseFloat(pickGrams);
    if (!g || g <= 0) {
      showToast(pickFood.isDrink ? 'Geçerli bir ml değeri girin.' : 'Geçerli bir gram değeri girin.', 'warning');
      return;
    }
    const calc = calcNutritionForGrams(pickFood, g);
    const unit = pickFood.isDrink ? 'ml' : 'g';
    const kcal = Math.round(calc.calories || 0);
    onAppend(`• ${pickFood.name}, ${g}${unit} — ${kcal} kcal`);
    setPickQuery('');
    setPickResults([]);
    setPickFood(null);
    setPickGrams('100');
  };

  const g = parseFloat(pickGrams) || 0;
  const preview = pickFood && g > 0
    ? Math.round(calcNutritionForGrams(pickFood, g).calories || 0)
    : null;

  return (
    <View style={mp.wrap}>
      {/* Öğün başlığı */}
      <View style={mp.mealHeader}>
        <View style={[mp.mealIconBubble, { backgroundColor: field.color + '1A' }]}>
          <Ionicons name={field.icon} size={14} color={field.color} />
        </View>
        <Text style={mp.mealLabel}>{field.label}</Text>
        {foodLines.length > 0 && (
          <View style={[mp.countBadge, { backgroundColor: field.color }]}>
            <Text style={mp.countBadgeText}>{foodLines.length}</Text>
          </View>
        )}
      </View>

      {/* Eklenen besinler (silinebilir satırlar) */}
      {foodLines.map((line, idx) => (
        <View key={idx} style={mp.foodLineRow}>
          <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
          <Text style={mp.foodLineText} numberOfLines={1}>{line.replace(/^•\s*/, '')}</Text>
          <TouchableOpacity onPress={() => onRemoveLine(idx)} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Arama paneli */}
      <View style={mp.panel}>
        <View style={mp.searchRow}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={mp.searchInput}
            placeholder="Ara: elma, yoğurt, tavuk..."
            placeholderTextColor={COLORS.textLight}
            value={pickQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={handleAISearch}
          />
        </View>
        <TouchableOpacity
          style={[mp.aiBtn, (!pickQuery.trim() || pickAiLoading) && { opacity: 0.55 }]}
          onPress={handleAISearch}
          disabled={pickAiLoading || !pickQuery.trim()}
        >
          {pickAiLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color="#fff" />
              <Text style={mp.aiBtnText}>AI ile tam analiz (Türkçe)</Text>
            </>
          )}
        </TouchableOpacity>
        {pickSearching ? (
          <View style={mp.searchingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={mp.searchingText}>Aranıyor...</Text>
          </View>
        ) : null}
        {!pickFood && pickResults.length > 0 ? (
          <ScrollView style={mp.resultsScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {pickResults.map((item, idx) => (
              <TouchableOpacity
                key={`${item.id}_${idx}`}
                style={mp.resultItem}
                onPress={() => { setPickFood(item); setPickResults([]); }}
                activeOpacity={0.72}
              >
                <View style={{ flex: 1 }}>
                  <Text style={mp.resultName} numberOfLines={2}>{item.name}</Text>
                  {item.brand ? <Text style={mp.resultBrand} numberOfLines={1}>{item.brand}</Text> : null}
                </View>
                <Text style={mp.resultKcal}>{item.calories} /100{item.isDrink ? 'ml' : 'g'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
        {pickFood ? (
          <View style={mp.selectedCard}>
            <View style={mp.selectedHeader}>
              <Text style={mp.selectedName} numberOfLines={2}>{pickFood.name}</Text>
              <TouchableOpacity onPress={() => setPickFood(null)} hitSlop={12}>
                <Ionicons name="close-circle" size={22} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <View style={mp.gramRow}>
              <Text style={mp.gramLabel}>{pickFood.isDrink ? 'Miktar (ml)' : 'Miktar (g)'}</Text>
              <TextInput
                style={mp.gramInput}
                value={pickGrams}
                onChangeText={setPickGrams}
                keyboardType="decimal-pad"
                placeholder={pickFood.isDrink ? '200' : '100'}
              />
            </View>
            {preview != null ? <Text style={mp.estKcal}>Tahmini: {preview} kcal</Text> : null}
            <TouchableOpacity style={mp.addBtn} onPress={handleAppend} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={mp.addBtnText}>Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const mp = StyleSheet.create({
  wrap: { marginBottom: SIZES.md },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  mealIconBubble: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  mealLabel: { flex: 1, fontSize: SIZES.small, fontWeight: '700', color: COLORS.text },
  countBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  foodLineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: '#BBF7D0',
    paddingHorizontal: SIZES.sm, paddingVertical: 7, marginBottom: 4,
  },
  foodLineText: { flex: 1, fontSize: 12, color: COLORS.text, fontWeight: '500' },
  panel: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: SIZES.small, color: COLORS.text },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 10,
    marginBottom: SIZES.sm,
  },
  aiBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SIZES.sm },
  searchingText: { fontSize: 12, color: COLORS.textSecondary },
  resultsScroll: { maxHeight: 160, marginBottom: SIZES.sm },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SIZES.sm,
  },
  resultName: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  resultBrand: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  resultKcal: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  selectedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, marginBottom: SIZES.sm },
  selectedName: { flex: 1, fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  gramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  gramLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  gramInput: {
    minWidth: 88,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 8,
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
    backgroundColor: COLORS.surfaceAlt,
  },
  estKcal: { fontSize: SIZES.small, fontWeight: '700', color: '#F59E0B', marginBottom: SIZES.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryDark,
    borderRadius: SIZES.radius,
    paddingVertical: 11,
  },
  addBtnText: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },
});
