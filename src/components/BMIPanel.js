import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Linking, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from './AIAdviceCard';
import { calculateBMI, getBMICategory, getBMICategoryName } from '../utils/bmi';
import { useToast } from '../contexts/ToastContext';

export default function BMIPanel({ latestWeight }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bodyInfo, setBodyInfo] = useState({ height: '', age: '', gender: 'male', weight: '' });
  const [existingId, setExistingId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [bulletRecs, setBulletRecs] = useState([]);
  const [loadingBullets, setLoadingBullets] = useState(false);
  const bmiRevealAnim = React.useRef(new Animated.Value(0)).current;

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
      console.error(e);
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
    } catch {
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu.');
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
    } catch {
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

  const saveBodyInfo = async () => {
    if (!bodyInfo.height || !bodyInfo.age) { showToast('Lütfen boy ve yaş alanlarını doldurun.', 'warning'); return; }
    const w = parsedWeight();
    if (!w) { showToast('Lütfen geçerli bir kilo değeri girin.', 'warning'); return; }
    try {
      const data = { height: parseFloat(bodyInfo.height), weight: w, age: parseInt(bodyInfo.age, 10), gender: bodyInfo.gender };
      if (existingId) {
        await bodyInfoService.update(existingId, data);
        setIsSaved(true);
      } else {
        const newInfo = await bodyInfoService.create(data);
        setExistingId(newInfo.id);
        setIsSaved(true);
      }
      showToast('Bilgileriniz güncellendi. AI tavsiyesi hazırlanıyor...', 'success');
      fetchAIAdvice(data);
      fetchBulletRecommendations(data);
    } catch {
      showToast('Vücut bilgileri kaydedilirken bir hata oluştu.', 'error');
    }
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
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

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        <View style={s.heroTopRow}>
          <View style={s.heroBadge}>
            <Ionicons name="body-outline" size={14} color={COLORS.textOnPrimary} />
            <Text style={s.heroBadgeText}>VKİ Analizi</Text>
          </View>
          <Text style={s.heroDate}>
            {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={s.heroTitle}>Vücut Kitle İndeksi</Text>
        <Text style={s.heroSub}>Temel bilgilerini gir, VKİ sonucunu ve kişisel önerileri anında gör.</Text>
      </LinearGradient>

      <View style={s.syncBadge}>
        <Ionicons name="information-circle" size={16} color={COLORS.info} />
        <Text style={s.syncText}>
          Bu kilo VKİ ve profil bilginiz için saklanır. Kilo takibindeki tarihli ölçümlerinizi değiştirmez;
          ölçüm eklemek için &quot;Kilo Takibi&quot; sekmesini kullanın.
        </Text>
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Temel Bilgiler</Text>

        {[
          { label: 'Boy (cm)', field: 'height', icon: 'resize', placeholder: '175', keyboard: 'decimal-pad' },
          { label: 'Kilo (kg)', field: 'weight', icon: 'fitness', placeholder: '72.5', keyboard: 'decimal-pad' },
          { label: 'Yaş', field: 'age', icon: 'calendar', placeholder: '30', keyboard: 'number-pad' },
        ].map(({ label, field, icon, placeholder, keyboard }) => (
          <View key={field} style={s.inputGroup}>
            <Text style={s.inputLabel}>{label}</Text>
            <View style={s.textInputWrap}>
              <Ionicons name={icon} size={20} color={COLORS.primary} />
              <TextInput
                style={s.textInput}
                value={bodyInfo[field]}
                onChangeText={(t) => { setBodyInfo({ ...bodyInfo, [field]: t }); setIsSaved(false); }}
                placeholder={placeholder}
                keyboardType={keyboard}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
        ))}

        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Cinsiyet</Text>
          <View style={{ flexDirection: 'row', gap: SIZES.md }}>
            {[{ key: 'male', label: 'Erkek' }, { key: 'female', label: 'Kadın' }].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[s.genderBtn, bodyInfo.gender === key && s.genderBtnActive]}
                onPress={() => { setBodyInfo({ ...bodyInfo, gender: key }); setIsSaved(false); }}
              >
                <Ionicons name={key} size={20} color={bodyInfo.gender === key ? COLORS.textOnPrimary : COLORS.textSecondary} />
                <Text style={[s.genderText, bodyInfo.gender === key && { color: COLORS.textOnPrimary }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={saveBodyInfo}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.saveBtnGradient}>
          <Ionicons name="save" size={18} color={COLORS.textOnPrimary} />
          <Text style={s.saveBtnText}>Kaydet</Text>
        </LinearGradient>
      </TouchableOpacity>

      {isSaved && bmi && bmiCategory && (
        <>
          <Text style={[s.sectionTitle, { marginTop: SIZES.xl }]}>Vücut Kitle İndeksi (VKİ)</Text>
          <Animated.View style={[s.bmiCard, bmiRevealStyle]}>
            <LinearGradient colors={[bmiCategory.color, bmiCategory.color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bmiGradient}>
              <View style={s.bmiIconCircle}><Ionicons name={bmiCategory.icon} size={38} color={COLORS.textOnPrimary} /></View>
              <Text style={s.bmiVal}>{bmi}</Text>
              <Text style={s.bmiCat}>{bmiCategory.name}</Text>
            </LinearGradient>
          </Animated.View>

          <View style={s.bmiScale}>
            {[
              { label: 'Zayıf (<18.5)', color: COLORS.info },
              { label: 'Normal (18.5–24.9)', color: COLORS.success },
              { label: 'Fazla Kilolu (25–29.9)', color: COLORS.warning },
              { label: 'Obez (≥30)', color: COLORS.error },
            ].map(({ label, color }) => (
              <View key={label} style={s.bmiScaleItem}>
                <View style={[s.dot, { backgroundColor: color }]} />
                <Text style={s.bmiScaleText}>{label}</Text>
              </View>
            ))}
          </View>

          {(loadingAdvice || aiAdvice) && (
            <AIAdviceCard visible loading={loadingAdvice} advice={aiAdvice} onRefresh={refreshBMIInsights} gradientColors={[bmiCategory.color, `${bmiCategory.color}BB`]} iconTint={bmiCategory.color} subtitle="VKİ ve profilinize göre kişiselleştirilir" />
          )}
        </>
      )}

      {isSaved && bmi && bmiCategory && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SIZES.xl, marginBottom: SIZES.sm }}>
            <Text style={s.sectionTitle}>Öneriler</Text>
            <TouchableOpacity onPress={refreshBMIInsights} disabled={loadingBullets || loadingAdvice} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: loadingBullets || loadingAdvice ? 0.5 : 1 }} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
              <Ionicons name="refresh" size={16} color={bmiCategory.color} />
              <Text style={{ fontSize: SIZES.small, fontWeight: '600', color: bmiCategory.color }}>Yenile</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: SIZES.tiny, color: COLORS.textSecondary, marginBottom: SIZES.md }}>
            Yapay zeka ile kişiselleştirilmiş kısa öneriler (tıbbi teşhis değildir).
          </Text>
          {loadingBullets ? (
            <View style={{ paddingVertical: SIZES.lg, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={bmiCategory.color} />
              <Text style={{ marginTop: SIZES.sm, fontSize: SIZES.small, color: COLORS.textSecondary }}>Öneriler hazırlanıyor...</Text>
            </View>
          ) : (
            bulletRecs.map((rec, i) => (
              <View key={i} style={s.recCard}>
                <View style={s.recIcon}><Ionicons name="sparkles" size={16} color={bmiCategory.color} /></View>
                <Text style={s.recText}>{rec}</Text>
              </View>
            ))
          )}
        </>
      )}

      <LinearGradient colors={[COLORS.disclaimerBackground, COLORS.disclaimerBackgroundEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.disclaimerBanner}>
        <View style={s.disclaimerIconWrap}><Ionicons name="shield-checkmark" size={20} color={COLORS.disclaimerIcon} /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.disclaimerBannerTitle}>Tıbbi Uyarı</Text>
          <Text style={s.disclaimerBannerText}>Bu uygulama kişisel takip ve genel bilgilendirme amaçlıdır. VKİ hesaplamaları ve öneriler tıbbi teşhis yerine geçmez. Sağlığınız için bir doktor veya diyetisyene danışınız.</Text>
        </View>
      </LinearGradient>

      <View style={s.sourcesCard}>
        <View style={s.sourcesHeader}>
          <View style={s.sourcesIconWrap}><Ionicons name="library" size={16} color={COLORS.primary} /></View>
          <Text style={s.sourcesTitle}>Bilimsel Kaynaklar</Text>
        </View>
        {[
          { org: 'WHO', label: 'Obezite ve VKİ Sınıflandırması', url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight', icon: 'globe-outline', color: COLORS.primaryDark },
          { org: 'Sağlık Bakanlığı', label: 'Türkiye Beslenme Rehberi (TÜBER)', url: 'https://hsgm.saglik.gov.tr/tr/beslenme', icon: 'medkit-outline', color: COLORS.primary },
          { org: 'NIH', label: 'Body Mass Index Classification', url: 'https://www.nhlbi.nih.gov/health/educational/lose_wt/BMI/bmicalc.htm', icon: 'flask-outline', color: COLORS.info },
        ].map(({ org, label, url, icon, color }, i, arr) => (
          <View key={org}>
            <TouchableOpacity style={s.sourceRow} onPress={() => Linking.openURL(url)} activeOpacity={0.65}>
              <View style={[s.sourceOrgBadge, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={15} color={color} />
                <Text style={[s.sourceOrgText, { color }]}>{org}</Text>
              </View>
              <Text style={s.sourceLabelText} numberOfLines={2}>{label}</Text>
              <Ionicons name="open-outline" size={14} color={COLORS.textLight} />
            </TouchableOpacity>
            {i < arr.length - 1 && <View style={s.sourceDivider} />}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  listContent: { padding: SIZES.containerPadding, paddingBottom: 100 },
  heroCard: {
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: { color: COLORS.textOnPrimary, fontSize: 11, fontWeight: '700' },
  heroDate: { color: COLORS.textOnPrimary, fontSize: 11, opacity: 0.9, fontWeight: '600' },
  heroTitle: { color: COLORS.textOnPrimary, fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.3 },
  heroSub: { color: COLORS.textOnPrimary, opacity: 0.92, fontSize: SIZES.tiny, marginTop: 4, lineHeight: 18 },
  syncBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: COLORS.info + '12', borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginBottom: SIZES.lg, borderWidth: 1, borderColor: COLORS.info + '35' },
  syncText: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  sectionTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.md },
  inputGroup: { marginBottom: SIZES.md },
  inputLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  textInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, paddingHorizontal: SIZES.md, gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  textInput: { flex: 1, fontSize: 22, fontWeight: '600', color: COLORS.text, paddingVertical: SIZES.md - 2 },
  saveBtn: { borderRadius: SIZES.radiusMedium, overflow: 'hidden', height: 52, ...SHADOWS.medium },
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  saveBtnText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, padding: SIZES.md - 2, gap: SIZES.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  genderBtnActive: { backgroundColor: COLORS.primary },
  genderText: { fontSize: SIZES.body, fontWeight: '600', color: COLORS.textSecondary },
  bmiCard: { borderRadius: SIZES.radiusLarge, overflow: 'hidden', marginBottom: SIZES.md, ...SHADOWS.medium },
  bmiGradient: { padding: SIZES.xl, alignItems: 'center' },
  bmiIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.md },
  bmiVal: { fontSize: 44, fontWeight: '700', color: COLORS.textOnPrimary },
  bmiCat: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textOnPrimary },
  bmiScale: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm, ...SHADOWS.small },
  bmiScaleItem: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  dot: { width: 11, height: 11, borderRadius: 6 },
  bmiScaleText: { fontSize: SIZES.small, color: COLORS.textSecondary },
  recCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginBottom: SIZES.sm, gap: SIZES.sm, ...SHADOWS.small },
  recIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center' },
  recText: { flex: 1, fontSize: SIZES.body, color: COLORS.text, lineHeight: 22 },
  disclaimerBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.md, borderRadius: SIZES.radiusLarge, padding: SIZES.md, marginTop: SIZES.xl, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.disclaimerBorder, ...SHADOWS.small },
  disclaimerIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.overlayLight, justifyContent: 'center', alignItems: 'center' },
  disclaimerBannerTitle: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.disclaimerTitle, marginBottom: 3 },
  disclaimerBannerText: { fontSize: SIZES.tiny, color: COLORS.disclaimerText, lineHeight: 18 },
  sourcesCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge, marginBottom: SIZES.xl, overflow: 'hidden', ...SHADOWS.medium },
  sourcesHeader: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, paddingHorizontal: SIZES.md, paddingTop: SIZES.md, paddingBottom: SIZES.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  sourcesIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.highlight, justifyContent: 'center', alignItems: 'center' },
  sourcesTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  sourceRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: 14, gap: SIZES.sm },
  sourceOrgBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusSmall, minWidth: 80 },
  sourceOrgText: { fontSize: SIZES.tiny, fontWeight: '700' },
  sourceLabelText: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  sourceDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SIZES.md },
});
