// Diyet planı öğün alanları — DietPlanScreen ve alt bileşenleri (MealCard,
// DietPlanHistorySheet, MealFoodPickerSection) arasında paylaşılır.
export const MEAL_FIELDS = [
  { key: 'breakfast',       icon: 'sunny-outline',        label: 'Kahvaltı',     color: '#F59E0B', placeholder: 'Kahvaltıda ne yenilecek?',          group: 'main'  },
  { key: 'lunch',           icon: 'partly-sunny-outline', label: 'Öğle Yemeği',  color: '#10B981', placeholder: 'Öğle yemeğinde ne yenilecek?',       group: 'main'  },
  { key: 'dinner',          icon: 'moon-outline',         label: 'Akşam Yemeği', color: '#6366F1', placeholder: 'Akşam yemeğinde ne yenilecek?',      group: 'main'  },
  { key: 'morning_snack',   icon: 'cafe-outline',         label: 'Kuşluk',       color: '#EC4899', placeholder: 'Sabah ara öğünü...',                 group: 'snack' },
  { key: 'afternoon_snack', icon: 'nutrition-outline',    label: 'İkindi',       color: '#14B8A6', placeholder: 'Öğleden sonra ara öğünü...',         group: 'snack' },
  { key: 'evening_snack',   icon: 'moon-outline',         label: 'Gece',         color: '#8B5CF6', placeholder: 'Akşam ara öğünü...',                 group: 'snack' },
];

export const EMPTY_FORM = {
  breakfast: '', morning_snack: '', lunch: '',
  afternoon_snack: '', dinner: '', evening_snack: '',
  notes: '', total_calories: '',
};

export const MONTHS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
