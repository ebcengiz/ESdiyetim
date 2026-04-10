/**
 * Nutrition Service
 *
 * Kaynak zinciri:
 *  1. Open Food Facts TR  → Türk markaları (Sütaş, Dost, Ülker…)
 *  2. Open Food Facts WW  → Uluslararası paketli ürünler
 *  3. USDA FoodData Central → İçecekler ve ABD ürünleri (API key gerektirmez)
 *  4. Groq AI               → Türkçe gıda adlarında tam besin analizi (fallback)
 */

import { callGemini, callGroq, parseJsonObjectFromLlmText } from './ai/providers';

// ─── Ortak yardımcılar ────────────────────────────────────────────────────────

function round(v) {
  if (v == null || isNaN(v)) return null;
  return Math.round(parseFloat(v) * 10) / 10;
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toKebab(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_');
}

// ─── 1 & 2: Open Food Facts (TR + World) ─────────────────────────────────────

const OFF_FIELDS =
  'product_name,product_name_tr,generic_name,brands,nutriments,serving_size,image_url,categories_tags';

async function fetchOFF(baseUrl, query) {
  try {
    const url =
      `${baseUrl}/cgi/search.pl` +
      `?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1` +
      `&fields=${OFF_FIELDS}&page_size=12&sort_by=unique_scans_n`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'ESdiyetApp/1.0 (contact@esdiyet.app)' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.products || [])
      .map(parseOFFProduct)
      .filter((p) => p !== null && p.calories != null && p.calories > 0);
  } catch {
    return [];
  }
}

function parseOFFProduct(p) {
  const n = p.nutriments || {};
  const name =
    p.product_name_tr ||
    p.generic_name ||
    p.product_name ||
    (p.brands ? p.brands.split(',')[0].trim() : null);
  if (!name) return null;

  const calories = n['energy-kcal_100g'] ?? n['energy-kcal'] ?? null;
  if (!calories) return null;

  // İçecek mi? (categories_tags içinde 'beverages' veya 'drinks' varsa)
  const cats = Array.isArray(p.categories_tags) ? p.categories_tags.join(' ') : '';
  const isDrink = /beverage|drink|juice|water|soda|cola|tea|coffee|milk|ayran|içecek/i.test(cats);

  return {
    source: 'openfoodfacts',
    id: p._id || p.id || name,
    name: capitalize(name),
    brand: p.brands ? p.brands.split(',')[0].trim() : null,
    imageUrl: p.image_url || null,
    isDrink,
    calories: round(calories),
    protein: round(n.proteins_100g),
    carbs: round(n.carbohydrates_100g),
    fat: round(n.fat_100g),
    fiber: round(n.fiber_100g),
    sugar: round(n.sugars_100g),
    sodium: round(n.sodium_100g ? n.sodium_100g * 1000 : null), // g → mg
    saturated_fat: round(n['saturated-fat_100g']),
    vitamins: [],
    minerals: [],
    glycemic_index: null,
    health_note: null,
    typical_portion: p.serving_size || null,
    category: null,
  };
}

// ─── 3: USDA FoodData Central ────────────────────────────────────────────────

async function fetchUSDA(query) {
  try {
    const url =
      `https://api.nal.usda.gov/fdc/v1/foods/search` +
      `?query=${encodeURIComponent(query)}&pageSize=10&api_key=DEMO_KEY`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'ESdiyetApp/1.0 (contact@esdiyet.app)' },
    });
    if (!res.ok) return [];
    const json = await res.json();

    return (json.foods || [])
      .map(parseUSDAFood)
      .filter((p) => p !== null && p.calories != null && p.calories > 0);
  } catch {
    return [];
  }
}

function parseUSDAFood(f) {
  if (!f.description) return null;

  const nutrients = {};
  (f.foodNutrients || []).forEach((n) => {
    nutrients[n.nutrientName] = n.value;
  });

  const calories =
    nutrients['Energy'] ??
    nutrients['Energy (Atwater General Factors)'] ??
    null;
  if (!calories) return null;

  const cats = (f.foodCategory || '').toLowerCase();
  const isDrink = /beverage|drink|juice|water|soda|coffee|tea|milk/i.test(cats);

  return {
    source: 'usda',
    id: `usda_${f.fdcId}`,
    name: capitalize(f.description.toLowerCase()),
    brand: f.brandOwner || null,
    imageUrl: null,
    isDrink,
    calories: round(calories),
    protein: round(nutrients['Protein']),
    carbs: round(nutrients['Carbohydrate, by difference']),
    fat: round(nutrients['Total lipid (fat)']),
    fiber: round(nutrients['Fiber, total dietary']),
    sugar: round(nutrients['Sugars, total including NLEA']),
    sodium: round(nutrients['Sodium, Na']),
    saturated_fat: round(nutrients['Fatty acids, total saturated']),
    vitamins: [],
    minerals: [],
    glycemic_index: null,
    health_note: null,
    typical_portion: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : null,
    category: f.foodCategory || null,
  };
}

// ─── Birleşik arama ───────────────────────────────────────────────────────────

