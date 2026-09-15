import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, RefreshControl, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

/**
 * Ekran iskeleti — safe area + (isteğe bağlı) scroll + yüzen tab bar alt boşluğu +
 * klavye kaçınma + pull-to-refresh. Her ekranda tekrar eden 5 farklı
 * KeyboardAvoidingView/ScrollView/paddingBottom kombinasyonunun yerine.
 *
 *   <ScreenContainer tab onRefresh={reload} refreshing={refreshing}>
 *     <HeroHeader />  ...
 *   </ScreenContainer>
 *
 * props:
 *   scroll      (true)  ScrollView ile sar; false → düz View (FlatList kullanan ekranlar için)
 *   tab         (false) Tab ekranı: alt boşluğu tab bar'a göre ayarla
 *   keyboard    (false) Form ekranı: KeyboardAvoidingView ekle
 *   edges       (['top']) SafeAreaView kenarları; header'lı stack ekranında [] ver
 *   padded      (true)  Yatay containerPadding uygula
 *   header      Scroll'un ÜSTÜNDE sabit kalan içerik (hero, arama çubuğu)
 *   footer      Scroll'un ALTINDA sabit kalan içerik (kaydet butonu vb.)
 */
export default function ScreenContainer({
  children,
  scroll = true,
  tab = false,
  keyboard = false,
  edges = ['top'],
  padded = true,
  header,
  footer,
  refreshing = false,
  onRefresh,
  backgroundColor = COLORS.background,
  style,
  contentContainerStyle,
  scrollProps,
}) {
  const { tabBottomPad, bottomPad } = useResponsive();
  const paddingBottom = tab ? tabBottomPad : footer ? SIZES.md : bottomPad;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        padded && styles.padded,
        { paddingBottom, paddingTop: SIZES.md },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        ) : undefined
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded, contentContainerStyle]}>{children}</View>
  );

  const inner = (
    <>
      {header}
      {body}
      {footer ? <View style={[styles.footer, padded && styles.padded, { paddingBottom: tab ? tabBottomPad : bottomPad }]}>{footer}</View> : null}
    </>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor }, style]}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: SIZES.containerPadding },
  footer: { paddingTop: SIZES.sm, backgroundColor: COLORS.transparent },
});
