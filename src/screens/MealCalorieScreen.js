import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, HIT_SLOP, MAX_FONT_SCALE, whiteAlpha } from '../constants/theme';
import { aiService } from '../services/aiService';
import GuestGateBanner from '../components/GuestGateBanner';
import MedicalInfoBanner from '../components/MedicalInfoBanner';
import MealResultCard from '../components/mealCalorie/MealResultCard';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import { useResponsive } from '../hooks/useResponsive';
import { AppError, ERROR_CODES } from '../services/errors';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAIConsent } from '../contexts/AIConsentContext';
import { useAds } from '../contexts/AdsContext';
import LimitReachedSheet from '../components/ads/LimitReachedSheet';
import { bypassPaywall } from '../utils/environment';
import { prepareImageForAI } from '../utils/image';
import { ScreenContainer, AppButton, BottomSheet, IconBadge, LoadingState, EmptyState } from '../components/ui';

const DISCLAIMER_STORAGE_KEY = 'mealCalorieHealthDisclaimerV1';

const healthDisclaimerBody = `Bu özellik yapay zeka ile fotoğraftan tahmini kalori ve içerik özeti üretir. Sonuçlar yaklaşıktır; gerçek enerji alımı porsiyon, pişirme yöntemi ve bireysel farklılıklara göre değişir.

Bu uygulama tıbbi teşhis, tedavi veya kişiye özel beslenme planı sunmaz. Diyabet, alerji, hamilelik veya özel sağlık durumlarınız için mutlaka doktor veya diyetisyeninize danışın.

Yapay zeka hata yapabilir; sonuçları tek başına sağlık kararı için kullanmayın.`;

/** Galeri / Kamera seçenek kartı */
function PickOption({ icon, title, subtitle, onPress, style }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pick, pressed && styles.pressed, style]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <IconBadge name={icon} size={44} />
      <Text style={styles.pickTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
      <Text style={styles.pickSub} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{subtitle}</Text>
    </Pressable>
  );
}