export async function searchOpenFoodFacts(query) {
  // Tüm sağlayıcılar paralel çalışır.
  const [trResults, wwResults, usdaResults] = await Promise.all([
    fetchOFF('https://tr.openfoodfacts.org', query),
    fetchOFF('https://world.openfoodfacts.org', query),
    fetchUSDA(query),
  ]);

  // Birleştir, id'ye göre tekrarları temizle
  const seen = new Set();
  const merged = [];
  const normalizedQuery = String(query || '').toLocaleLowerCase('tr-TR').trim();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const withSourcePriority = [
    ...trResults.map((item) => ({ ...item, _sourcePriority: 0 })),
    ...wwResults.map((item) => ({ ...item, _sourcePriority: 1 })),
    ...usdaResults.map((item) => ({ ...item, _sourcePriority: 2 })),
  ];

  for (const item of withSourcePriority) {
    const key = `${item.name.toLowerCase()}_${item.brand || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // Önce TR kaynak, sonra metin eşleşme gücü (Türkçe aramalarda daha isabetli sonuçlar üstte kalsın)
  const sorted = merged.sort((a, b) => {
    const aName = String(a.name || '').toLocaleLowerCase('tr-TR');
    const bName = String(b.name || '').toLocaleLowerCase('tr-TR');
    const aTokenHits = tokens.reduce((acc, t) => acc + (aName.includes(t) ? 1 : 0), 0);
    const bTokenHits = tokens.reduce((acc, t) => acc + (bName.includes(t) ? 1 : 0), 0);

    if (a._sourcePriority !== b._sourcePriority) return a._sourcePriority - b._sourcePriority;
    if (aTokenHits !== bTokenHits) return bTokenHits - aTokenHits;
    if (aName.startsWith(normalizedQuery) !== bName.startsWith(normalizedQuery)) {
      return aName.startsWith(normalizedQuery) ? -1 : 1;
    }
    return 0;
  });

  return sorted.slice(0, 20).map(({ _sourcePriority, ...item }) => item);
}

// ─── 6: Groq AI (Türkçe gıda analizi) ───────────────────────────────────────

const NUTRITION_PROMPT = (foodName, isDrink) =>
  `Sen yaklaşık besin referansı üreten bir asistansın (tıbbi teşhis veya klinik beslenme değerlendirmesi değil; bireysel tanı koyma).
"${foodName}" için ${isDrink ? '100 mililitre (100ml)' : '100 gram'} başına tahmini besin değerlerini üret.

SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin yazma:

{
  "found": true,
  "food_name_tr": "Türkçe adı",
  "food_name_en": "English name",
  "is_drink": ${isDrink ? 'true' : 'false'},
  "category": "Meyve | Sebze | Et & Tavuk & Balık | Tahıl & Ekmek | Süt Ürünleri | İçecek | Tatlı & Atıştırmalık | Bakliyat | Yağ & Sos | Hazır Yemek | Diğer",
  "calories": 42,
  "protein": 0.0,
  "carbs": 10.6,
  "fat": 0.0,
  "fiber": 0.0,
  "sugar": 10.6,
  "sodium": 10,
  "saturated_fat": 0.0,
  "vitamins": [
    {"name": "C Vitamini", "amount": "4.6 mg"}
  ],
  "minerals": [
    {"name": "Potasyum", "amount": "107 mg"}
  ],
  "glycemic_index": 63,
  "health_note": "Yüksek şeker içeriği nedeniyle ölçülü tüketilmesi önerilir.",
  "typical_portion": "${isDrink ? '1 kutu (330ml)' : '1 orta boy (182g)'}"
}

Bilinmeyen veya anlamsız girdi için: {"found": false}
Tüm sayısal değerler ${isDrink ? '100ml' : '100g'} için geçerlidir.`;

export async function getFoodNutritionAI(foodName, isDrink = false) {
  let raw = '';
  try {
    raw = await callGemini(NUTRITION_PROMPT(foodName, isDrink));
  } catch {
    raw = await callGroq(NUTRITION_PROMPT(foodName, isDrink));
  }
  const parsed = parseJsonObjectFromLlmText(raw);

  if (!parsed.found) throw new Error(`"${foodName}" için besin değeri bulunamadı.`);

  return {
    source: 'ai',
    id: `ai_${foodName.toLowerCase().replace(/\s+/g, '_')}`,
    name: parsed.food_name_tr || capitalize(foodName),
    brand: null,
    imageUrl: null,
    isDrink: parsed.is_drink ?? isDrink,
    category: parsed.category || null,
    calories: round(parsed.calories),
    protein: round(parsed.protein),
    carbs: round(parsed.carbs),
    fat: round(parsed.fat),
    fiber: round(parsed.fiber),
    sugar: round(parsed.sugar),
    sodium: round(parsed.sodium),
    saturated_fat: round(parsed.saturated_fat),
    vitamins: Array.isArray(parsed.vitamins) ? parsed.vitamins : [],
    minerals: Array.isArray(parsed.minerals) ? parsed.minerals : [],
    glycemic_index: parsed.glycemic_index ?? null,
    health_note: parsed.health_note || null,
    typical_portion: parsed.typical_portion || null,
  };
}

// ─── Gram/ml miktarına göre hesapla ──────────────────────────────────────────

export function calcNutritionForGrams(food, grams) {
  const ratio = grams / 100;
  return {
    calories: round((food.calories || 0) * ratio),
    protein: round((food.protein || 0) * ratio),
    carbs: round((food.carbs || 0) * ratio),
    fat: round((food.fat || 0) * ratio),
    fiber: round((food.fiber || 0) * ratio),
    sugar: round((food.sugar || 0) * ratio),
    sodium: round((food.sodium || 0) * ratio),
  };
}
