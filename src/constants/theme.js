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

  // Bilgilendirme kutuları (amber yerine yumuşak yeşil-mint)
  disclaimerBackground: '#F0FDF4',
  disclaimerBackgroundEnd: '#ECFDF5',
  disclaimerBorder: '#BBF7D0',
  disclaimerTitle: '#14532D',
  disclaimerText: '#166534',
  disclaimerIcon: '#15803D',
};

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
};

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
  tabBarHeight: 65,
  bottomSpace: 20,
};
