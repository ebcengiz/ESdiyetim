import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, TYPOGRAPHY } from '../constants/theme';
import { normalizeError, logError, onFatalError } from '../services/errors';
import IconBadge from './ui/IconBadge';
import AppButton from './ui/AppButton';

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
          <IconBadge name="leaf-outline" size={88} style={styles.icon} />

          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.body}>
            Beklenmeyen bir sorun oluştu. Verileriniz güvende — uygulamayı yeniden
            başlatmak genellikle sorunu çözer.
          </Text>

          <AppButton title="Tekrar dene" icon="refresh" size="lg" onPress={this.handleRetry} />

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
  icon: { marginBottom: SIZES.lg },
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
