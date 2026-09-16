import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * Kompakt hero başlık — yeşil gradyan üstünde tek satır: [sol] başlık(+meta) [aksiyonlar].
 * Altında isteğe bağlı kontrol slotu (SegmentedControl, Chip şeridi, DateStepper…).
 *
 * Kural: header'da yalnızca (a) başlık, (b) ekranın birincil kontrolü, (c) en fazla
 * tek satır anlam taşıyan bilgi bulunur. Rozet, tarih etiketi, açıklama cümlesi YOK —
 * ScreenContainer.header sabit kaldığı için buradaki her satır içerik alanından çalar.
 *
 *   <HeroHeader title="Hedeflerim" meta="2 aktif · 1 tamamlanan"
 *               actions={[{ icon: 'add', label: 'Yeni hedef', onPress }]}>
 *     <SegmentedControl ... />
 *   </HeroHeader>
 *
 * props:
 *   title     Ekran başlığı (accessibilityRole="header")
 *   meta      Başlığın altında tek satır kısa bilgi ("Son kayıt: 75 kg") — açıklama cümlesi değil
 *   actions   [{ icon, label, onPress, muted }] sağdaki yuvarlak ikon butonları
 *   onBack    Verilirse solda standart geri butonu (stack ekranları)
 *   left      Başlığın solunda özel içerik (avatar vb.) — onBack ile birlikte kullanılmaz
 *   right     actions yerine özel sağ içerik (avatar, rozet)
 *   children  Kontrol slotu — başlık satırının altında
 *   colors    Gradyan (varsayılan primary → primaryLight)
 */
export default function HeroHeader({ title, meta, actions = [], onBack, left, right, children, colors, style }) {
  const { topPad } = useResponsive();

  return (
    <LinearGradient
      colors={colors || [COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: topPad - SIZES.xs }, style]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.textOnPrimary} />
          </Pressable>
        ) : left ? (
          <View style={styles.left}>{left}</View>
        ) : null}
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {title}
          </Text>
          {!!meta && (
            <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
              {meta}
            </Text>
          )}
        </View>
        {right ? (
          <View style={styles.right}>{right}</View>
        ) : actions.length > 0 ? (
          <View style={styles.actions}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              >
                <Ionicons name={a.icon} size={20} color={a.muted ? whiteAlpha(0.75) : COLORS.textOnPrimary} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {children ? <View style={styles.slot}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: SIZES.md, paddingHorizontal: SIZES.containerPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm + 4, minHeight: SIZES.minTouch },
  left: {},
  texts: { flex: 1 },
  title: { fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.35, color: COLORS.textOnPrimary },
  meta: { fontSize: SIZES.tiny, fontWeight: '600', color: whiteAlpha(0.88), marginTop: 2 },
  right: { flexShrink: 0 },
  actions: { flexDirection: 'row', gap: SIZES.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: whiteAlpha(0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  slot: { marginTop: SIZES.sm + 4 },
});
