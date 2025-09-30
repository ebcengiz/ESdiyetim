import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { tipsService } from '../services/supabase';

export default function TipsScreen() {
  const [tips, setTips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('tümü');

  useEffect(() => {
    loadTips();
  }, []);

  const loadTips = async () => {
    try {
      const data = await tipsService.getAll();
      setTips(data || []);
    } catch (error) {
      console.error('Tavsiyeler yükleme hatası:', error);
      Alert.alert('Hata', 'Tavsiyeler yüklenirken bir hata oluştu.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTips();
    setRefreshing(false);
  };

  const categories = [
    { id: 'tümü', name: 'Tümü', icon: 'apps' },
    { id: 'genel', name: 'Genel', icon: 'bulb' },
    { id: 'beslenme', name: 'Beslenme', icon: 'nutrition' },
    { id: 'egzersiz', name: 'Egzersiz', icon: 'barbell' },
    { id: 'motivasyon', name: 'Motivasyon', icon: 'trophy' },
  ];

  const getCategoryColor = (category) => {
    const colors = {
      genel: COLORS.primary,
      beslenme: COLORS.secondary,
      egzersiz: COLORS.accentDark,
      motivasyon: COLORS.info,
    };
    return colors[category] || COLORS.primary;
  };

  const filteredTips =
    selectedCategory === 'tümü'
      ? tips
      : tips.filter((tip) => tip.category === selectedCategory);

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive,
                selectedCategory === category.id && {
                  backgroundColor: COLORS.primary,
                },
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={category.icon}
                size={16}
                color={selectedCategory === category.id ? COLORS.textOnPrimary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tips List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.content}>
          {filteredTips.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💡</Text>
              <Text style={styles.emptyText}>Henüz tavsiye bulunmuyor</Text>
              <Text style={styles.emptySubtext}>
                Supabase veritabanınıza tavsiyeler ekleyin
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.headerContainer}>
                <Text style={styles.resultCount}>
                  {filteredTips.length} tavsiye bulundu
                </Text>
              </View>

              {filteredTips.map((tip, index) => (
                <TipCard
                  key={tip.id}
                  tip={tip}
                  color={getCategoryColor(tip.category)}
                  index={index}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// Tip Card Component
const TipCard = ({ tip, color, index }) => {
  const getCategoryIcon = (category) => {
    const icons = {
      genel: 'bulb',
      beslenme: 'nutrition',
      egzersiz: 'barbell',
      motivasyon: 'trophy',
    };
    return icons[category] || 'bulb';
  };

  return (
    <View style={styles.tipCard}>
      <LinearGradient
        colors={[color, `${color}E6`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tipHeader}
      >
        <View style={styles.tipIconBadge}>
          <Ionicons name={getCategoryIcon(tip.category)} size={24} color={COLORS.textOnPrimary} />
        </View>
        {tip.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {tip.category.charAt(0).toUpperCase() + tip.category.slice(1)}
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.tipBody}>
        <Text style={styles.tipTitle}>{tip.title}</Text>
        <Text style={styles.tipContent}>{tip.content}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  categoryContainer: {
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryScroll: {
    paddingHorizontal: SIZES.containerPadding,
    gap: SIZES.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.surfaceAlt,
    gap: SIZES.xs,
  },
  categoryChipActive: {
    ...SHADOWS.small,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTextActive: {
    color: COLORS.textOnPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.containerPadding,
  },
  headerContainer: {
    marginBottom: SIZES.md,
  },
  resultCount: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  emptySubtext: {
    fontSize: SIZES.body,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: SIZES.xl,
  },
  tipCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    marginBottom: SIZES.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.md,
  },
  tipIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipIcon: {
    fontSize: 20,
  },
  categoryBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryBadgeText: {
    fontSize: SIZES.tiny,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    textTransform: 'uppercase',
  },
  tipBody: {
    padding: SIZES.md,
  },
  tipTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SIZES.sm,
  },
  tipContent: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
});