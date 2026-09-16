import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../constants/theme';
import { BottomSheet, AppButton, IconBadge } from './ui';

/**
 * Apple 5.1.2(i): üçüncü taraf AI sağlayıcılarına veri gönderilmeden önce açık onay.
 * Backdrop ile kapanmaz; kullanıcı "Kabul" ya da "Şimdi Değil" seçmeli.
 */
export default function AIConsentModal({ visible, providers, onAccept, onDecline }) {
  const providerList = (providers || []).join(' ve ');

  return (
    <BottomSheet
      visible={visible}
      onClose={onDecline}
      title="Yapay zeka veri paylaşımı"
      dismissOnBackdrop={false}
      showClose={false}
      keyboard={false}
      footer={
        <View style={styles.footer}>
          <AppButton title="Kabul Ediyorum" icon="checkmark-circle-outline" fullWidth onPress={onAccept} />
          <AppButton title="Şimdi Değil" variant="ghost" fullWidth onPress={onDecline} haptic={false} />
        </View>
      }
    >
      <IconBadge name="sparkles-outline" size={56} style={styles.icon} />
      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        ESdiyet, size kişiselleştirilmiş öneriler ve fotoğraftan kalori tahmini sunabilmek için
        girdiğiniz bazı bilgileri (yemek fotoğrafı, kilo/hedef gibi sağlık verileri) üçüncü taraf
        yapay zeka sağlayıcılarına gönderir:
      </Text>
      <View style={styles.providerBox}>
        <Ionicons name="cloud-outline" size={16} color={COLORS.primaryDark} />
        <Text style={styles.providerText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{providerList}</Text>
      </View>
      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Bu veriler yalnızca anlık analiz için kullanılır. Onayınızı istediğiniz zaman{' '}
        <Text style={styles.bold}>Profil → Yapay Zeka Veri Paylaşımı</Text> bölümünden geri
        çekebilirsiniz. Onay vermezseniz fotoğraftan kalori tahmini ve AI destekli öneriler
        çalışmaz.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', marginBottom: SIZES.md },
  body: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SIZES.sm + 2 },
  bold: { fontWeight: '700', color: COLORS.text },
  providerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    marginBottom: SIZES.md,
  },
  providerText: { fontSize: SIZES.bodySmall, fontWeight: '700', color: COLORS.primaryDark, flex: 1 },
  footer: { gap: SIZES.xs },
});
