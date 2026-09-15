import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, HIT_SLOP, MAX_FONT_SCALE } from '../../constants/theme';
import AppButton from '../ui/AppButton';

/**
 * Login/Register ortak alt bölüm: "veya" ayracı → misafir butonu → ipucu →
 * gizlilik linki → "Hesabın yok mu? Kayıt ol" satırı.
 */
export default function AuthFooter({
  onGuest,
  guestHint,
  switchPrompt,
  switchLabel,
  onSwitch,
  onPrivacy,
  disabled = false,
}) {
  return (
    <View>
      <View style={styles.divider} accessibilityElementsHidden>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>veya</Text>
        <View style={styles.dividerLine} />
      </View>

      <AppButton
        title="Hesap olmadan devam et"
        icon="phone-portrait-outline"
        variant="outline"
        fullWidth
        onPress={onGuest}
        disabled={disabled}
        accessibilityHint="Misafir olarak sınırlı özelliklerle devam eder"
      />

      <View style={styles.hintBox}>
        <Ionicons name="information-circle-outline" size={15} color={COLORS.textLight} />
        <Text style={styles.hintText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {guestHint}
        </Text>
      </View>

      {!!onPrivacy && (
        <Pressable
          onPress={onPrivacy}
          hitSlop={HIT_SLOP}
          disabled={disabled}
          accessibilityRole="link"
          style={({ pressed }) => [styles.privacy, pressed && styles.pressed]}
        >
          <Text style={styles.privacyLink}>Gizlilik Politikası</Text>
        </Pressable>
      )}

      <View style={styles.switchRow}>
        <Text style={styles.switchText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          {switchPrompt}{' '}
        </Text>
        <Pressable
          onPress={onSwitch}
          hitSlop={HIT_SLOP}
          disabled={disabled}
          accessibilityRole="link"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.switchLink} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {switchLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SIZES.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: SIZES.md, fontSize: SIZES.bodySmall, color: COLORS.textSecondary },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm + 2,
  },
  hintText: { flex: 1, fontSize: SIZES.small, color: COLORS.textLight, lineHeight: 19 },
  privacy: { alignSelf: 'center', marginBottom: SIZES.md, minHeight: 32, justifyContent: 'center' },
  privacyLink: { fontSize: SIZES.small, color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: SIZES.minTouch },
  switchText: { fontSize: SIZES.body, color: COLORS.textSecondary },
  switchLink: { fontSize: SIZES.body, color: COLORS.primary, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
