import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

export default function AIConsentModal({ visible, providers, onAccept, onDecline }) {
  const insets = useSafeAreaInsets();
  const providerList = (providers || []).join(' ve ');

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={[styles.card, SHADOWS.large, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Yapay zeka veri paylaşımı</Text>
          <Text style={styles.body}>
            ESdiyet, size kişiselleştirilmiş öneriler ve fotoğraftan kalori tahmini sunabilmek için
            girdiğiniz bazı bilgileri (yemek fotoğrafı, kilo/hedef gibi sağlık verileri) üçüncü taraf
            yapay zeka sağlayıcılarına gönderir:
          </Text>
          <View style={styles.providerBox}>
            <Ionicons name="cloud-outline" size={16} color={COLORS.primaryDark} />
            <Text style={styles.providerText}>{providerList}</Text>
          </View>
          <Text style={styles.body}>
            Bu veriler yalnızca anlık analiz için kullanılır. Onayınızı istediğiniz zaman{' '}
            <Text style={styles.bold}>Profil → Yapay Zeka Veri Paylaşımı</Text> bölümünden geri
            çekebilirsiniz. Onay vermezseniz fotoğraftan kalori tahmini ve AI destekli öneriler
            çalışmaz.
          </Text>

          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.9}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.acceptBtnGrad}
            >
              <Text style={styles.acceptBtnText}>Kabul Ediyorum</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.declineBtn} onPress={onDecline} activeOpacity={0.7}>
            <Text style={styles.declineBtnText}>Şimdi Değil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 83, 45, 0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'left',
    marginBottom: 10,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  providerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    alignSelf: 'stretch',
  },
  providerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  acceptBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  acceptBtnGrad: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  declineBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  declineBtnText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
});
