import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SIZES, SHADOWS, MAX_FONT_SCALE, withAlpha } from '../constants/theme';
import { aiService } from '../services/aiService';
import { useAppError } from '../hooks/useAppError';
import AIAdviceCard from '../components/AIAdviceCard';
import { ScreenContainer, HeroHeader, Chip, SectionHeader, ActionCta } from '../components/ui';

const A = COLORS.accents;
const CATEGORIES = [
  { id: 'genel',      name: 'Genel',      icon: 'bulb-outline',      activeIcon: 'bulb',      miniIcon: 'bulb',    color: A.indigo,  gradient: [A.indigo, withAlpha(A.indigo, 0.75)],   desc: 'Günlük sağlık önerileri' },
  { id: 'beslenme',   name: 'Beslenme',   icon: 'nutrition-outline', activeIcon: 'nutrition', miniIcon: 'leaf',    color: A.emerald, gradient: [A.emerald, withAlpha(A.emerald, 0.75)], desc: 'Sağlıklı beslenme rehberi' },
  { id: 'egzersiz',   name: 'Egzersiz',   icon: 'barbell-outline',   activeIcon: 'barbell',   miniIcon: 'barbell', color: A.amber,   gradient: [A.amber, withAlpha(A.amber, 0.75)],     desc: 'Fitness ve hareket' },
  { id: 'motivasyon', name: 'Motivasyon', icon: 'trophy-outline',    activeIcon: 'trophy',    miniIcon: 'star',    color: A.pink,    gradient: [A.pink, withAlpha(A.pink, 0.75)],       desc: 'Zihinsel güç & hedef' },
];

/** Metni başlık + paragraflara ayır (ilk kısa satır / **başlık** → başlık) */
function parseAdvice(text) {
  if (!text) return { title: '', paragraphs: [] };
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let title = '';
  let rest = [...lines];
  const firstLine = lines[0] || '';
  if (firstLine.startsWith('**') || firstLine.length < 80) {
    title = firstLine.replace(/\*\*/g, '').trim();
    rest = lines.slice(1);
  }
  const paragraphs = rest.map((l) => l.replace(/\*\*/g, '').replace(/^[-•]\s*/, '').trim()).filter(Boolean);
  return { title, paragraphs };
}

export default function TipsScreen() {
  const navigation = useNavigation();
  const { handleError } = useAppError();
  const [selected, setSelected] = useState('genel');
  const [adviceCache, setAdviceCache] = useState({}); // kategori → metin
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const currentCat = CATEGORIES.find((c) => c.id === selected);

  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const fetchAdvice = useCallback(async (categoryId, force = false) => {
    if (!force && adviceCache[categoryId]) { animateIn(); return; }
    setLoading(true);
    try {
      const result = await aiService.getHealthTip(categoryId, { force });
      setAdviceCache((prev) => ({ ...prev, [categoryId]: result.advice || '' }));
      animateIn();
    } catch (e) {
      // aiService normalde fallback metin döndürür; buraya düşerse sessizce logla, "Tekrar dene" sun
      handleError(e, { context: 'tips.fetch', onRetry: () => fetchAdvice(categoryId, true) });
    } finally {
      setLoading(false);
    }
  }, [adviceCache, animateIn]);

  useEffect(() => { fetchAdvice(selected); }, [selected]);

  const { title, paragraphs } = parseAdvice(adviceCache[selected] || '');
  const others = CATEGORIES.filter((c) => c.id !== selected && adviceCache[c.id]);

  // Kompakt başlık: başlık + kategori şeridi (birincil kontrol). Rozet/açıklama yok.
  const header = (
    <HeroHeader title="Sağlık Tavsiyeleri">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            icon={selected === cat.id ? cat.activeIcon : cat.icon}
            active={selected === cat.id}
            tone="onPrimary"
            onPress={() => setSelected(cat.id)}
          />
        ))}
      </ScrollView>
    </HeroHeader>
  );

  return (
    <ScreenContainer tab edges={[]} header={header}>
      <AIAdviceCard
        visible
        loading={loading}
        advice=""
        gradientColors={currentCat.gradient}
        iconTint={currentCat.color}
        title="Yapay Zeka Tavsiyesi"
        subtitle={currentCat.desc}
        onRefresh={() => fetchAdvice(selected, true)}
        footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez."
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {!!title && (
            <View style={styles.adviceTitleRow}>
              <View style={[styles.titleAccent, { backgroundColor: currentCat.color }]} />
              <Text style={styles.adviceTitle} maxFontSizeMultiplier={MAX_FONT_SCALE}>{title}</Text>
            </View>
          )}
          {paragraphs.map((p, i) => (
            <Text key={i} style={styles.adviceParagraph} maxFontSizeMultiplier={MAX_FONT_SCALE}>{p}</Text>
          ))}
        </Animated.View>
      </AIAdviceCard>

      {others.length > 0 && (
        <>
          <SectionHeader title="Diğer Kategoriler" subtitle="Daha önce aldığın öneriler" style={styles.otherHeader} />
          {others.map((cat) => {
            const { title: t, paragraphs: ps } = parseAdvice(adviceCache[cat.id]);
            return (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [styles.miniCard, pressed && styles.pressed]}
                onPress={() => setSelected(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={`${cat.name} kategorisine geç`}
              >
                <LinearGradient colors={cat.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniLeft}>
                  <Ionicons name={cat.miniIcon} size={24} color={COLORS.white} />
                </LinearGradient>
                <View style={styles.miniRight}>
                  <View style={styles.miniHeader}>
                    <Text style={styles.miniCat} maxFontSizeMultiplier={MAX_FONT_SCALE}>{cat.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textLight} />
                  </View>
                  {!!t && <Text style={styles.miniTitle} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>{t}</Text>}
                  {ps.length > 0 && <Text style={styles.miniSnippet} numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE}>{ps[0]}</Text>}
                </View>
              </Pressable>
            );
          })}
        </>
      )}

      <ActionCta
        icon="library-outline"
        title="Tıbbi uyarı, kaynaklar ve gizlilik özeti"
        subtitle="Bilimsel kaynaklar ve sorumluluk notu"
        onPress={() => navigation.navigate('HealthSourcesInfo')}
        style={styles.sources}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chipsScroll: { marginHorizontal: -SIZES.containerPadding },
  chips: { paddingHorizontal: SIZES.containerPadding, gap: SIZES.sm },

  adviceTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  titleAccent: { width: 4, borderRadius: 2, minHeight: 20, marginTop: 2 },
  adviceTitle: { flex: 1, fontSize: SIZES.h5 + 1, fontWeight: '800', color: COLORS.text, lineHeight: 24 },
  adviceParagraph: { fontSize: SIZES.bodySmall, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 10 },

  otherHeader: { marginTop: SIZES.md },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.96 },
  miniCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SIZES.sm + 4,
    ...SHADOWS.small,
  },
  miniLeft: { width: 70, justifyContent: 'center', alignItems: 'center' },
  miniRight: { flex: 1, padding: 14 },
  miniHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  miniCat: { fontSize: SIZES.tiny - 1, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniTitle: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  miniSnippet: { fontSize: SIZES.tiny, color: COLORS.textSecondary, lineHeight: 17 },
  sources: { marginTop: SIZES.sm },
});
