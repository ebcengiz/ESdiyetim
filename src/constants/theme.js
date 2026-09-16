import { DefaultTheme } from '@react-navigation/native';

// ESdiyet — Modern yeşil + beyaz tasarım sistemi (tek kaynak)
export const COLORS = {
  // Ana yeşil — Emerald / wellness (okunabilir, güncel)
  primary: '#16A34A',
  primaryLight: '#22C55E',
  primaryDark: '#15803D',
  primaryMuted: '#4ADE80',

  secondary: '#86EFAC',
  accent: '#F0FDF4',
  accentDark: '#14532D',

  gradientStart: '#15803D',
  gradientMiddle: '#22C55E',
  gradientEnd: '#4ADE80',

  // Beyaz ve yüzeyler
  background: '#FAFAFA',
  backgroundLight: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0FDF4',
  card: '#FFFFFF',

  // Metin — yeşil-gri tonları
  text: '#14532D',
  textSecondary: '#3F6B5C',
  textLight: '#7D9A8E',
  textOnPrimary: '#FFFFFF',

  // Durum (VKİ / formlar; krom yeşil dışında net geri bildirim)
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#0F766E',

  // Kenarlık ve ayırıcı
  border: '#DCFCE7',
  borderLight: '#ECFDF5',
  divider: '#E8F5EE',

  overlay: 'rgba(20, 83, 45, 0.45)',
  overlayLight: 'rgba(20, 83, 45, 0.12)',
  shadowColor: '#15803D',

  shimmer: '#DCFCE7',
  highlight: '#DCFCE7',

  // Form / buton
  disabled: '#A7C4B6',

  // Mutlak renkler — sadece token olarak kullan ("#fff" yazma)
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Durum arka planları (rozet, banner, inline uyarı)
  successBg: '#DCFCE7',
  successText: '#166534',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  errorBg: '#FEE2E2',
  errorText: '#B91C1C',
  infoBg: '#E0F2FE',
  infoText: '#075985',

  // Nötr ölçek (koyu yüzeyler / toast / gölge)
  neutral900: '#0F172A',
  neutral800: '#1E293B',
  neutral700: '#334155',
  neutral500: '#64748B',
  neutral300: '#CBD5E1',
  neutral100: '#F1F5F9',

  // Kategori/öğün vurguları (ikon rozeti, grafik, chip) — tek kaynak
  accents: {
    indigo: '#6366F1',
    violet: '#8B5CF6',
    pink: '#EC4899',
    coral: '#F97316',
    amber: '#F59E0B',
    emerald: '#10B981',
    teal: '#14B8A6',
    sky: '#3B82F6',
  },

  // Bilgilendirme kutuları (amber yerine yumuşak yeşil-mint)
  disclaimerBackground: '#F0FDF4',
  disclaimerBackgroundEnd: '#ECFDF5',
  disclaimerBorder: '#BBF7D0',
  disclaimerTitle: '#14532D',
  disclaimerText: '#166534',
  disclaimerIcon: '#15803D',
};

/**
 * Hex rengi alpha ile rgba'ya çevirir — `'#16A34A' + '22'` kalıbı yerine bunu kullan.
 *   withAlpha(COLORS.primary, 0.12)
 */
export function withAlpha(hex, alpha = 1) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Yeşil gradient üstündeki beyaz cam yüzeyler için (hero, chip, header ikonu) */
export const whiteAlpha = (alpha) => withAlpha(COLORS.white, alpha);

