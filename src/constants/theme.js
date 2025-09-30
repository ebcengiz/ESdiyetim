// ESdiyet - Modern Renk Paleti ve Tema Sabitleri
export const COLORS = {
  // Ana renkler - Beyaz ve yeşil tonları (Modern Palette)
  primary: '#10B981',      // Modern Emerald Green
  primaryLight: '#34D399', // Light Emerald
  primaryDark: '#059669',  // Dark Emerald

  secondary: '#6EE7B7',    // Mint Green
  accent: '#A7F3D0',       // Light Mint
  accentDark: '#047857',   // Deep Green

  // Gradient renkleri
  gradientStart: '#10B981',
  gradientMiddle: '#34D399',
  gradientEnd: '#6EE7B7',

  // Arkaplan ve yüzeyler
  background: '#F9FAFB',   // Subtle Gray Background
  backgroundLight: '#FFFFFF', // Pure White
  surface: '#FFFFFF',      // White Surface
  surfaceAlt: '#F3F4F6',   // Alternative Surface
  card: '#FFFFFF',         // Card Background

  // Metin renkleri
  text: '#111827',         // Almost Black
  textSecondary: '#6B7280',// Gray
  textLight: '#9CA3AF',    // Light Gray
  textOnPrimary: '#FFFFFF',// White on colored bg

  // Durum renkleri
  success: '#10B981',      // Success Green
  warning: '#F59E0B',      // Amber Warning
  error: '#EF4444',        // Red Error
  info: '#3B82F6',         // Blue Info

  // Çizgiler ve kenarlıklar
  border: '#E5E7EB',       // Light Border
  borderLight: '#F3F4F6',  // Very Light Border
  divider: '#F3F4F6',      // Divider

  // Şeffaflık
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  shadowColor: '#000000',

  // Özel renkler
  shimmer: '#E5E7EB',
  highlight: '#ECFDF5',    // Light green highlight
};

export const SIZES = {
  // Padding ve margin (Modern 8pt grid)
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Font boyutları (Modern Typography Scale)
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

  // Diğer boyutlar (Modern Radius)
  radius: 16,
  radiusSmall: 12,
  radiusMedium: 16,
  radiusLarge: 24,
  radiusXL: 32,
  radiusFull: 9999,

  // Icon boyutları
  iconSize: 24,
  iconSizeSmall: 20,
  iconSizeMedium: 28,
  iconSizeLarge: 32,
  iconSizeXL: 40,

  // Container ve spacing
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

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: COLORS.shadowColor,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Animasyon sabitleri
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

// Layout sabitleri
export const LAYOUT = {
  window: {
    width: '100%',
    height: '100%',
  },
  headerHeight: 60,
  tabBarHeight: 65,
  bottomSpace: 20,
};