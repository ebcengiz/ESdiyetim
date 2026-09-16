import { COLORS } from './theme';

// Besin günlüğü öğün türleri ve günlük hedefler — FoodLogScreen ve alt
// bileşenleri (MealSection, FoodSearchModal) arasında paylaşılır.
export const DAILY_GOAL_KCAL = 2000;

/** Makro renkleri (özet kartı + besin detay ızgarası) — tek kaynak */
export const MACRO_COLORS = {
  calories: COLORS.primary,
  protein: COLORS.accents.emerald,
  carbs: COLORS.accents.amber,
  fat: COLORS.accents.coral,
  fiber: COLORS.accents.teal,
  sugar: COLORS.accents.violet,
  sodium: COLORS.neutral500,
  gi: COLORS.accents.indigo,
};
export const DAILY_GOAL = { protein: 150, carbs: 250, fat: 65, fiber: 25 };

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Kahvaltı',     icon: 'sunny-outline'          },
  { key: 'lunch',     label: 'Öğle Yemeği',  icon: 'partly-sunny-outline'   },
  { key: 'dinner',    label: 'Akşam Yemeği', icon: 'moon-outline'           },
  { key: 'snack',     label: 'Atıştırmalık', icon: 'cafe-outline'           },
  { key: 'drink',     label: 'İçecek',       icon: 'water-outline'          },
];
