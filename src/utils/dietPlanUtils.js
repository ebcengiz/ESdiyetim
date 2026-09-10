import { MEAL_FIELDS } from '../constants/dietPlanFields';

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "• Yumurta, 50g — 77 kcal" biçimindeki satırlardan kalori toplar */
export function sumKcalFromMealText(text) {
  if (!text?.trim()) return 0;
  let sum = 0;
  for (const line of text.split('\n')) {
    const m = line.match(/[—–-]\s*(\d+)\s*kcal/i);
    if (m) sum += parseInt(m[1], 10) || 0;
  }
  return sum;
}

export function sumAllMealKcal(form) {
  return MEAL_FIELDS.reduce((acc, f) => acc + sumKcalFromMealText(form[f.key]), 0);
}
