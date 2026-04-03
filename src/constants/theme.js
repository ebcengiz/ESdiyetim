// ESdiyet - Modern Renk Paleti ve Tema Sabitleri
export const COLORS = {
  // Ana renkler — Sage Viridian (2025 Premium Wellness Palette)
  primary: '#0BBF7B',       // Vibrant Sage Green
  primaryLight: '#2DD694',  // Fresh Bright Green
  primaryDark: '#089660',   // Rich Deep Green

  secondary: '#73E8BC',     // Soft Mint
  accent: '#E6FBF3',        // Ultra-light mint surface
  accentDark: '#065C3A',    // Deep Anchor Green

  // Gradient renkleri
  gradientStart: '#0BBF7B',
  gradientMiddle: '#2DD694',
  gradientEnd: '#73E8BC',

  // Arkaplan ve yüzeyler — sıcak yeşil-tinted white
  background: '#F4FBF7',    // Warm White (subtle green tint)
  backgroundLight: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF7F1',    // Soft green-tinted alt surface
  card: '#FFFFFF',

  // Metin renkleri — yeşil-tinted, daha sıcak
  text: '#0C1F16',          // Deep Green-Black
  textSecondary: '#4A6959', // Muted Green-Gray
  textLight: '#8AABA0',     // Soft Green-Gray
  textOnPrimary: '#FFFFFF',

  // Durum renkleri
  success: '#0BBF7B',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Çizgiler ve kenarlıklar
  border: '#D4EDE3',        // Soft green-tinted border
  borderLight: '#EDF7F1',
  divider: '#EDF7F1',

  // Şeffaflık
  overlay: 'rgba(6, 25, 16, 0.45)',
  overlayLight: 'rgba(6, 25, 16, 0.15)',
  shadowColor: '#0BBF7B',

  // Özel renkler
  shimmer: '#D4EDE3',
  highlight: '#E6FBF3',     // Mint highlight
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
    shadowColor: '#0BBF7B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0BBF7B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },
  large: {
    shadowColor: '#0BBF7B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#0BBF7B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
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