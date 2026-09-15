import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, HIT_SLOP, MAX_FONT_SCALE, blackAlpha } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * Alt sayfa (bottom sheet) — 9 dosyadaki Modal + borderTopLeftRadius kopyalarının ortak hali.
 *
 *   <BottomSheet visible={open} onClose={close} title="Kilo Ekle"
 *                footer={<AppButton title="Kaydet" fullWidth onPress={save} />}>
 *     <AppInput ... />
 *   </BottomSheet>
 *
 * props:
 *   scroll     (true) içerik ScrollView'da; false → düz View (kendi FlatList'i olan içerik)
 *   maxHeight  (0.88) ekran yüksekliğinin oranı
 *   keyboard   (true) klavye açılınca sheet yukarı kayar
 */
export default function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
  keyboard = true,
  maxHeight = 0.88,
  dismissOnBackdrop = true,
  showClose = true,
  contentStyle,
}) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useResponsive();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (mounted) {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false)
      );
    }
  }, [visible]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [winH, 0] });
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentStyle]}
      bounces={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flexShrink, contentStyle]}>{children}</View>
  );

  const sheet = (
    <Animated.View
      style={[
        styles.sheet,
        { maxHeight: winH * maxHeight, paddingBottom: Math.max(insets.bottom, SIZES.md), transform: [{ translateY }] },
      ]}
      accessibilityViewIsModal
    >
      <View style={styles.handle} />
      {(title || showClose) && (
        <View style={styles.header}>
          <View style={styles.titles}>
            {!!title && (
              <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} accessibilityRole="header">
                {title}
              </Text>
            )}
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {showClose && (
            <Pressable onPress={onClose} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Kapat" style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </Pressable>
          )}
        </View>
      )}
      {body}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Animated.View>
  );

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissOnBackdrop ? onClose : undefined} accessibilityLabel="Kapat" />
      </Animated.View>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
          {sheet}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.kav} pointerEvents="box-none">{sheet}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: blackAlpha(0.45) },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    ...SHADOWS.xl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.containerPadding,
    paddingVertical: SIZES.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  titles: { flex: 1 },
  title: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  subtitle: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.md, paddingBottom: SIZES.sm },
  flexShrink: { flexShrink: 1 },
  footer: { paddingHorizontal: SIZES.containerPadding, paddingTop: SIZES.sm },
});
