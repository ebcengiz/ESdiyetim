/**
 * Nutrition Service
 *
 * Kaynak zinciri:
 *  1. Open Food Facts TR  → Türk markaları (Sütaş, Dost, Ülker…)
 *  2. Open Food Facts WW  → Uluslararası paketli ürünler
 *  3. USDA FoodData Central → İçecekler ve ABD ürünleri (API key gerektirmez)
 *  4. Edamam Nutrition API  → Genel besin analizi (API key gerekir)
 *  5. CalorieNinja API      → Hızlı besin sonuçları (API key gerekir)
 *  6. Groq AI               → Türkçe gıda adlarında tam besin analizi (fallback)
 */

import { callGroq, parseJsonObjectFromLlmText } from './ai/providers';

// ─── Ortak yardımcılar ────────────────────────────────────────────────────────
const EDAMAM_APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID || '';
const EDAMAM_APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY || '';
const CALORIENINJA_API_KEY = process.env.EXPO_PUBLIC_CALORIENINJA_API_KEY || '';

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

// ─── 4: Edamam Nutrition API ──────────────────────────────────────────────────

async function fetchEdamam(query) {
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) return [];

  try {
    const url =
      'https://api.edamam.com/api/nutrition-data' +
      `?app_id=${encodeURIComponent(EDAMAM_APP_ID)}` +
      `&app_key=${encodeURIComponent(EDAMAM_APP_KEY)}` +
      `&ingr=${encodeURIComponent(`100g ${query}`)}`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();

    const parsed = parseEdamamFood(json, query);
    return parsed ? [parsed] : [];
  } catch {
    return [];
  }
}

function parseEdamamFood(data, query) {
  if (!data || typeof data.calories !== 'number' || data.calories <= 0) return null;
  const n = data.totalNutrients || {};

  const isDrink = /drink|beverage|juice|water|soda|cola|tea|coffee|milk|ayran|içecek/i.test(
    `${query} ${data.uri || ''}`
  );

  return {
    source: 'edamam',
    id: `edamam_${toKebab(query)}`,
    name: capitalize(query),
    brand: null,
    imageUrl: null,
    isDrink,
    calories: round(data.calories),
    protein: round(n.PROCNT?.quantity),
    carbs: round(n.CHOCDF?.quantity),
    fat: round(n.FAT?.quantity),
    fiber: round(n.FIBTG?.quantity),
    sugar: round(n.SUGAR?.quantity),
    sodium: round(n.NA?.quantity),
    saturated_fat: round(n.FASAT?.quantity),
    vitamins: [],
    minerals: [],
    glycemic_index: null,
    health_note: null,
    typical_portion: '100g',
    category: null,
  };
}

// ─── 5: CalorieNinja API ──────────────────────────────────────────────────────

async function fetchCalorieNinja(query) {
  if (!CALORIENINJA_API_KEY) return [];

  try {
    const url = `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { 'X-Api-Key': CALORIENINJA_API_KEY },
    });
    if (!res.ok) return [];
    const json = await res.json();

    return (json.items || [])
      .map((item) => parseCalorieNinjaItem(item))
      .filter((p) => p !== null && p.calories != null && p.calories > 0);
  } catch {
    return [];
  }
}

function parseCalorieNinjaItem(item) {
  if (!item?.name || item.calories == null) return null;

  const serving = Number(item.serving_size_g) || 100;
  const scale = serving > 0 ? 100 / serving : 1;

  const isDrink = /drink|beverage|juice|water|soda|cola|tea|coffee|milk|ayran|içecek/i.test(
    item.name
  );

  return {
    source: 'calorieninja',
    id: `calorieninja_${toKebab(item.name)}`,
    name: capitalize(item.name),
    brand: null,
    imageUrl: null,
    isDrink,
    calories: round(item.calories * scale),
    protein: round((item.protein_g || 0) * scale),
    carbs: round((item.carbohydrates_total_g || 0) * scale),
    fat: round((item.fat_total_g || 0) * scale),
    fiber: round((item.fiber_g || 0) * scale),
    sugar: round((item.sugar_g || 0) * scale),
    sodium: round((item.sodium_mg || 0) * scale),
    saturated_fat: round((item.fat_saturated_g || 0) * scale),
    vitamins: [],
    minerals: [],
    glycemic_index: null,
    health_note: null,
    typical_portion: `${round(serving)}g`,
    category: null,
  };
}

// ─── Birleşik arama ───────────────────────────────────────────────────────────

export async function searchOpenFoodFacts(query) {
  // Tüm sağlayıcılar paralel çalışır, API key zorunlu olanlar key yoksa boş döner.
  const [trResults, wwResults, usdaResults, edamamResults, calorieNinjaResults] = await Promise.all([
    fetchOFF('https://tr.openfoodfacts.org', query),
    fetchOFF('https://world.openfoodfacts.org', query),
    fetchUSDA(query),
    fetchEdamam(query),
    fetchCalorieNinja(query),
  ]);

  // Birleştir, id'ye göre tekrarları temizle
  const seen = new Set();
  const merged = [];

  for (const item of [...trResults, ...wwResults, ...usdaResults, ...edamamResults, ...calorieNinjaResults]) {
    const key = `${item.name.toLowerCase()}_${item.brand || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // Kalori'ye göre sırala (en bilinenleri üste)
  return merged.slice(0, 20);
}

// ─── 6: Groq AI (Türkçe gıda analizi) ───────────────────────────────────────

const NUTRITION_PROMPT = (foodName, isDrink) =>
  `Sen bir beslenme uzmanı ve besin değerleri veritabanısın.
"${foodName}" için ${isDrink ? '100 mililitre (100ml)' : '100 gram'} başına besin değerlerini hesapla.

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
  const raw = await callGroq(NUTRITION_PROMPT(foodName, isDrink));
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
