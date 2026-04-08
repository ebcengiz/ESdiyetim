// Form validasyon yardımcı fonksiyonları

export const validateWeight = (value) => {
  const parsed = parseFloat(value);
  if (!value || value.trim() === '') return 'Kilo alanı boş bırakılamaz.';
  if (Number.isNaN(parsed) || parsed <= 0) return 'Geçerli bir kilo değeri girin.';
  if (parsed > 500) return 'Kilo değeri çok yüksek.';
  return null;
};

export const validateRequired = (value, fieldName = 'Alan') => {
  if (!value || String(value).trim() === '') return `${fieldName} boş bırakılamaz.`;
  return null;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.trim() === '') return 'E-posta boş bırakılamaz.';
  if (!re.test(email)) return 'Geçerli bir e-posta adresi girin.';
  return null;
};

export const validatePassword = (password) => {
  if (!password || password.trim() === '') return 'Şifre boş bırakılamaz.';
  if (password.length < 6) return 'Şifre en az 6 karakter olmalıdır.';
  return null;
};