export default function MealCalorieScreen({ navigation }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const { columnWidth } = useResponsive();
  const { isSubscribed, canUsePhotoToday, dailyLimit, freeDailyLimit, dailyPhotoUsed, incrementDailyPhotoCredit } = useSubscription();
  const { requestConsentPrompt } = useAIConsent();
  const { showInterstitialIfEligible } = useAds();

  const [imageUri, setImageUri] = useState(null);
  const [base64, setBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [limitSheetVisible, setLimitSheetVisible] = useState(false);
  const [displayedCalories, setDisplayedCalories] = useState(0);

  const previewAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const kcalCountAnim = useRef(new Animated.Value(0)).current;

  // İlk kullanımda sağlık/AI bilgilendirmesi (App Store health policy)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    AsyncStorage.getItem(DISCLAIMER_STORAGE_KEY)
      .then((v) => { if (!cancelled && v !== '1') setDisclaimerVisible(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const acceptDisclaimer = useCallback(async () => {
    try { await AsyncStorage.setItem(DISCLAIMER_STORAGE_KEY, '1'); } catch { /* ignore */ }
    setDisclaimerVisible(false);
  }, []);

  const reset = useCallback(() => {
    setImageUri(null);
    setBase64(null);
    setMimeType('image/jpeg');
    setResult(null);
  }, []);

  const pickImage = async (useCamera) => {
    try {
      const perm = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        handleError(new AppError(useCamera ? ERROR_CODES.PERMISSION_CAMERA : ERROR_CODES.PERMISSION_GALLERY), { context: 'mealCalorie.permission' });
        return;
      }
      const options = { mediaTypes: 'images', allowsEditing: true, aspect: [4, 3], quality: 0.62, base64: true };
      const res = useCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const prepared = await prepareImageForAI(asset);
      setImageUri(asset.uri);
      setBase64(prepared.base64);
      setMimeType(prepared.mimeType);
      setResult(null);
    } catch (e) {
      handleError(e, { context: 'mealCalorie.pick', fallbackCode: ERROR_CODES.AI_IMAGE_INVALID });
    }
  };

  const analyze = async () => {
    if (!base64) { showToast('Önce bir fotoğraf seçin.', 'warning'); return; }

    if (!bypassPaywall && !canUsePhotoToday) {
      if (!isSubscribed) {
        // Ücretsiz: ödüllü reklam (+1 hak) ya da Premium seçeneği sunan sheet
        setLimitSheetVisible(true);
      } else {
        showToast(`Günlük ${dailyLimit} analiz hakkınızı kullandınız. Yarın tekrar deneyebilirsiniz.`, 'warning');
      }
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      // AI isteği önce gider; ücretsiz kullanıcıda geçiş reklamı (günde en fazla 1)
      // bekleme süresinde gösterilir — sonuç okunurken kesinti olmaz.
      const request = aiService.getMealCaloriesFromImage({ base64, mimeType });
      request.catch(() => {}); // reklam sırasında reddedilirse "unhandled" uyarısı olmasın; aşağıda await ediliyor
      await showInterstitialIfEligible();
      const data = await request;
      setResult(data);
      if (!bypassPaywall) await incrementDailyPhotoCredit();
    } catch (e) {
      const appErr = handleError(e, { context: 'mealCalorie.analyze', silentCodes: [ERROR_CODES.AI_CONSENT_REQUIRED], onRetry: analyze });
      if (appErr.code === ERROR_CODES.AI_CONSENT_REQUIRED) {
        showToast('Fotoğraf analizi için yapay zeka veri paylaşımı onayı gerekiyor.', 'warning');
        requestConsentPrompt();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.timing(previewAnim, { toValue: imageUri ? 1 : 0, duration: imageUri ? 260 : 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [imageUri, previewAnim]);

  useEffect(() => {
    Animated.timing(resultAnim, { toValue: result ? 1 : 0, duration: result ? 300 : 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [result, resultAnim]);

  // Kalori sayacı animasyonu
  useEffect(() => {
    const target = Math.max(0, Math.round(Number(result?.estimatedCalories) || 0));
    kcalCountAnim.stopAnimation();
    kcalCountAnim.setValue(0);
    setDisplayedCalories(0);
    if (!result || !target) return undefined;
    const listenerId = kcalCountAnim.addListener(({ value }) => setDisplayedCalories(Math.round(value)));
    Animated.timing(kcalCountAnim, { toValue: target, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => kcalCountAnim.removeListener(listenerId);
  }, [result, kcalCountAnim]);

  const fadeUp = (anim, dy) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
  });

  if (!user) {
    return (
      <ScreenContainer edges={[]}>
        <GuestGateBanner
          navigation={navigation}
          message="Fotoğraftan kalori tahmini hesabınıza bağlıdır. Giriş yaparak veya kayıt olarak kullanabilirsiniz."
        />
      </ScreenContainer>
    );
  }

  const stepLabel = result ? '2/2 tamamlandı' : imageUri ? '1/2 hazır' : 'Başla';
  const pickWidth = columnWidth(2);
  const quotaLabel = bypassPaywall ? null : `Bugün ${dailyPhotoUsed}/${dailyLimit} analiz`;

  return (
    <>
      <ScreenContainer edges={[]}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <Ionicons name="flash-outline" size={14} color={COLORS.textOnPrimary} />
              <Text style={styles.heroBadgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>AI destekli analiz</Text>
            </View>
            <View style={styles.stepPill}>
              <Text style={styles.stepText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{stepLabel}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>Öğününüzü görselden analiz edin</Text>
          <Text style={styles.heroSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Fotoğraf yükleyin; yaklaşık kalori ve bileşen özeti alın. Sonuçlar referans amaçlıdır.
          </Text>
          {!!quotaLabel && (
            <View style={styles.quotaRow}>
              <Ionicons name="camera-outline" size={13} color={whiteAlpha(0.9)} />
              <Text style={styles.quotaText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{quotaLabel}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.pickRow}>
          <PickOption icon="images-outline" title="Galeriden seç" subtitle="Mevcut bir öğün fotoğrafı yükle" onPress={() => pickImage(false)} style={{ width: pickWidth }} />
          <PickOption icon="camera-outline" title="Fotoğraf çek" subtitle="Kamera ile yeni fotoğraf al" onPress={() => pickImage(true)} style={{ width: pickWidth }} />
        </View>

        {imageUri ? (
          <Animated.View style={[styles.previewWrap, fadeUp(previewAnim, 8)]}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" accessibilityLabel="Seçilen öğün fotoğrafı" />
            <Pressable onPress={reset} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır" style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </Pressable>
          </Animated.View>
        ) : (
          <EmptyState compact icon="image-outline" iconColor={COLORS.textLight} title="Henüz görsel yok" message="Yukarıdaki seçeneklerden biriyle fotoğraf ekleyin." style={styles.placeholder} />
        )}

        <AppButton
          title={loading ? 'Analiz ediliyor…' : 'Tahmini kaloriyi hesapla'}
          icon="sparkles"
          size="lg"
          fullWidth
          onPress={analyze}
          loading={loading}
          disabled={!base64}
          style={styles.analyzeBtn}
        />

        {loading && !result ? <LoadingState variant="card" /> : null}
        {result ? <MealResultCard result={result} displayedCalories={displayedCalories} animatedStyle={fadeUp(resultAnim, 12)} /> : null}

        <MedicalInfoBanner title="Önemli uyarı">
          Tahminler tıbbi veya profesyonel beslenme tavsiyesi değildir. Özel sağlık durumlarınız için uzmanınıza
          danışın. Yapay zeka yanıtları hatalı olabilir.
        </MedicalInfoBanner>
        <AppButton title="Tam bilgilendirme metnini göster" iconRight="chevron-forward" variant="ghost" size="sm" onPress={() => setDisclaimerVisible(true)} style={styles.fullTextBtn} haptic={false} />

        <View style={styles.footerLegal}>
          <Ionicons name="document-text-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.footerLegalText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            Apple bu uygulamanın sağlık içeriğini doğrulamaz. Tahminler bilgi amaçlıdır.
          </Text>
        </View>
      </ScreenContainer>

      <BottomSheet
        visible={disclaimerVisible}
        onClose={acceptDisclaimer}
        title="Sağlık ve yapay zeka bilgilendirmesi"
        dismissOnBackdrop={false}
        showClose={false}
        keyboard={false}
        footer={<AppButton title="Anladım, devam et" icon="checkmark-circle-outline" fullWidth onPress={acceptDisclaimer} />}
      >
        <IconBadge name="shield-checkmark" color={COLORS.warning} size={56} style={styles.disclaimerIcon} />
        <Text style={styles.disclaimerBody} maxFontSizeMultiplier={MAX_FONT_SCALE}>{healthDisclaimerBody}</Text>
        <Text style={styles.disclaimerSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Devam ederek bu bilgilendirmeyi okuduğunuzu ve anladığınızı kabul etmiş olursunuz.
        </Text>
      </BottomSheet>

      {/* Ücretsiz plan: günlük hak dolunca ödüllü reklam / Premium seçeneği */}
      <LimitReachedSheet
        visible={limitSheetVisible}
        onClose={() => setLimitSheetVisible(false)}
        kind="photo"
        limit={freeDailyLimit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  hero: { borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md, ...SHADOWS.medium },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: whiteAlpha(0.2), paddingHorizontal: 10, paddingVertical: 6, borderRadius: SIZES.radiusFull },
  heroBadgeText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '700' },
  stepPill: { backgroundColor: whiteAlpha(0.9), paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusFull },
  stepText: { color: COLORS.primaryDark, fontSize: SIZES.tiny, fontWeight: '800' },
  heroTitle: { color: COLORS.textOnPrimary, fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { color: whiteAlpha(0.92), fontSize: SIZES.small, marginTop: 4, lineHeight: 19 },
  quotaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: SIZES.sm + 2 },
  quotaText: { color: whiteAlpha(0.9), fontSize: SIZES.tiny, fontWeight: '600' },
  pickRow: { flexDirection: 'row', gap: SIZES.md, marginBottom: SIZES.md },
  pick: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    gap: 6,
    ...SHADOWS.small,
  },
  pickTitle: { fontSize: SIZES.bodySmall, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  pickSub: { fontSize: SIZES.tiny, color: COLORS.textSecondary, lineHeight: 16 },
  previewWrap: { borderRadius: SIZES.radiusLarge, overflow: 'hidden', marginBottom: SIZES.md, ...SHADOWS.medium },
  preview: { width: '100%', aspectRatio: 4 / 3, backgroundColor: COLORS.neutral100 },
  clearBtn: { position: 'absolute', top: SIZES.sm, right: SIZES.sm, width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.neutral900, opacity: 0.85, alignItems: 'center', justifyContent: 'center' },
  placeholder: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginBottom: SIZES.md },
  analyzeBtn: { marginBottom: SIZES.md },
  fullTextBtn: { alignSelf: 'center', marginTop: -SIZES.sm, marginBottom: SIZES.sm },
  footerLegal: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingHorizontal: SIZES.md },
  footerLegalText: { flex: 1, fontSize: SIZES.tiny, color: COLORS.textLight, textAlign: 'center' },
  disclaimerIcon: { alignSelf: 'center', marginBottom: SIZES.md },
  disclaimerBody: { fontSize: SIZES.bodySmall, color: COLORS.text, lineHeight: 22 },
  disclaimerSub: { fontSize: SIZES.tiny, color: COLORS.textSecondary, marginTop: SIZES.md, lineHeight: 17 },
});
