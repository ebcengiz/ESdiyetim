import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  Platform,
  KeyboardAvoidingView,

  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { weightService } from '../services/supabase';
import { aiService } from '../services/aiService';

const { width } = Dimensions.get('window');

export default function WeightTrackerScreen() {
  const [weights, setWeights] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);

  // AI Tavsiye state'leri
  const [aiAdviceModalVisible, setAiAdviceModalVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    loadWeights();
  }, []);

  const loadWeights = async () => {
    try {
      const data = await weightService.getAll();
      setWeights(data || []);
    } catch (error) {
      Alert.alert(
        '⚠️ Yükleme Hatası',
        'Kilo kayıtlarınız yüklenirken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.',
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setSelectedDate(new Date());
    setWeight('');
    setNotes('');
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingId(record.id);
    setSelectedDate(new Date(record.date));
    setWeight(record.weight.toString());
    setNotes(record.notes || '');
    setShowDatePicker(false);
    setModalVisible(true);
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const saveWeight = async () => {
    if (!weight) {
      Alert.alert('⚠️ Uyarı', 'Lütfen kilonuzu girin.');
      return;
    }

    try {
      const weightData = {
        date: selectedDate.toISOString().split('T')[0],
        weight: parseFloat(weight),
        notes: notes,
      };

      if (editingId) {
        await weightService.update(editingId, weightData);
        Alert.alert(
          '✅ Güncellendi',
          'Kilo kaydınız başarıyla güncellendi.',
          [{ text: 'Tamam', style: 'default' }]
        );
      } else {
        await weightService.create(weightData);
        Alert.alert(
          '✅ Kaydedildi',
          'Yeni kilo kaydınız başarıyla eklendi.',
          [{ text: 'Tamam', style: 'default' }]
        );
      }

      setModalVisible(false);
      loadWeights();
    } catch (error) {
      // Duplicate key hatası
      if (error.code === 'DUPLICATE_DATE') {
        Alert.alert(
          '📆 Aynı Gün Kaydı',
          error.message,
          [{ text: 'Tamam', style: 'default' }]
        );
      }
      // Diğer veritabanı hataları
      else if (error.message) {
        Alert.alert(
          '⚠️ İşlem Başarısız',
          'Kilo kaydı kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam', style: 'default' }]
        );
      }
      // Bilinmeyen hatalar
      else {
        Alert.alert(
          '⚠️ Bağlantı Hatası',
          'Beklenmeyen bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.',
          [{ text: 'Tamam', style: 'default' }]
        );
      }
    }
  };

  const deleteWeight = (id) => {
    Alert.alert(
      '🗑️ Kaydı Sil',
      'Bu kilo kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await weightService.delete(id);
              Alert.alert(
                '✅ Başarılı',
                'Kilo kaydınız başarıyla silindi.',
                [{ text: 'Tamam', style: 'default' }]
              );
              loadWeights();
            } catch (error) {
              Alert.alert(
                '⚠️ Silme Başarısız',
                'Kilo kaydı silinirken bir hata oluştu. Lütfen tekrar deneyin.',
                [{ text: 'Tamam', style: 'default' }]
              );
            }
          },
        },
      ]
    );
  };

  // AI Tavsiye Al
  const getAIAdvice = async () => {
    if (!stats || weights.length === 0) {
      Alert.alert(
        '⚠️ Yetersiz Veri',
        'AI tavsiyesi alabilmek için en az bir kilo kaydı girmelisiniz.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }

    setLoadingAdvice(true);
    setAiAdviceModalVisible(true);
    setAiAdvice('');

    try {
      const weightData = {
        weights: weights,
        stats: stats,
      };
      const result = await aiService.getWeightTrackingAdvice(weightData);
      setAiAdvice(result.advice);
    } catch (error) {
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const calculateChange = (index) => {
    if (index < weights.length - 1) {
      const currentWeight = weights[index].weight;
      const previousWeight = weights[index + 1].weight;
      const change = currentWeight - previousWeight;
      return change;
    }
    return null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getStats = () => {
    if (weights.length === 0) return null;

    const latest = weights[0].weight;
    const oldest = weights[weights.length - 1].weight;
    const totalChange = latest - oldest;
    const average = weights.reduce((sum, w) => sum + w.weight, 0) / weights.length;

    return {
      latest,
      oldest,
      totalChange,
      average: average.toFixed(1),
    };
  };

  const stats = getStats();

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      {stats && (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsHeader}
        >
          <StatCard
            label="Mevcut Kilo"
            value={`${stats.latest} kg`}
            icon="fitness"
          />
          <StatCard
            label="Değişim"
            value={`${stats.totalChange > 0 ? '+' : ''}${stats.totalChange.toFixed(1)} kg`}
            icon={stats.totalChange < 0 ? 'trending-down' : 'trending-up'}
            highlight={stats.totalChange < 0}
          />
          <StatCard
            label="Ortalama"
            value={`${stats.average} kg`}
            icon="stats-chart"
          />
        </LinearGradient>
      )}

      {/* AI Tavsiye Butonu */}
      {stats && (
        <View style={styles.aiButtonContainer}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={getAIAdvice}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiButtonGradient}
            >
              <Ionicons name="sparkles" size={20} color={COLORS.textOnPrimary} />
              <Text style={styles.aiButtonText}>AI'dan Analiz Al</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Kilo Geçmişi</Text>
            <Text style={styles.subtitle}>{weights.length} kayıt</Text>
          </View>

          {/* Info Message */}
          {weights.length > 0 && (
            <View style={styles.infoMessage}>
              <Ionicons name="information-circle" size={16} color={COLORS.info} />
              <Text style={styles.infoText}>
                Düzenlemek için dokunun, silmek için basılı tutun
              </Text>
            </View>
          )}

          {/* Records List */}
          {weights.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="scale-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Henüz kilo kaydı yok</Text>
              <Text style={styles.emptySubtext}>
                Başlamak için + butonuna tıklayın
              </Text>
            </View>
          ) : (
            weights.map((record, index) => {
              const change = calculateChange(index);
              return (
                <TouchableOpacity
                  key={record.id}
                  style={styles.recordCard}
                  onPress={() => openEditModal(record)}
                  onLongPress={() => deleteWeight(record.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recordDate}>
                    <Text style={styles.recordDateText}>{formatDate(record.date)}</Text>
                    {change !== null && (
                      <View style={[
                        styles.changeBadge,
                        { backgroundColor: change < 0 ? COLORS.success : COLORS.warning }
                      ]}>
                        <Text style={styles.changeText}>
                          {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.recordBody}>
                    <View style={styles.weightContainer}>
                      <Text style={styles.recordWeight}>{record.weight}</Text>
                      <Text style={styles.weightUnit}>kg</Text>
                    </View>
                    {record.notes && (
                      <Text style={styles.recordNotes} numberOfLines={2}>
                        {record.notes}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.addButtonGradient}
        >
          <Text style={styles.addButtonText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalTitleContainer}>
                      <Ionicons
                        name={editingId ? 'create' : 'add-circle'}
                        size={24}
                        color={COLORS.primary}
                        style={styles.modalIcon}
                      />
                      <Text style={styles.modalTitle}>
                        {editingId ? 'Düzenle' : 'Yeni Kayıt'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    style={styles.modalBody}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                  >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tarih</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                  <Text style={styles.dateButtonText}>
                    {selectedDate.toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                      locale="tr-TR"
                      maximumDate={new Date()}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.datePickerCloseBtn}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.datePickerCloseText}>Tamam</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Kilo (kg)</Text>
                <View style={styles.weightInputContainer}>
                  <Ionicons name="fitness" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.weightInput}
                    value={weight}
                    onChangeText={setWeight}
                    placeholder="75.5"
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notlar (Opsiyonel)</Text>
                <View style={styles.notesInputContainer}>
                  <Ionicons name="document-text" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notlarınızı yazın..."
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.cancelBtnText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtnModal]}
                      onPress={saveWeight}
                    >
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        style={styles.saveBtnGradient}
                      >
                        <Text style={styles.saveBtnText}>Kaydet</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Tavsiye Modal */}
      <Modal
        visible={aiAdviceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAiAdviceModalVisible(false)}
      >
        <View style={styles.aiModalOverlay}>
          <View style={styles.aiModalContent}>
            <View style={styles.aiModalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons
                  name="sparkles"
                  size={24}
                  color={COLORS.accent}
                />
                <Text style={styles.modalTitle}>AI Kilo Analizi</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAiAdviceModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.aiModalBody}
              showsVerticalScrollIndicator={false}
            >
              {loadingAdvice ? (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                  <Text style={styles.aiLoadingText}>
                    Kilo takip verileriniz analiz ediliyor...
                  </Text>
                  <Text style={styles.aiLoadingSubtext}>
                    Bu birkaç saniye sürebilir
                  </Text>
                </View>
              ) : (
                <View style={styles.aiAdviceContainer}>
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.aiAdviceHeader}
                  >
                    <Ionicons name="analytics" size={32} color={COLORS.textOnPrimary} />
                    <Text style={styles.aiAdviceTitle}>
                      Kişiselleştirilmiş Analiz
                    </Text>
                  </LinearGradient>
                  <View style={styles.aiAdviceContent}>
                    <Text style={styles.aiAdviceText}>{aiAdvice}</Text>
                    <View style={styles.disclaimerBox}>
                      <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.disclaimerText}>Bu bilgiler tıbbi tavsiye yerine geçmez. Sağlık kararları için bir doktor veya uzman diyetisyene danışınız.</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.aiModalFooter}>
              <TouchableOpacity
                style={styles.aiCloseButton}
                onPress={() => setAiAdviceModalVisible(false)}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.aiCloseButtonGradient}
                >
                  <Text style={styles.aiCloseButtonText}>Kapat</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Stat Card Component
const StatCard = ({ label, value, icon, highlight }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={28} color={COLORS.textOnPrimary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={[styles.statLabel, highlight && styles.statLabelHighlight]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SIZES.containerPadding,
    paddingTop: SIZES.lg,
  },
  statCard: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: SIZES.xs,
  },
  statValue: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginBottom: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
  },
  statLabelHighlight: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.containerPadding,
  },
  titleContainer: {
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.highlight,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSmall,
    marginBottom: SIZES.md,
    gap: SIZES.xs,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    flex: 1,
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
  },
  recordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  recordDate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  recordDateText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  changeBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
  },
  changeText: {
    fontSize: SIZES.tiny,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  recordBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  recordWeight: {
    fontSize: SIZES.h1,
    fontWeight: '700',
    color: COLORS.primary,
  },
  weightUnit: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: SIZES.xs,
  },
  recordNotes: {
    flex: 1,
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: SIZES.md,
  },
  addButton: {
    position: 'absolute',
    bottom: SIZES.lg,
    right: SIZES.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 36,
    fontWeight: '300',
    color: COLORS.textOnPrimary,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  modalIcon: {
    marginRight: SIZES.xs,
  },
  modalTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: SIZES.lg,
  },
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
    fontSize: SIZES.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  dateButtonText: {
    flex: 1,
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  datePickerContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMedium,
    marginTop: SIZES.sm,
    overflow: 'hidden',
  },
  datePickerCloseBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  datePickerCloseText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.md,
    gap: SIZES.sm,
  },
  weightInput: {
    flex: 1,
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: SIZES.md,
  },
  notesInputContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.sm,
    alignItems: 'flex-start',
  },
  notesInput: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  modalBtn: {
    flex: 1,
    height: 56,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
  },
  cancelBtn: {
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtnModal: {},
  saveBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  // AI Buton Stilleri
  aiButtonContainer: {
    padding: SIZES.md,
    backgroundColor: COLORS.background,
  },
  aiButton: {
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    gap: SIZES.sm,
  },
  aiButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
  // AI Modal Stilleri
  aiModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  aiModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXL,
    borderTopRightRadius: SIZES.radiusXL,
    maxHeight: '85%',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  aiModalBody: {
    padding: SIZES.lg,
  },
  aiLoadingContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.xxxl,
    gap: SIZES.md,
  },
  aiLoadingText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.text,
  },
  aiLoadingSubtext: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  aiAdviceContainer: {
    borderRadius: SIZES.radiusLarge,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  aiAdviceHeader: {
    padding: SIZES.lg,
    alignItems: 'center',
    gap: SIZES.sm,
  },
  aiAdviceTitle: {
    fontSize: SIZES.h3,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    textAlign: 'center',
  },
  aiAdviceContent: {
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
  },
  aiAdviceText: {
    fontSize: SIZES.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  aiModalFooter: {
    padding: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.surface,
  },
  aiCloseButton: {
    height: 56,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiCloseButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCloseButtonText: {
    fontSize: SIZES.h5,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusSmall,
    padding: SIZES.sm,
    marginTop: SIZES.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: SIZES.tiny,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});