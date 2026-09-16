import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIZES, tabBarMetrics, scrollTabScreenBottomPad } from '../constants/theme';

/**
 * Ekran ölçüleri — modül seviyesi `Dimensions.get('window')` yerine bunu kullan.
 * Döndürme / Dynamic Type / Split View değişimlerinde otomatik güncellenir.
 *
 *   const { width, isSmall, columnWidth, tabBottomPad } = useResponsive();
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const isSmall = width <= SIZES.smallScreenWidth;       // SE / mini (375pt dahil)
    const isLarge = width >= 414;                           // Plus / Pro Max
    const isLandscape = width > height;
    const contentWidth = width - SIZES.containerPadding * 2;
    const tab = tabBarMetrics(insets.bottom);

    return {
      width,
      height,
      fontScale,
      isSmall,
      isLarge,
      isLandscape,
      insets,
      /** Yatay padding düşülmüş kullanılabilir genişlik */
      contentWidth,
      /** n sütunlu grid için sütun genişliği (gap = SIZES.md) */
      columnWidth: (n = 2, gap = SIZES.md) => (contentWidth - gap * (n - 1)) / n,
      /** Küçük ekranda 1 kademe düşür (ör. ikon 24 → 22) */
      scale: (normal, small = normal - 2) => (isSmall ? small : normal),
      /** Tab ekranlarında ScrollView contentContainerStyle.paddingBottom */
      tabBottomPad: scrollTabScreenBottomPad(insets.bottom),
      tabBar: tab,
      /** Tab olmayan stack ekranlarında alt boşluk */
      bottomPad: Math.max(insets.bottom, SIZES.md) + SIZES.md,
      /** Header'sız ekranlarda üst boşluk */
      topPad: Math.max(insets.top, SIZES.sm + 4) + SIZES.md,
    };
  }, [width, height, fontScale, insets.top, insets.bottom, insets.left, insets.right]);
}

export default useResponsive;
