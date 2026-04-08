import { COLORS } from '../constants/theme';

export const calculateBMI = (height, weight) => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return (w / ((h / 100) * (h / 100))).toFixed(1);
};

export const getBMICategory = (bmi) => {
  if (!bmi) return null;
  const v = parseFloat(bmi);
  if (v < 18.5) return { name: 'Zayıf',        color: COLORS.info,    icon: 'trending-down'    };
  if (v < 25)   return { name: 'Normal',        color: COLORS.success, icon: 'checkmark-circle' };
  if (v < 30)   return { name: 'Fazla Kilolu',  color: COLORS.warning, icon: 'alert-circle'     };
  return              { name: 'Obez',          color: COLORS.error,   icon: 'close-circle'     };
};

export const getBMICategoryName = (bmi) => {
  if (!bmi) return null;
  const v = parseFloat(bmi);
  if (v < 18.5) return 'Zayıf';
  if (v < 25)   return 'Normal';
  if (v < 30)   return 'Fazla Kilolu';
  return 'Obez';
};
