import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, MAX_FONT_SCALE } from '../constants/theme';
import { BottomSheet, AppButton, IconBadge } from './ui';

/**
 * KVKK aydınlatma + açık rıza (kişiselleştirme için): ücretsiz plandaki kullanıcıya
 * ilk geçiş reklamı fırsatında bir kez gösterilir; karar yokken reklamlar genel moddadır. İki seçenek de reklam gösterir; fark yalnızca
 * kişiselleştirme (reklam kimliği / ATT). Backdrop ile kapanmaz; kapatma
 * "Sadece genel reklamlar" ile eşdeğerdir (varsayılan = daha az veri).
 * Apple 5.1.2: ATT sistem izni ancak kullanıcı "kişiselleştirilmiş" seçerse istenir.
 */
export default function AdConsentModal({ visible, onPersonalized, onGeneral, onOpenPrivacy }) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onGeneral}
      title="Reklamlar hakkında"
      dismissOnBackdrop={false}
      showClose={false}
      keyboard={false}
      footer={
        <View style={styles.footer}>
          <AppButton title="Kişiselleştirilmiş reklamlara izin ver" icon="checkmark-circle-outline" fullWidth onPress={onPersonalized} />
          <AppButton title="Sadece genel reklamlar" variant="secondary" fullWidth onPress={onGeneral} haptic={false} />
        </View>
      }
    >
      <IconBadge name="megaphone-outline" size={56} style={styles.icon} />
      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        ESdiyet'in ücretsiz sürümü, yapay zeka maliyetlerini karşılamak için Google AdMob
        reklamlarıyla desteklenir. Reklamlar yalnızca AI analizi sırasında ve günlük hakkınız
        dolduğunda ek hak kazanmak için, günde sınırlı sayıda gösterilir.
      </Text>

      <View style={styles.row}>
        <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primaryDark} />
        <Text style={styles.rowText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Kilo, VKİ, öğün ve fotoğraf gibi <Text style={styles.bold}>sağlık verileriniz reklam ağına hiçbir zaman gönderilmez.</Text>
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="person-circle-outline" size={18} color={COLORS.primaryDark} />
        <Text style={styles.rowText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          <Text style={styles.bold}>Kişiselleştirilmiş:</Text> iOS, reklam kimliğinizin (IDFA) kullanımı için ayrıca
          izin soracaktır; reddederseniz genel reklam gösterilir.
        </Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="eye-off-outline" size={18} color={COLORS.primaryDark} />
        <Text style={styles.rowText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          <Text style={styles.bold}>Sadece genel:</Text> reklam kimliği kullanılmaz; yalnızca IP adresi ve cihaz
          bilgisiyle (yaklaşık konum, dil) genel reklam gösterilir.
        </Text>
      </View>

      <Text style={styles.body} maxFontSizeMultiplier={MAX_FONT_SCALE}>
        Tercihinizi <Text style={styles.bold}>Profil → Kişiselleştirilmiş reklamlar</Text> bölümünden her an
        değiştirebilirsiniz. Premium'a geçerek reklamları tamamen kaldırabilirsiniz. Ayrıntılar:{' '}
        <Text style={styles.link} accessibilityRole="link" onPress={onOpenPrivacy}>Gizlilik politikası</Text>.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  icon: { alignSelf: 'center', marginBottom: SIZES.md },
  body: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 22, marginBottom: SIZES.sm + 2 },
  bold: { fontWeight: '700', color: COLORS.text },
  link: { fontWeight: '700', color: COLORS.primaryDark, textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    marginBottom: SIZES.sm,
  },
  rowText: { flex: 1, fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 20 },
  footer: { gap: SIZES.xs },
});
