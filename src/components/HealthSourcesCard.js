import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const VARIANTS = {
  meal: {
    title: 'Bilimsel ve resmî kaynaklar',
    headerIcon: 'library-outline',
    headerIconSize: 15,
    intro:
      'Tahmini kalori görüntüye dayalı yapay zeka çıkarımıdır. Besin enerjisi ve dengeli beslenme hakkında doğrulanabilir bilgi için:',
    links: [
      {
        label: 'USDA FoodData Central — besin bileşimi ve enerji',
        url: 'https://fdc.nal.usda.gov/',
      },
      {
        label: 'WHO — sağlıklı beslenme',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
      {
        label: 'T.C. Sağlık Bakanlığı — Türkiye Beslenme Rehberi (TÜBER)',
        url: 'https://hsgm.saglik.gov.tr/tr/beslenme',
      },
    ],
  },
  tips: {
    title: 'Kaynaklar',
    headerIcon: 'book-outline',
    headerIconSize: 15,
    intro:
      'Aşağıdaki bağlantılar genel sağlık ve beslenme bilgisinin resmî kaynaklarıdır. Yapay zeka metinleri bu kaynakların yerine geçmez.',
    links: [
      {
        label: 'WHO — sağlıklı beslenme',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
      {
        label: 'WHO — fiziksel aktivite',
        url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
      },
      {
        label: 'T.C. Sağlık Bakanlığı — TÜBER',
        url: 'https://hsgm.saglik.gov.tr/tr/beslenme',
      },
    ],
  },
  food: {
    title: 'Veri kaynakları ve uyarılar',
    headerIcon: 'information-circle-outline',
    headerIconSize: 15,
    intro:
      'Besin değerleri Open Food Facts, USDA veritabanları ve yapay zeka tahminlerinden derlenmektedir. Değerler yaklaşıktır; kesin bilgi için kaynaklara başvurun. Bu uygulama diyetisyen tavsiyesinin yerine geçmez.',
    links: [
      {
        label: 'Open Food Facts — açık kaynak besin veritabanı',
        url: 'https://world.openfoodfacts.org/',
      },
      {
        label: 'USDA FoodData Central — besin bileşimi',
        url: 'https://fdc.nal.usda.gov/',
      },
      {
        label: 'T.C. Sağlık Bakanlığı — TÜBER beslenme rehberi',
        url: 'https://hsgm.saglik.gov.tr/tr/beslenme',
      },
      {
        label: 'WHO — sağlıklı beslenme',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
    ],
  },
  general: {
    title: 'Bilimsel ve resmî kaynaklar',
    headerIcon: 'library-outline',
    headerIconSize: 15,
    intro:
      'Yapay zeka önerileri ve uygulama içi bilgiler genel bilgilendirme amaçlıdır. Beslenme, kilo ve VKİ ile ilgili doğrulanabilir bilgi için:',
    links: [
      {
        label: 'WHO — sağlıklı beslenme',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
      {
        label: 'WHO — obezite ve VKİ sınıflandırması',
        url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',
      },
      {
        label: 'NIH — Body Mass Index (VKİ)',
        url: 'https://www.nhlbi.nih.gov/health/educational/lose_wt/BMI/bmicalc.htm',
      },
      {
        label: 'T.C. Sağlık Bakanlığı — TÜBER',
        url: 'https://hsgm.saglik.gov.tr/tr/beslenme',
      },
    ],
  },
  /** Diyet planı ekranı: App Store 1.4.1 (sağlık) uyumu — tıbbi sınırlama + kaynaklar */
  dietPlan: {
    title: 'Uyarılar ve güvenilir kaynaklar',
    headerIcon: 'shield-checkmark-outline',
    headerIconSize: 15,
    intro:
      'Diyet planı, günlük öğün notları ve kalori toplamları yalnızca kişisel kayıt ve genel bilgilendirme içindir; tıbbi teşhis, tedavi, terapi veya kişiye özel beslenme planı sunmaz ve bunların yerine geçmez. Uygulama tıbbi bir cihaz veya uzman sağlık hizmeti değildir. Hamilelik, emzirme, yeme bozukluğu, kronik hastalık, ilaç kullanımı veya özel beslenme ihtiyacınız varsa mutlaka hekim veya diyetisyene danışın. Veritabanı ve yapay zekâ ile hesaplanan kalori ve besin değerleri yaklaşık olabilir. Acil tıbbi durumlarda yerel acil hattınızı (ör. 112) arayın. Aşağıdaki bağlantılar bağımsız resmî ve bilimsel kaynaklardır.',
    links: [
      {
        label: 'T.C. Sağlık Bakanlığı — Türkiye Beslenme Rehberi (TÜBER)',
        url: 'https://hsgm.saglik.gov.tr/tr/beslenme',
      },
      {
        label: 'WHO — sağlıklı beslenme (genel ilkeler)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
      {
        label: 'WHO — obezite ve VKİ',
        url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',
      },
      {
        label: 'MedlinePlus (NIH) — beslenme ve diyet',
        url: 'https://medlineplus.gov/nutrition.html',
      },
      {
        label: 'NHS (UK) — Eat well',
        url: 'https://www.nhs.uk/live-well/eat-well/',
      },
      {
        label: 'USDA FoodData Central — besin bileşimi referansı',
        url: 'https://fdc.nal.usda.gov/',
      },
      {
        label: 'Open Food Facts — ürün besin değerleri (açık veri)',
        url: 'https://world.openfoodfacts.org/',
      },
      {
        label: 'FDA — Nutrition Facts etiketi (ABD referansı)',
        url: 'https://www.fda.gov/food/nutrition-education-resources-materials/nutrition-fact-label',
      },
    ],
  },
};

/**
 * App Store 1.4.1: sağlık/medikal içerik için uygulama içi kaynak bağlantıları ve uyarı metinleri.
 * @param {'meal'|'tips'|'food'|'general'|'dietPlan'} variant
 */
export default function HealthSourcesCard({ variant = 'general', style }) {
  const cfg = VARIANTS[variant] || VARIANTS.general;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Ionicons name={cfg.headerIcon} size={cfg.headerIconSize} color={COLORS.primary} />
        <Text style={styles.title}>{cfg.title}</Text>
      </View>
      <Text style={styles.intro}>{cfg.intro}</Text>
      {cfg.links.map(({ label, url }, idx) => (
        <TouchableOpacity
          key={url}
          style={[styles.row, idx === 0 && styles.rowFirst]}
          onPress={() => Linking.openURL(url)}
          activeOpacity={0.7}
        >
          <Text style={styles.linkText}>{label}</Text>
          <Ionicons name="open-outline" size={14} color={COLORS.info} style={styles.linkIcon} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.sm + 4,
    paddingVertical: SIZES.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontSize: SIZES.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  intro: {
    fontSize: SIZES.micro + 1,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SIZES.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SIZES.xs + 2,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  linkText: {
    flex: 1,
    fontSize: SIZES.micro + 2,
    fontWeight: '500',
    color: COLORS.info,
    lineHeight: 18,
  },
  linkIcon: {
    marginTop: 1,
  },
});
