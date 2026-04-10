import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { aiService } from '../services/aiService';
import GuestGateBanner from '../components/GuestGateBanner';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const DISCLAIMER_STORAGE_KEY = 'mealCalorieHealthDisclaimerV1';

const healthDisclaimerBody = `Bu özellik yapay zeka ile fotoğraftan tahmini kalori ve içerik özeti üretir. Sonuçlar yaklaşıktır; gerçek enerji alımı porsiyon, pişirme yöntemi ve bireysel farklılıklara göre değişir.

Bu uygulama tıbbi teşhis, tedavi veya kişiye özel beslenme planı sunmaz. Diyabet, alerji, hamilelik veya özel sağlık durumlarınız için mutlaka doktor veya diyetisyeninize danışın.

Yapay zeka hata yapabilir; sonuçları tek başına sağlık kararı için kullanmayın.`;

const getConfidenceMeta = (confidence) => {
  const value = String(confidence || '').toLowerCase();
  if (value.includes('yüksek') || value.includes('high')) {
    return {
      label: 'Yüksek güven',
      bg: '#DCFCE7',
      color: '#166534',
      icon: 'checkmark-circle',
    };
  }
  if (value.includes('düşük') || value.includes('low')) {
    return {
      label: 'Düşük güven',
      bg: '#FEF2F2',
      color: '#B91C1C',
      icon: 'alert-circle',
    };
  }
  return {
    label: 'Orta güven',
    bg: '#FEF9C3',
    color: '#854D0E',
    icon: 'information-circle',
  };
};

const getItemKcal = (item) => {
  const kcal = Number(item?.estimatedKcal ?? item?.kcal);
  return Number.isFinite(kcal) && kcal > 0 ? Math.round(kcal) : 0;
};

