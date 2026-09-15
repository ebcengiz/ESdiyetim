import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS, TYPOGRAPHY } from '../constants/theme';
import { normalizeError, logError, onFatalError } from '../services/errors';

/**
 * Uygulama kökündeki hata sınırı.
 *
 * - Render sırasında fırlayan hataları (componentDidCatch) yakalar.
 * - Production'da global handler'dan gelen fatal JS hatalarını da (onFatalError)
 *   aynı ekranda gösterir — kullanıcı beyaz ekran / ani kapanma görmez.
 * - Kullanıcıya yalnızca sakin bir "Bir şeyler ters gitti" + "Tekrar dene" sunar;
 *   teknik ayrıntı yalnızca __DEV__ modunda küçük bir kutuda görünür.
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error: normalizeError(error, { context: 'render' }) };
  }

  componentDidCatch(error, info) {
    logError('ErrorBoundary', error);
    if (info?.componentStack) console.error(info.componentStack);
  }

  componentDidMount() {
    this.unsubscribeFatal = onFatalError((appErr) => this.setState({ error: appErr }));
  }

  componentWillUnmount() {
    this.unsubscribeFatal?.();
  }

  handleRetry = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.iconWrap}>
            <Ionicons name="leaf-outline" size={40} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.body}>
            Beklenmeyen bir sorun oluştu. Verileriniz güvende — uygulamayı yeniden
            başlatmak genellikle sorunu çözer.
          </Text>

          <Pressable
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Tekrar dene"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Ionicons name="refresh" size={20} color={COLORS.textOnPrimary} />
            <Text style={styles.buttonText}>Tekrar dene</Text>
          </Pressable>

          {__DEV__ && (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>Geliştirici ayrıntısı (yalnızca dev)</Text>
              <Text style={styles.devText} selectable>
                {error.code}
                {'\n'}
                {error.detail || error.message}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    ...TYPOGRAPHY.screenTitle,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: SIZES.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusFull,
    minHeight: 48,
    ...SHADOWS.medium,
  },
  buttonPressed: { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: SIZES.body,
    fontWeight: '700',
  },
  devBox: {
    marginTop: SIZES.xl,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'stretch',
  },
  devTitle: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.textLight, marginBottom: 4 },
  devText: { fontSize: SIZES.tiny, color: COLORS.textSecondary, fontFamily: 'Menlo' },
});
