import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, TYPOGRAPHY, MAX_FONT_SCALE } from '../../constants/theme';
import { normalizeError, ERROR_CODES } from '../../services/errors';
import IconBadge from './IconBadge';
import AppButton from './AppButton';

const ICONS = {
  [ERROR_CODES.NETWORK_OFFLINE]: 'cloud-offline-outline',
  [ERROR_CODES.SERVER_UNAVAILABLE]: 'server-outline',
  [ERROR_CODES.TIMEOUT]: 'time-outline',
  [ERROR_CODES.AUTH_SESSION_REQUIRED]: 'lock-closed-outline',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'lock-closed-outline',
  [ERROR_CODES.AI_RATE_LIMIT]: 'hourglass-outline',
  [ERROR_CODES.AI_UNAVAILABLE]: 'sparkles-outline',
};

/**
 * Tam alan / kart içi hata durumu — toast yeterli olmadığında (liste yüklenemedi vb.).
 * Ham hata verilebilir; AppError'a çevrilip yalnızca kullanıcı mesajı gösterilir.
 *
 *   {error ? <ErrorState error={error} onRetry={refresh} /> : ...}
 */
export default function ErrorState({ error, onRetry, retryLabel = 'Tekrar dene', compact = false, style }) {
  const appErr = normalizeError(error);
  const icon = ICONS[appErr.code] || 'alert-circle-outline';
  const color = appErr.severity === 'warning' ? COLORS.warning : COLORS.error;

  return (
    <View style={[styles.wrap, compact && styles.compact, style]} accessibilityLiveRegion="polite">
      <IconBadge name={icon} color={color} size={compact ? 52 : 72} />
      <Text style={[styles.title, compact && styles.titleCompact]} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {appErr.title}
      </Text>
      <Text style={styles.message} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {appErr.userMessage}
      </Text>
      {!!onRetry && (
        <AppButton title={retryLabel} icon="refresh" variant="outline" size={compact ? 'sm' : 'md'} onPress={onRetry} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: SIZES.xl, paddingHorizontal: SIZES.lg },
  compact: { paddingVertical: SIZES.lg },
  title: { ...TYPOGRAPHY.sectionTitle, fontSize: SIZES.h4, textAlign: 'center', marginTop: SIZES.md },
  titleCompact: { fontSize: SIZES.h5 },
  message: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SIZES.sm, maxWidth: 300 },
  button: { marginTop: SIZES.lg },
});
