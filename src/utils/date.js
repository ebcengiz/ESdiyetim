// Tarih yardımcı fonksiyonları

export const toDateString = (date) =>
  (date instanceof Date ? date : new Date(date)).toISOString().split('T')[0];

export const formatShortDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export const formatLongDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatMediumDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const daysBetween = (dateStr1, dateStr2) => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
};

export const daysFromToday = (dateStr) => {
  const today = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};