/** Koyu overlay (backdrop, sheet arkası) */
export const blackAlpha = (alpha) => withAlpha(COLORS.black, alpha);

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  h1: 34,
  h2: 28,
  h3: 22,
  h4: 18,
  h5: 16,
  body: 16,
  bodySmall: 15,
  small: 14,
  tiny: 12,
  micro: 10,

  radius: 16,
  radiusSmall: 12,
  radiusMedium: 16,
  radiusLarge: 24,
  radiusXL: 32,
  radiusFull: 9999,

  iconSize: 24,
  iconSizeSmall: 20,
  iconSizeMedium: 28,
  iconSizeLarge: 32,
  iconSizeXL: 40,

  containerPadding: 20,
  cardPadding: 20,
  sectionSpacing: 24,

  // Erişilebilirlik — HIG/Material minimum dokunma hedefi
  minTouch: 44,
  buttonHeight: 52,
  buttonHeightSmall: 40,
  inputHeight: 54,

  // Küçük ekran (≤375pt, iPhone SE/mini) eşiği
  smallScreenWidth: 375,
};

/** Küçük ikon butonlarda dokunma alanını 44pt'ye tamamlar */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/** Dynamic Type: yazı büyütmede taşmayı sınırlar (AAA yerine pratik üst sınır) */
export const MAX_FONT_SCALE = 1.3;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  semiBold: 'System',
};

/** Başlık ve gövde — ekranlarda spread ile kullanılabilir */
export const TYPOGRAPHY = {
  hero: {
    fontSize: SIZES.h1,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.8,
  },
  screenTitle: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  sectionTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.35,
  },
  body: {
    fontSize: SIZES.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  label: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: SIZES.body,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  small: {
    fontSize: SIZES.tiny,
    color: COLORS.textLight,
    lineHeight: 16,
  },
};

const shadow = (opacity, radius, elevation, offsetY) => ({
  shadowColor: COLORS.shadowColor,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: shadow(0.08, 6, 2, 2),
  medium: shadow(0.12, 12, 4, 4),
  large: shadow(0.16, 20, 8, 8),
  xl: shadow(0.18, 28, 12, 12),
};

/** Giriş / form alanları — ince çerçeve + gölge */
export const INPUT_FIELD = {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: COLORS.surface,
  borderRadius: SIZES.radiusLarge,
  marginBottom: SIZES.md,
  paddingHorizontal: SIZES.md,
  borderWidth: 1,
  borderColor: COLORS.border,
  ...SHADOWS.small,
};

/** Kart yüzeyi — bölüm içi kutular */
export const CARD_SURFACE = {
  backgroundColor: COLORS.surface,
  borderRadius: SIZES.radiusLarge,
  borderWidth: 1,
  borderColor: COLORS.borderLight,
  ...SHADOWS.small,
};

/** React Navigation — liste ve arka plan renkleri */
export const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    ease: 'ease',
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const LAYOUT = {
  window: {
    width: '100%',
    height: '100%',
  },
  headerHeight: 60,
  bottomSpace: 20,
  // Dock'lu tab bar — TEK kaynak (MainNavigator + ekran alt boşlukları buradan türetilir)
  tabBar: {
    height: 60,          // ikon + etiket alanı (safe area hariç)
    minBottomPad: 8,     // home indicator olmayan cihazlarda (SE / Android buton bar) alt nefes payı
  },
};

/**
 * Tab bar'ın gerçek ölçüleri — güvenli alana göre.
 * Bar ekranın en altına yapışıktır; home indicator alanı (insets.bottom) barın içinde
 * paddingBottom olarak kalır, böylece her cihazda ikonlar aynı yükseklikte durur.
 */
export function tabBarMetrics(insetsBottom = 0) {
  const { height, minBottomPad } = LAYOUT.tabBar;
  const paddingBottom = Math.max(insetsBottom, minBottomPad);
  const totalHeight = height + paddingBottom;
  return { height: totalHeight, paddingBottom, bottom: 0, totalSpace: totalHeight };
}

/**
 * Dock'lu tab bar + güvenli alan: ScrollView contentContainerStyle paddingBottom
 * (içerik tab'ın arkasında kalmaması için)
 */
export function scrollTabScreenBottomPad(insetsBottom = 0) {
  return tabBarMetrics(insetsBottom).totalSpace + LAYOUT.bottomSpace;
}
