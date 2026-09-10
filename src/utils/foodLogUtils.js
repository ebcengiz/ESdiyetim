export const toLocalDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fmt = (n) => (n == null ? '—' : Number(n).toFixed(1));

export function getSourceBadgeMeta(source) {
  switch (source) {
    case 'ai':
      return { label: '🤖 AI', style: 'ai' };
    case 'usda':
      return { label: '🇺🇸 USDA', style: 'db' };
    case 'openfoodfacts':
    default:
      return { label: '🌐 OFF', style: 'db' };
  }
}
