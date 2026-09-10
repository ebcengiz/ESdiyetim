// Besin günlüğü öğün türleri ve günlük hedefler — FoodLogScreen ve alt
// bileşenleri (MealSection, FoodSearchModal) arasında paylaşılır.
export const DAILY_GOAL_KCAL = 2000;
export const DAILY_GOAL = { protein: 150, carbs: 250, fat: 65, fiber: 25 };

export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Kahvaltı',     icon: 'sunny-outline'          },
  { key: 'lunch',     label: 'Öğle Yemeği',  icon: 'partly-sunny-outline'   },
  { key: 'dinner',    label: 'Akşam Yemeği', icon: 'moon-outline'           },
  { key: 'snack',     label: 'Atıştırmalık', icon: 'cafe-outline'           },
  { key: 'drink',     label: 'İçecek',       icon: 'water-outline'          },
];
