import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { aiService } from '../services/aiService';
import HealthSourcesCard from '../components/HealthSourcesCard';
import GuestGateBanner from '../components/GuestGateBanner';
import { useAuth } from '../contexts/AuthContext';

const DISCLAIMER_STORAGE_KEY = 'mealCalorieHealthDisclaimerV1';

const healthDisclaimerBody = `Bu özellik yapay zeka ile fotoğraftan tahmini kalori ve içerik özeti üretir. Sonuçlar yaklaşıktır; gerçek enerji alımı porsiyon, pişirme yöntemi ve bireysel farklılıklara göre değişir.

Bu uygulama tıbbi teşhis, tedavi veya kişiye özel beslenme planı sunmaz. Diyabet, alerji, hamilelik veya özel sağlık durumlarınız için mutlaka doktor veya diyetisyeninize danışın.

Yapay zeka hata yapabilir; sonuçları tek başına sağlık kararı için kullanmayın.`;

export default function MealCalorieScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [disclaimerModalVisible, setDisclaimerModalVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(DISCLAIMER_STORAGE_KEY);
        if (!cancelled && v !== '1') setDisclaimerModalVisible(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const acceptDisclaimer = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DISCLAIMER_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDisclaimerModalVisible(false);
  }, []);

  const reset = useCallback(() => {
    setImageUri(null);
    setBase64(null);
    setMimeType('image/jpeg');
    setResult(null);
  }, []);

  const pickImage = async (useCamera) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin gerekli', 'Kamera kullanımına izin verin.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('İzin gerekli', 'Galeri erişimine izin verin.');
          return;
        }
      }

      const options = {
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.62,
        base64: true,
      };

      const res = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      setImageUri(asset.uri);
      setBase64(asset.base64 || null);
      setMimeType(asset.mimeType || 'image/jpeg');
      setResult(null);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Görsel seçilemedi.');
    }
  };

  const analyze = async () => {
    if (!base64) {
      Alert.alert('Görsel yok', 'Önce bir fotoğraf seçin.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await aiService.getMealCaloriesFromImage({
        base64,
        mimeType,
      });
      setResult(data);
    } catch (e) {
      Alert.alert('Analiz başarısız', e.message || 'Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SIZES.containerPadding,
            paddingBottom: Math.max(insets.bottom, 24),
            paddingTop: SIZES.md,
          }}
        >
          <GuestGateBanner
            navigation={navigation}
            message="Fotoğraftan kalori tahmini hesabınıza bağlıdır. Giriş yaparak veya kayıt olarak kullanabilirsiniz."
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Modal
        visible={disclaimerModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="shield-checkmark" size={28} color={COLORS.warning} />
            </View>
            <Text style={styles.modalTitle}>Sağlık ve yapay zeka bilgilendirmesi</Text>
            <Text style={styles.modalBody}>{healthDisclaimerBody}</Text>
            <Text style={styles.modalSub}>
              Devam ederek bu bilgilendirmeyi okuduğunuzu ve anladığınızı kabul etmiş olursunuz.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={acceptDisclaimer} activeOpacity={0.9}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalBtnGrad}
              >
                <Text style={styles.modalBtnText}>Anladım, devam et</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, 28) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <Text style={styles.introTitle}>Öğününüzü görselden analiz edin</Text>
          <Text style={styles.introSub}>
            Fotoğraf yükleyin; yaklaşık kalori ve bileşen özeti alın. Sonuçlar referans amaçlıdır.
          </Text>
        </View>

        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={22} color="#B45309" />
            <Text style={styles.warningTitle}>Önemli uyarı</Text>
          </View>
          <Text style={styles.warningText}>
            Tahminler tıbbi veya profesyonel beslenme tavsiyesi değildir. Özel sağlık durumlarınız
            için uzmanınıza danışın. Yapay zeka yanıtları hatalı olabilir.
          </Text>
          <Pressable
            onPress={() => setDisclaimerModalVisible(true)}
            style={styles.warningLink}
            hitSlop={8}
          >
            <Text style={styles.warningLinkText}>Tam metni göster</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </Pressable>
        </View>

        <HealthSourcesCard variant="meal" style={{ marginBottom: SIZES.lg }} />

        <View style={styles.stepsRow}>
          <View style={styles.stepChip}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNumDigit}>1</Text>
            </View>
            <Text style={styles.stepLabel}>Fotoğraf</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepChip}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNumDigit}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Analiz</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickImage(false)}
            activeOpacity={0.88}
          >
            <View style={styles.pickIconCircle}>
              <Ionicons name="images-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.pickBtnText}>Galeriden seç</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => pickImage(true)}
            activeOpacity={0.88}
          >
            <View style={styles.pickIconCircle}>
              <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.pickBtnText}>Fotoğraf çek</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <View style={styles.previewSection}>
            <Text style={styles.sectionLabel}>Seçilen görsel</Text>
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              <TouchableOpacity style={styles.clearPhoto} onPress={reset} hitSlop={12}>
                <Ionicons name="close-circle" size={30} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderCard}>
            <Ionicons name="image-outline" size={40} color={COLORS.textLight} />
            <Text style={styles.placeholderText}>Henüz görsel yok</Text>
            <Text style={styles.placeholderHint}>Yukarıdaki seçeneklerden birini kullanın</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.analyzeBtn, (!base64 || loading) && styles.analyzeBtnDisabled]}
          onPress={analyze}
          disabled={!base64 || loading}
          activeOpacity={0.92}
        >
          <LinearGradient
            colors={
              !base64 || loading
                ? [COLORS.disabled, COLORS.disabled]
                : [COLORS.primary, COLORS.primaryDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.analyzeGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={22} color={COLORS.textOnPrimary} />
                <Text style={styles.analyzeText}>Tahmini kaloriyi hesapla</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {result ? (
          <View style={styles.resultCard}>
            <LinearGradient
              colors={['#F0FDF4', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultHeaderBand}
            >
              <Text style={styles.resultKicker}>Tahmini sonuç</Text>
              <Text style={styles.resultMeal} numberOfLines={3}>
                {result.mealName}
              </Text>
            </LinearGradient>
            <View style={styles.resultBody}>
              <View style={styles.kcalRow}>
                <Text style={styles.kcalValue}>{result.estimatedCalories}</Text>
                <Text style={styles.kcalUnit}>kcal</Text>
              </View>
              <Text style={styles.confidence}>Güven düzeyi: {result.confidence}</Text>
              {result.provider === 'groq-vision' || result.provider === 'gemini-vision' ? (
                <Text style={styles.providerHint}>
                  {result.provider === 'groq-vision' ? 'Analiz: Groq' : 'Analiz: Google Gemini'}
                </Text>
              ) : null}
              {result.items?.length > 0 ? (
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsTitle}>Tahmini dağılım</Text>
                  {result.items.map((it, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {it.name || 'Öğe'}
                      </Text>
                      <Text style={styles.itemKcal}>
                        {(() => {
                          const k = Number(it.estimatedKcal ?? it.kcal);
                          return Number.isFinite(k) ? `${Math.round(k)} kcal` : '—';
                        })()}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {result.notes ? <Text style={styles.notes}>{result.notes}</Text> : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footerLegal}>
          <Ionicons name="document-text-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.footerLegalText}>
            Apple bu uygulamanın sağlık içeriğini doğrulamaz. Tahminler bilgi amaçlıdır.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: SIZES.containerPadding,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.lg,
    ...Platform.select({
      ios: SHADOWS.large,
      android: { elevation: 12 },
    }),
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  modalTitle: {
    fontSize: SIZES.h4,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
    marginBottom: SIZES.sm,
  },
  modalBody: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  modalSub: {
    fontSize: SIZES.tiny,
    color: COLORS.textLight,
    lineHeight: 18,
    marginBottom: SIZES.lg,
  },
  modalBtn: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
  },
  modalBtnGrad: {
    paddingVertical: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: SIZES.containerPadding,
    paddingTop: SIZES.md,
  },
  introBlock: {
    marginBottom: SIZES.lg,
  },
  introTitle: {
    fontSize: SIZES.h2,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: SIZES.sm,
  },
  introSub: {
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md + 2,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...SHADOWS.small,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  warningTitle: {
    fontSize: SIZES.h5,
    fontWeight: '800',
    color: '#92400E',
  },
  warningText: {
    fontSize: SIZES.small,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: SIZES.sm,
  },
  warningLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  warningLinkText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    paddingHorizontal: SIZES.xs,
  },
  stepChip: {
    alignItems: 'center',
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumDigit: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  stepLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SIZES.sm,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: SIZES.md,
    marginBottom: SIZES.lg,
  },
  pickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.md + 2,
    paddingHorizontal: SIZES.sm,
    borderRadius: SIZES.radiusLarge,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  pickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.sm,
  },
  pickBtnText: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: SIZES.tiny,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: SIZES.sm,
  },
  previewSection: {
    marginBottom: SIZES.lg,
  },
  previewWrap: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceAlt,
    ...SHADOWS.medium,
  },
  preview: {
    width: '100%',
    height: 240,
  },
  clearPhoto: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
  placeholderCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxl + 8,
    marginBottom: SIZES.lg,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  placeholderText: {
    marginTop: SIZES.sm,
    fontSize: SIZES.bodySmall,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  placeholderHint: {
    marginTop: 4,
    fontSize: SIZES.tiny,
    color: COLORS.textLight,
  },
  analyzeBtn: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    marginBottom: SIZES.lg,
    ...SHADOWS.medium,
  },
  analyzeBtnDisabled: {
    opacity: 0.88,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    paddingVertical: SIZES.md + 4,
  },
  analyzeText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 4 },
    }),
  },
  resultHeaderBand: {
    padding: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  resultKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginBottom: SIZES.xs,
  },
  resultMeal: {
    fontSize: SIZES.h4,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  resultBody: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.lg,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: SIZES.xs,
  },
  kcalValue: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1.5,
  },
  kcalUnit: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confidence: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  providerHint: {
    fontSize: SIZES.tiny,
    color: COLORS.textLight,
    marginBottom: SIZES.md,
  },
  itemsBox: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SIZES.md,
  },
  itemsTitle: {
    fontSize: SIZES.small,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SIZES.md,
    marginBottom: SIZES.sm,
  },
  itemName: {
    flex: 1,
    fontSize: SIZES.bodySmall,
    color: COLORS.textSecondary,
  },
  itemKcal: {
    fontSize: SIZES.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  notes: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SIZES.sm,
    fontStyle: 'italic',
  },
  footerLegal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
    marginBottom: SIZES.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerLegalText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 16,
  },
});