export default function MealCalorieScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [imageUri, setImageUri] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [disclaimerModalVisible, setDisclaimerModalVisible] = useState(false);
  const [displayedCalories, setDisplayedCalories] = useState(0);
  const previewAnim = React.useRef(new Animated.Value(0)).current;
  const resultAnim = React.useRef(new Animated.Value(0)).current;
  const analyzePressAnim = React.useRef(new Animated.Value(0)).current;
  const kcalCountAnim = React.useRef(new Animated.Value(0)).current;

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
          showToast('Kamera kullanımı için izin gerekli.', 'warning');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast('Galeri erişimi için izin gerekli.', 'warning');
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
      showToast('Görsel seçilemedi.', 'error');
    }
  };

  const analyze = async () => {
    if (!base64) {
      showToast('Önce bir fotoğraf seçin.', 'warning');
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
      showToast(e.message || 'Analiz başarısız. Tekrar deneyin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.timing(previewAnim, {
      toValue: imageUri ? 1 : 0,
      duration: imageUri ? 260 : 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [imageUri, previewAnim]);

  useEffect(() => {
    Animated.timing(resultAnim, {
      toValue: result ? 1 : 0,
      duration: result ? 300 : 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [result, resultAnim]);

  useEffect(() => {
    const target = Math.max(0, Math.round(Number(result?.estimatedCalories) || 0));
    kcalCountAnim.stopAnimation();
    kcalCountAnim.setValue(0);
    setDisplayedCalories(0);

    if (!result || !target) return;

    const listenerId = kcalCountAnim.addListener(({ value }) => {
      setDisplayedCalories(Math.round(value));
    });

    Animated.timing(kcalCountAnim, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      kcalCountAnim.removeListener(listenerId);
    };
  }, [result, kcalCountAnim]);

  const previewAnimatedStyle = {
    opacity: previewAnim,
    transform: [
      {
        translateY: previewAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };

  const resultAnimatedStyle = {
    opacity: resultAnim,
    transform: [
      {
        translateY: resultAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  const analyzeAnimatedStyle = {
    transform: [
      {
        scale: analyzePressAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.98],
        }),
      },
    ],
  };
  const confidenceMeta = getConfidenceMeta(result?.confidence);
  const maxItemKcal = result?.items?.length
    ? Math.max(...result.items.map((it) => getItemKcal(it)), 1)
    : 1;

  const animateAnalyzePress = (toValue) => {
    Animated.timing(analyzePressAnim, {
      toValue,
      duration: 130,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
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
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBlock}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="flash-outline" size={14} color={COLORS.textOnPrimary} />
              <Text style={styles.heroBadgeText}>AI destekli analiz</Text>
            </View>
            <View style={styles.heroStepPill}>
              <Text style={styles.heroStepText}>{result ? '2/2 tamamlandı' : imageUri ? '1/2 hazır' : '0/2 başla'}</Text>
            </View>
          </View>
          <Text style={styles.introTitle}>Öğününüzü görselden analiz edin</Text>
          <Text style={styles.introSub}>
            Fotoğraf yükleyin; yaklaşık kalori ve bileşen özeti alın. Sonuçlar referans amaçlıdır.
          </Text>
          <View style={styles.heroMetaRow}>
            <MetaChip icon="camera-outline" text={imageUri ? 'Fotoğraf eklendi' : 'Fotoğraf bekleniyor'} />
            <MetaChip icon="analytics-outline" text={result ? 'Analiz hazır' : 'Analiz bekleniyor'} />
          </View>
        </LinearGradient>

        <View style={styles.infoStrip}>
          <InfoStat icon="restaurant-outline" label="Öğün" value={result?.mealName ? 'Tanımlandı' : 'Bekliyor'} />
          <InfoStat icon="flame-outline" label="Kalori" value={result?.estimatedCalories ? `${result.estimatedCalories}` : '--'} />
        </View>

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
          <ActionOptionCard
            icon="images-outline"
            title="Galeriden seç"
            subtitle="Mevcut bir öğün fotoğrafı yükle"
            onPress={() => pickImage(false)}
          />
          <ActionOptionCard
            icon="camera-outline"
            title="Fotoğraf çek"
            subtitle="Kamera ile yeni fotoğraf al"
            onPress={() => pickImage(true)}
          />
        </View>

        {imageUri ? (
          <Animated.View style={[styles.previewSection, previewAnimatedStyle]}>
            <Text style={styles.sectionLabel}>Seçilen görsel</Text>
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              <TouchableOpacity style={styles.clearPhoto} onPress={reset} hitSlop={12}>
                <Ionicons name="close-circle" size={30} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.placeholderCard}>
            <Ionicons name="image-outline" size={40} color={COLORS.textLight} />
            <Text style={styles.placeholderText}>Henüz görsel yok</Text>
            <Text style={styles.placeholderHint}>Yukarıdaki seçeneklerden birini kullanın</Text>
          </View>
        )}

        <Animated.View style={analyzeAnimatedStyle}>
          <TouchableOpacity
            style={[styles.analyzeBtn, (!base64 || loading) && styles.analyzeBtnDisabled]}
            onPress={analyze}
            disabled={!base64 || loading}
            activeOpacity={0.96}
            onPressIn={() => animateAnalyzePress(1)}
            onPressOut={() => animateAnalyzePress(0)}
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
        </Animated.View>

        {result ? (
          <Animated.View style={[styles.resultCard, resultAnimatedStyle]}>
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
                <Text style={styles.kcalValue}>{displayedCalories}</Text>
                <Text style={styles.kcalUnit}>kcal</Text>
              </View>
              <View style={styles.resultMetaRow}>
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceMeta.bg }]}>
                  <Ionicons name={confidenceMeta.icon} size={14} color={confidenceMeta.color} />
                  <Text style={[styles.confidenceBadgeText, { color: confidenceMeta.color }]}>
                    {confidenceMeta.label}
                  </Text>
                </View>
                {result.provider === 'groq-vision' || result.provider === 'gemini-vision' ? (
                  <View style={styles.providerChip}>
                    <Ionicons name="hardware-chip-outline" size={14} color={COLORS.textLight} />
                    <Text style={styles.providerHint}>
                      {result.provider === 'groq-vision' ? 'Groq Vision' : 'Gemini Vision'}
                    </Text>
                  </View>
                ) : null}
              </View>
              {result.items?.length > 0 ? (
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsTitle}>Tahmini dağılım</Text>
                  {result.items.map((it, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.itemMain}>
                        <View style={styles.itemTopRow}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {it.name || 'Öğe'}
                          </Text>
                          <Text style={styles.itemKcal}>
                            {getItemKcal(it) > 0 ? `${getItemKcal(it)} kcal` : '—'}
                          </Text>
                        </View>
                        <View style={styles.itemBarTrack}>
                          <View
                            style={[
                              styles.itemBarFill,
                              {
                                width: `${Math.max(
                                  6,
                                  Math.min(100, (getItemKcal(it) / maxItemKcal) * 100)
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
              {result.notes ? <Text style={styles.notes}>{result.notes}</Text> : null}
            </View>
          </Animated.View>
        ) : null}

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

const MetaChip = ({ icon, text }) => (
  <View style={styles.metaChip}>
    <Ionicons name={icon} size={14} color={COLORS.textOnPrimary} />
    <Text style={styles.metaChipText}>{text}</Text>
  </View>
);

const InfoStat = ({ icon, label, value }) => (
  <View style={styles.infoStat}>
    <View style={styles.infoStatIcon}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
    </View>
    <View style={styles.infoStatTextWrap}>
      <Text style={styles.infoStatLabel}>{label}</Text>
      <Text style={styles.infoStatValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const ActionOptionCard = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.pickBtn} onPress={onPress} activeOpacity={0.88}>
    <View style={styles.pickIconCircle}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
    </View>
    <Text style={styles.pickBtnText}>{title}</Text>
    <Text style={styles.pickBtnSub}>{subtitle}</Text>
  </TouchableOpacity>
);

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
  heroBlock: {
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md + 2,
    marginBottom: SIZES.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  heroStepPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heroStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  introBlock: {
    marginBottom: SIZES.lg,
  },
  introTitle: {
    fontSize: SIZES.h2,
    fontWeight: '800',
    color: COLORS.textOnPrimary,
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: SIZES.sm,
  },
  introSub: {
    fontSize: SIZES.bodySmall,
    color: 'rgba(255,255,255,0.94)',
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginTop: SIZES.md,
  },
  metaChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  metaChipText: {
    fontSize: 11,
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  infoStrip: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  infoStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    ...SHADOWS.small,
  },
  infoStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    marginRight: 8,
  },
  infoStatTextWrap: {
    flex: 1,
  },
  infoStatLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
  },
  infoStatValue: {
    marginTop: 2,
    fontSize: SIZES.small,
    color: COLORS.text,
    fontWeight: '700',
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
  pickBtnSub: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 4,
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
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  confidenceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  providerHint: {
    fontSize: 12,
    color: COLORS.textLight,
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
    marginBottom: SIZES.md,
  },
  itemMain: {
    width: '100%',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SIZES.md,
    marginBottom: 6,
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
  itemBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  itemBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.primary,
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
