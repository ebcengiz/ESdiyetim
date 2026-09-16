import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE, whiteAlpha, withAlpha } from '../constants/theme';
import { bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from './AIAdviceCard';
import MedicalInfoBanner from './MedicalInfoBanner';
import { calculateBMI, getBMICategory, getBMICategoryName } from '../utils/bmi';
import { useToast } from '../contexts/ToastContext';
import { useAppError } from '../hooks/useAppError';
import {
  ScreenContainer, AppCard, AppInput, AppButton, SegmentedControl, IconBadge,
  LoadingState, SectionHeader, ActionCta,
} from './ui';

const GENDER_OPTIONS = [
  { key: 'male', label: 'Erkek', icon: 'male' },
  { key: 'female', label: 'Kadın', icon: 'female' },
];

const BMI_SCALE = [
  { label: 'Zayıf (<18.5)', color: COLORS.info },
  { label: 'Normal (18.5–24.9)', color: COLORS.success },
  { label: 'Fazla Kilolu (25–29.9)', color: COLORS.warning },
  { label: 'Obez (≥30)', color: COLORS.error },
];

export default function BMIPanel({ latestWeight }) {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { handleError } = useAppError();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [bodyInfo, setBodyInfo] = useState({ height: '', age: '', gender: 'male', weight: '' });
  const [existingId, setExistingId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [bulletRecs, setBulletRecs] = useState([]);
  const [loadingBullets, setLoadingBullets] = useState(false);
  const bmiRevealAnim = React.useRef(new Animated.Value(0)).current;
  // AI başarısız oldu mu? Focus'ta yeniden dene
  const aiFailedRef = useRef(false);

  const parsedWeight = () => {
    const w = parseFloat(bodyInfo.weight);
    return Number.isFinite(w) && w > 0 ? w : null;
  };

  const bmi = useMemo(
    () => calculateBMI(bodyInfo.height, bodyInfo.weight),
    [bodyInfo.height, bodyInfo.weight]
  );

  const bmiCategory = useMemo(() => getBMICategory(bmi), [bmi]);

  useEffect(() => { loadBodyInfo(); }, []);

  // Ekran her odağa geldiğinde önceki çağrı başarısız olduysa yeniden dene
  useFocusEffect(useCallback(() => {
    if (aiFailedRef.current && !loadingAdvice && !loadingBullets) {
      const payload = buildAIParams();
      if (payload) {
        aiFailedRef.current = false;
        // İki çağrıyı art arda başlat (rate limit için 300ms arayla)
        fetchAIAdvice(payload);
        setTimeout(() => fetchBulletRecommendations(payload), 300);
      }
    }
  }, [loadingAdvice, loadingBullets]));

  const loadBodyInfo = async () => {
    try {
      const data = await bodyInfoService.getLatest();
      if (data) {
        const h = data.height?.toString() || '';
        const a = data.age?.toString() || '';
        const g = data.gender || 'male';
        const w = data.weight != null ? String(data.weight) : latestWeight != null ? String(latestWeight) : '';
        setBodyInfo({ height: h, age: a, gender: g, weight: w });
        setExistingId(data.id);
        setIsSaved(true);
        const pw = parseFloat(w);
        if (h && a && Number.isFinite(pw) && pw > 0) {
          const payload = { height: parseFloat(h), age: parseInt(a, 10), gender: g, weight: pw };
          fetchAIAdvice(payload);
          fetchBulletRecommendations(payload);
        }
      } else {
        setBodyInfo({ height: '', age: '', gender: 'male', weight: latestWeight != null ? String(latestWeight) : '' });
        setExistingId(null);
        setIsSaved(false);
      }
    } catch (e) {
      handleError(e, { context: 'bmi.load', onRetry: loadBodyInfo });
    } finally {
      setLoading(false);
    }
  };

  const buildAIParams = (params) => {
    const pw = parsedWeight();
    const p = params || { height: parseFloat(bodyInfo.height), weight: pw, age: parseInt(bodyInfo.age, 10), gender: bodyInfo.gender };
    if (!params && (!pw || !bodyInfo.height)) return null;
    const currentBMI = calculateBMI(p.height?.toString(), String(p.weight));
    const cat = getBMICategoryName(currentBMI);
    if (!currentBMI || !cat || p.weight == null || Number(p.weight) <= 0) return null;
    return { bmi: parseFloat(currentBMI), category: cat, ...p };
  };

  const fetchAIAdvice = async (params) => {
    const payload = buildAIParams(params);
    if (!payload) return;
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const result = await aiService.getBMIAdvice(payload);
      setAiAdvice(result.advice || '');
      aiFailedRef.current = false;
    } catch (e) {
      aiFailedRef.current = true;
      handleError(e, { context: 'bmi.advice', silent: true });
      setAiAdvice('');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const fetchBulletRecommendations = async (params) => {
    const payload = buildAIParams(params);
    if (!payload) return;
    setLoadingBullets(true);
    setBulletRecs([]);
    try {
      const result = await aiService.getBMIBulletRecommendations(payload);
      setBulletRecs(result.bullets || []);
      aiFailedRef.current = false;
    } catch (e) {
      aiFailedRef.current = true;
      handleError(e, { context: 'bmi.bullets', silent: true });
      setBulletRecs(aiService.getFallbackBMIBullets(payload.category));
    } finally {
      setLoadingBullets(false);
    }
  };

  const refreshBMIInsights = () => { fetchAIAdvice(); fetchBulletRecommendations(); };

  useEffect(() => {
    if (!(isSaved && bmi && bmiCategory)) return;
    bmiRevealAnim.setValue(0);
    Animated.timing(bmiRevealAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isSaved, bmi, bmiCategory, bmiRevealAnim]);

  const setField = (field, value) => {
    setBodyInfo((b) => ({ ...b, [field]: value }));
    setIsSaved(false);
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    const h = parseFloat(bodyInfo.height);
    const a = parseInt(bodyInfo.age, 10);
    const w = parsedWeight();
    if (!bodyInfo.height) errs.height = 'Boy gerekli.';
    else if (!Number.isFinite(h) || h < 100 || h > 250) errs.height = '100–250 cm arasında bir değer girin.';
    if (!bodyInfo.age) errs.age = 'Yaş gerekli.';
    else if (!Number.isFinite(a) || a < 10 || a > 120) errs.age = '10–120 arasında bir yaş girin.';
    if (!w) errs.weight = 'Geçerli bir kilo girin.';
    else if (w > 500) errs.weight = 'Kilo değeri çok yüksek.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveBodyInfo = async () => {
    if (!validate()) return;
    const w = parsedWeight();
    setSaving(true);
    try {
      const data = { height: parseFloat(bodyInfo.height), weight: w, age: parseInt(bodyInfo.age, 10), gender: bodyInfo.gender };
      if (existingId) {
        await bodyInfoService.update(existingId, data);
      } else {
        const newInfo = await bodyInfoService.create(data);
        setExistingId(newInfo.id);
      }
      setIsSaved(true);
      showToast('Bilgileriniz kaydedildi. Öneriler hazırlanıyor…', 'success');
      fetchAIAdvice(data);
      fetchBulletRecommendations(data);
    } catch (e) {
      handleError(e, { context: 'bmi.save', onRetry: saveBodyInfo });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Bilgiler yükleniyor…" />;
  }

  const bmiRevealStyle = {
    opacity: bmiRevealAnim,
    transform: [
      {
        translateY: bmiRevealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        scale: bmiRevealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1],
        }),
      },
    ],
  };

  const hasResult = isSaved && bmi && bmiCategory;
  const busy = loadingBullets || loadingAdvice;

  return (
    <ScreenContainer tab edges={[]} keyboard>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroTop}>
          <View style={s.heroBadge}>
            <Ionicons name="body-outline" size={14} color={COLORS.textOnPrimary} />
            <Text style={s.heroBadgeText} maxFontSizeMultiplier={MAX_FONT_SCALE}>VKİ Analizi</Text>
          </View>
          <Text style={s.heroDate} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={s.heroTitle} accessibilityRole="header" maxFontSizeMultiplier={MAX_FONT_SCALE}>Vücut Kitle İndeksi</Text>
        <Text style={s.heroSub} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Temel bilgilerini gir, VKİ sonucunu ve kişisel önerileri anında gör.
        </Text>
      </LinearGradient>

      <View style={s.infoBox} accessibilityRole="text">
        <Ionicons name="information-circle" size={16} color={COLORS.infoText} />
        <Text style={s.infoText} maxFontSizeMultiplier={MAX_FONT_SCALE}>
          Bu kilo VKİ ve profil bilginiz için saklanır; tarihli ölçüm eklemek için "Kilo Takibi" sekmesini kullanın.
        </Text>
      </View>

      <AppCard title="Temel Bilgiler" icon="person-outline">
        <AppInput
          label="Boy"
          icon="resize-outline"
          unit="cm"
          value={bodyInfo.height}
          onChangeText={(t) => setField('height', t)}
          error={errors.height}
          placeholder="175"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
        <AppInput
          label="Kilo"
          icon="fitness-outline"
          unit="kg"
          value={bodyInfo.weight}
          onChangeText={(t) => setField('weight', t)}
          error={errors.weight}
          placeholder="72.5"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
        <AppInput
          label="Yaş"
          icon="calendar-outline"
          value={bodyInfo.age}
          onChangeText={(t) => setField('age', t)}
          error={errors.age}
          placeholder="30"
          keyboardType="number-pad"
          returnKeyType="done"
        />
        <Text style={s.fieldLabel} maxFontSizeMultiplier={MAX_FONT_SCALE}>Cinsiyet</Text>
        <SegmentedControl options={GENDER_OPTIONS} value={bodyInfo.gender} onChange={(g) => setField('gender', g)} tone="surface" />
      </AppCard>

      <AppButton title={isSaved ? 'Güncelle' : 'Hesapla ve Kaydet'} icon="calculator-outline" size="lg" fullWidth onPress={saveBodyInfo} loading={saving} />

      {hasResult && (
        <>
          <SectionHeader title="Sonuç" subtitle="Vücut Kitle İndeksi (VKİ)" style={s.sectionHeader} />
          <Animated.View style={[s.bmiCard, bmiRevealStyle]} accessibilityLabel={`VKİ ${bmi}, ${bmiCategory.name}`}>
            <LinearGradient colors={[bmiCategory.color, withAlpha(bmiCategory.color, 0.8)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bmiGradient}>
              <IconBadge name={bmiCategory.icon} tone="glass" size={72} iconSize={38} style={s.bmiIcon} />
              <Text style={s.bmiVal} maxFontSizeMultiplier={MAX_FONT_SCALE}>{bmi}</Text>
              <Text style={s.bmiCat} maxFontSizeMultiplier={MAX_FONT_SCALE}>{bmiCategory.name}</Text>
            </LinearGradient>
          </Animated.View>

          <AppCard variant="flat" padding={SIZES.md}>
            {BMI_SCALE.map(({ label, color }) => (
              <View key={label} style={s.scaleItem}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={s.scaleText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{label}</Text>
              </View>
            ))}
          </AppCard>

          {(loadingAdvice || aiAdvice) && (
            <AIAdviceCard
              visible
              loading={loadingAdvice}
              advice={aiAdvice}
              onRefresh={refreshBMIInsights}
              gradientColors={[bmiCategory.color, withAlpha(bmiCategory.color, 0.73)]}
              iconTint={bmiCategory.color}
              subtitle="VKİ ve profilinize göre kişiselleştirilir"
            />
          )}

          <SectionHeader
            title="Öneriler"
            subtitle="Yapay zeka ile kısa öneriler (tıbbi teşhis değildir)"
            actionLabel={busy ? undefined : 'Yenile'}
            onAction={busy ? undefined : refreshBMIInsights}
            style={s.sectionHeader}
          />
          {loadingBullets ? (
            <LoadingState variant="inline" label="Öneriler hazırlanıyor…" />
          ) : (
            bulletRecs.map((rec, i) => (
              <View key={i} style={s.recCard}>
                <IconBadge name="sparkles" color={bmiCategory.color} size={30} iconSize={15} />
                <Text style={s.recText} maxFontSizeMultiplier={MAX_FONT_SCALE}>{rec}</Text>
              </View>
            ))
          )}
        </>
      )}

      <MedicalInfoBanner title="Tıbbi Uyarı" style={s.disclaimer}>
        Bu uygulama kişisel takip ve genel bilgilendirme amaçlıdır. VKİ hesaplamaları ve öneriler tıbbi
        teşhis yerine geçmez. Sağlığınız için bir doktor veya diyetisyene danışınız.
      </MedicalInfoBanner>

      <ActionCta
        icon="library-outline"
        title="Bilimsel kaynaklar ve uyarılar"
        subtitle="Tüm liste"
        onPress={() => navigation.navigate('HealthSourcesInfo')}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginBottom: SIZES.md },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: SIZES.radiusFull, backgroundColor: whiteAlpha(0.2) },
  heroBadgeText: { color: COLORS.textOnPrimary, fontSize: SIZES.tiny, fontWeight: '700' },
  heroDate: { color: whiteAlpha(0.9), fontSize: SIZES.tiny, fontWeight: '600' },
  heroTitle: { color: COLORS.textOnPrimary, fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { color: whiteAlpha(0.92), fontSize: SIZES.tiny, marginTop: 4, lineHeight: 18 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.infoBg, borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: withAlpha(COLORS.info, 0.25) },
  infoText: { flex: 1, fontSize: SIZES.small, color: COLORS.infoText, lineHeight: 18 },
  fieldLabel: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.2, marginBottom: 6, marginLeft: 4 },
  sectionHeader: { marginTop: SIZES.lg },
  bmiCard: { borderRadius: SIZES.radiusLarge, overflow: 'hidden', marginBottom: SIZES.md, ...SHADOWS.medium },
  bmiGradient: { padding: SIZES.xl, alignItems: 'center' },
  bmiIcon: { marginBottom: SIZES.md },
  bmiVal: { fontSize: 44, fontWeight: '700', color: COLORS.textOnPrimary },
  bmiCat: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textOnPrimary },
  scaleItem: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingVertical: 4 },
  dot: { width: 11, height: 11, borderRadius: 6 },
  scaleText: { fontSize: SIZES.small, color: COLORS.textSecondary },
  recCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginBottom: SIZES.sm, gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  recText: { flex: 1, fontSize: SIZES.body, color: COLORS.text, lineHeight: 22 },
  disclaimer: { marginTop: SIZES.lg },
});
