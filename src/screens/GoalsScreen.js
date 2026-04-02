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
import { goalsService } from '../services/supabase';
import { aiService } from '../services/aiService';

const { width } = Dimensions.get('window');

export default function GoalsScreen() {
  const [goals, setGoals] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedTargetDate, setSelectedTargetDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [targetWeight, setTargetWeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);

  // AI Tavsiye state'leri
  const [aiAdviceModalVisible, setAiAdviceModalVisible] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [selectedGoalForAdvice, setSelectedGoalForAdvice] = useState(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await goalsService.getAll();
      setGoals(data || []);
    } catch (error) {
      console.error('Hedefler yükleme hatası:', error);
      Alert.alert('Hata', 'Hedefler yüklenirken bir hata oluştu.');
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setTitle('');
    setCurrentWeight('');
    setTargetWeight('');
    setSelectedStartDate(new Date());
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    setSelectedTargetDate(futureDate);
    setNotes('');
    setShowStartDatePicker(false);
    setShowTargetDatePicker(false);
    setModalVisible(true);
  };

  const openEditModal = (goal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setCurrentWeight(goal.current_weight?.toString() || '');
    setTargetWeight(goal.target_weight.toString());
    setSelectedStartDate(new Date(goal.start_date));
    setSelectedTargetDate(new Date(goal.target_date));
    setNotes(goal.notes || '');
    setShowStartDatePicker(false);
    setShowTargetDatePicker(false);
    setModalVisible(true);
  };

  const onStartDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (date) {
      setSelectedStartDate(date);
    }
  };

  const onTargetDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowTargetDatePicker(false);
    }
    if (date) {
      setSelectedTargetDate(date);
    }
  };

  const saveGoal = async () => {
    if (!title) {
      Alert.alert('⚠️ Uyarı', 'Lütfen hedef başlığı girin.');
      return;
    }
    if (!targetWeight) {
      Alert.alert('⚠️ Uyarı', 'Lütfen hedef kilonuzu girin.');
      return;
    }

    try {
      const goalData = {
        title: title,
        current_weight: currentWeight ? parseFloat(currentWeight) : null,
        target_weight: parseFloat(targetWeight),
        start_date: selectedStartDate.toISOString().split('T')[0],
        target_date: selectedTargetDate.toISOString().split('T')[0],
        notes: notes,
        status: 'active',
      };

      if (editingId) {
        await goalsService.update(editingId, goalData);
        Alert.alert('✅ Başarılı', 'Hedef güncellendi!');
      } else {
        await goalsService.create(goalData);
        Alert.alert('✅ Başarılı', 'Hedef eklendi!');
      }

      setModalVisible(false);
      loadGoals();
    } catch (error) {
      console.error('Hedef kaydetme hatası:', error);
      Alert.alert('❌ Hata', 'Hedef kaydedilirken bir hata oluştu.');
    }
  };

  const deleteGoal = (id) => {
    Alert.alert('Hedefi Sil', 'Bu hedefi silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await goalsService.delete(id);
            Alert.alert('✅ Başarılı', 'Hedef silindi!');
            loadGoals();
          } catch (error) {
            console.error('Hedef silme hatası:', error);
            Alert.alert('❌ Hata', 'Hedef silinirken bir hata oluştu.');
          }
        },
      },
    ]);
  };

  const toggleGoalStatus = async (goal) => {
    try {
      const newStatus = goal.status === 'active' ? 'completed' : 'active';
      await goalsService.update(goal.id, { status: newStatus });
      loadGoals();
    } catch (error) {
      console.error('Hedef durumu güncelleme hatası:', error);
      Alert.alert('❌ Hata', 'Hedef durumu güncellenirken bir hata oluştu.');
    }
  };

  // AI Tavsiye Al
  const getAIAdvice = async (goal) => {
    setSelectedGoalForAdvice(goal);
    setLoadingAdvice(true);
    setAiAdviceModalVisible(true);
    setAiAdvice('');

    try {
      const goalData = {
        title: goal.title,
        currentWeight: goal.current_weight,
        targetWeight: goal.target_weight,
        startDate: goal.start_date,
        targetDate: goal.target_date,
      };

      const result = await aiService.getGoalAdvice(goalData);
      setAiAdvice(result.advice);
    } catch (error) {
      console.error('AI tavsiye hatası:', error);
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const calculateProgress = (goal) => {
    if (!goal.current_weight) return 0;
    const totalDiff = Math.abs(goal.current_weight - goal.target_weight);
    const currentDiff = Math.abs(goal.current_weight - goal.target_weight);
    if (totalDiff === 0) return 100;
    const progress = ((totalDiff - currentDiff) / totalDiff) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getDaysRemaining = (targetDate) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStats = () => {
    const activeGoals = goals.filter((g) => g.status === 'active').length;
    const completedGoals = goals.filter((g) => g.status === 'completed').length;
    return { activeGoals, completedGoals, total: goals.length };
  };

  const stats = getStats();

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      {goals.length > 0 && (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsHeader}
        >
          <StatCard label="Toplam" value={stats.total} icon="trophy" />
          <StatCard label="Aktif" value={stats.activeGoals} icon="flag" />
          <StatCard
            label="Tamamlanan"
            value={stats.completedGoals}
            icon="checkmark-circle"
          />
        </LinearGradient>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Hedeflerim</Text>
            <Text style={styles.subtitle}>
              Kilo hedeflerinizi belirleyin ve takip edin
            </Text>
          </View>

          {/* Goals List */}
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>Henüz hedef yok</Text>
              <Text style={styles.emptySubtext}>
                Başlamak için + butonuna tıklayın
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const daysRemaining = getDaysRemaining(goal.target_date);
              const isCompleted = goal.status === 'completed';
              const weightDiff = goal.current_weight
                ? Math.abs(goal.current_weight - goal.target_weight)
                : null;

              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    isCompleted && styles.goalCardCompleted,
                  ]}
                  onPress={() => openEditModal(goal)}
                  onLongPress={() => deleteGoal(goal.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleRow}>
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle' : 'flag'}
                        size={24}
                        color={isCompleted ? COLORS.success : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.goalTitle,
                          isCompleted && styles.goalTitleCompleted,
                        ]}
                      >
                        {goal.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleGoalStatus(goal)}
                      style={styles.statusButton}
                    >
                      <Ionicons
                        name={
                          isCompleted
                            ? 'refresh-circle-outline'
                            : 'checkmark-done-circle-outline'
                        }
                        size={24}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalBody}>
                    <View style={styles.goalInfo}>
                      <View style={styles.infoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.infoText}>
                          {formatDate(goal.start_date)} -{' '}
                          {formatDate(goal.target_date)}
                        </Text>
                      </View>
                      {!isCompleted && daysRemaining >= 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color={COLORS.info}
                          />
                          <Text style={[styles.infoText, { color: COLORS.info }]}>
                            {daysRemaining} gün kaldı
                          </Text>
                        </View>
                      )}
                      {!isCompleted && daysRemaining < 0 && (
                        <View style={styles.infoRow}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={16}
                            color={COLORS.error}
                          />
                          <Text style={[styles.infoText, { color: COLORS.error }]}>
                            Hedef tarihi geçti
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.weightInfo}>
                      {goal.current_weight && (
                        <View style={styles.weightRow}>
                          <Text style={styles.weightLabel}>Mevcut:</Text>
                          <Text style={styles.weightValue}>
                            {goal.current_weight} kg
                          </Text>
                        </View>
                      )}
                      <View style={styles.weightRow}>
                        <Text style={styles.weightLabel}>Hedef:</Text>
                        <Text style={[styles.weightValue, styles.targetWeight]}>
                          {goal.target_weight} kg
                        </Text>
                      </View>
                      {weightDiff !== null && (
                        <View style={styles.weightRow}>
                          <Text style={styles.weightLabel}>Fark:</Text>
                          <Text
                            style={[styles.weightValue, { color: COLORS.warning }]}
                          >
                            {weightDiff.toFixed(1)} kg
                          </Text>
                        </View>
                      )}
                    </View>

                    {goal.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesText} numberOfLines={2}>
                          {goal.notes}
                        </Text>
                      </View>
                    )}

                    {/* AI Tavsiye Butonu */}
                    <TouchableOpacity
                      style={styles.aiAdviceButton}
                      onPress={() => getAIAdvice(goal)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={[COLORS.accent, COLORS.accentDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.aiAdviceGradient}
                      >
                        <Ionicons name="sparkles" size={18} color={COLORS.textOnPrimary} />
                        <Text style={styles.aiAdviceButtonText}>AI Tavsiye Al</Text>
                      </LinearGradient>
                    </TouchableOpacity>
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
                        {editingId ? 'Hedefi Düzenle' : 'Yeni Hedef'}
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
                      <Text style={styles.inputLabel}>Hedef Başlığı</Text>
                      <View style={styles.textInputContainer}>
                        <Ionicons name="create" size={20} color={COLORS.primary} />
                        <TextInput
                          style={styles.textInput}
                          value={title}
                          onChangeText={setTitle}
                          placeholder="Örn: 10 Kilo Ver"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Mevcut Kilo (kg)</Text>
                      <View style={styles.weightInputContainer}>
                        <Ionicons name="body" size={20} color={COLORS.primary} />
                        <TextInput
                          style={styles.weightInput}
                          value={currentWeight}
                          onChangeText={setCurrentWeight}
                          placeholder="75.5"
                          keyboardType="decimal-pad"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Hedef Kilo (kg)</Text>
                      <View style={styles.weightInputContainer}>
                        <Ionicons name="flag" size={20} color={COLORS.primary} />
                        <TextInput
                          style={styles.weightInput}
                          value={targetWeight}
                          onChangeText={setTargetWeight}
                          placeholder="65.0"
                          keyboardType="decimal-pad"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Başlangıç Tarihi</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowStartDatePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.dateButtonText}>
                          {selectedStartDate.toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                      {showStartDatePicker && (
                        <View style={styles.datePickerContainer}>
                          <DateTimePicker
                            value={selectedStartDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onStartDateChange}
                            locale="tr-TR"
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.datePickerCloseBtn}
                              onPress={() => setShowStartDatePicker(false)}
                            >
                              <Text style={styles.datePickerCloseText}>Tamam</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Hedef Tarihi</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowTargetDatePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={styles.dateButtonText}>
                          {selectedTargetDate.toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                        <Ionicons
                          name="chevron-down"
                          size={20}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                      {showTargetDatePicker && (
                        <View style={styles.datePickerContainer}>
                          <DateTimePicker
                            value={selectedTargetDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onTargetDateChange}
                            locale="tr-TR"
                            minimumDate={selectedStartDate}
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity
                              style={styles.datePickerCloseBtn}
                              onPress={() => setShowTargetDatePicker(false)}
                            >
                              <Text style={styles.datePickerCloseText}>Tamam</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
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
                      onPress={saveGoal}
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
                  style={styles.modalIcon}
                />
                <Text style={styles.modalTitle}>AI Tavsiyesi</Text>
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
                    AI tavsiyeniz hazırlanıyor...
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
                    <Ionicons name="bulb" size={32} color={COLORS.textOnPrimary} />
                    <Text style={styles.aiAdviceTitle}>
                      {selectedGoalForAdvice?.title}
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
const StatCard = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={28} color={COLORS.textOnPrimary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
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
  statValue: {
    fontSize: SIZES.h2,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
    marginVertical: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.tiny,
    color: COLORS.textOnPrimary,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SIZES.containerPadding,
  },
  titleContainer: {
    marginBottom: SIZES.lg,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxxl,
  },
  emptyText: {
    fontSize: SIZES.h4,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  emptySubtext: {
    fontSize: SIZES.body,
    color: COLORS.textLight,
  },
  goalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  goalCardCompleted: {
    opacity: 0.7,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    flex: 1,
  },
  goalTitle: {
    fontSize: SIZES.h4,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  statusButton: {
    padding: SIZES.xs,
  },
  goalBody: {
    gap: SIZES.md,
  },
  goalInfo: {
    gap: SIZES.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  infoText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
  },
  weightInfo: {
    backgroundColor: COLORS.highlight,
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    gap: SIZES.xs,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  weightValue: {
    fontSize: SIZES.body,
    fontWeight: '700',
    color: COLORS.text,
  },
  targetWeight: {
    color: COLORS.primary,
  },
  notesContainer: {
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  notesText: {
    fontSize: SIZES.small,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: SIZES.radiusMedium,
    paddingHorizontal: SIZES.md,
    gap: SIZES.sm,
  },
  textInput: {
    flex: 1,
    fontSize: SIZES.body,
    color: COLORS.text,
    paddingVertical: SIZES.md,
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
    fontSize: SIZES.h4,
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
  // AI Tavsiye Stilleri
  aiAdviceButton: {
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  aiAdviceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    gap: SIZES.xs,
  },
  aiAdviceButtonText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textOnPrimary,
  },
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
