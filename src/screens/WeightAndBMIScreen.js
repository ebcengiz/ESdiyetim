import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { weightService, bodyInfoService } from '../services/supabase';
import { aiService } from '../services/aiService';
import AIAdviceCard from '../components/AIAdviceCard';
import GuestGateBanner from '../components/GuestGateBanner';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

// ─── Kilo Takibi Paneli ───────────────────────────────────────────────────────
function WeightPanel({ onWeightChange }) {
  const [weights, setWeights] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => { loadWeights(); }, []);

  const statsForList = (list) => {
    if (!list?.length) return null;
    const latest = list[0].weight;
    const oldest = list[list.length - 1].weight;
    const totalChange = latest - oldest;
    const average = list.reduce((s, w) => s + w.weight, 0) / list.length;
    return { latest, oldest, totalChange, average: average.toFixed(1) };
  };

  const runWeightAIAdvice = async (list) => {
    const w = list ?? weights;
    const st = statsForList(w);
    if (!st) return;
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const result = await aiService.getWeightTrackingAdvice({ weights: w, stats: st });
      setAiAdvice(result.advice || '');
    } catch {
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const loadWeights = async () => {
    try {
      const data = await weightService.getAll();
      setWeights(data || []);
      if (data?.length) runWeightAIAdvice(data);
      else {
        setAiAdvice('');
        setLoadingAdvice(false);
      }
    } catch {
      Alert.alert('⚠️ Yükleme Hatası', 'Kilo kayıtlarınız yüklenirken bir sorun oluştu.');
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
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const saveWeight = async () => {
    if (!weight) { Alert.alert('⚠️ Uyarı', 'Lütfen kilonuzu girin.'); return; }
    const parsedWeight = parseFloat(weight);
    try {
      const weightData = {
        date: selectedDate.toISOString().split('T')[0],
        weight: parsedWeight,
        notes,
      };
      if (editingId) {
        await weightService.update(editingId, weightData);
        Alert.alert('✅ Güncellendi', 'Kilo kaydınız güncellendi.');
      } else {
        await weightService.create(weightData);
        Alert.alert('✅ Kaydedildi', 'Yeni kilo kaydı eklendi.');
      }
      setModalVisible(false);
      await loadWeights();

      // En son kiloya göre body_info'yu sessizce senkronize et
      const latestRecord = await weightService.getLatest();
      if (latestRecord) {
        await bodyInfoService.syncWeight(latestRecord.weight);
        onWeightChange(latestRecord.weight);
      }
    } catch (error) {
      if (error.code === 'DUPLICATE_DATE') {
        Alert.alert('📆 Aynı Gün Kaydı', error.message);
      } else {
        Alert.alert('⚠️ İşlem Başarısız', 'Kilo kaydı kaydedilirken bir hata oluştu.');
      }
    }
  };

  const deleteWeight = (id) => {
    Alert.alert('🗑️ Kaydı Sil', 'Bu kilo kaydını silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await weightService.delete(id);
            await loadWeights();

            // Silme sonrası yeni en son kiloyu senkronize et
            const latestRecord = await weightService.getLatest();
            await bodyInfoService.syncWeight(latestRecord ? latestRecord.weight : null);
            onWeightChange(latestRecord ? latestRecord.weight : null);
          } catch {
            Alert.alert('⚠️ Silme Başarısız', 'Lütfen tekrar deneyin.');
          }
        },
      },
    ]);
  };

  const getStats = () => {
    if (weights.length === 0) return null;
    const latest = weights[0].weight;
    const oldest = weights[weights.length - 1].weight;
    const totalChange = latest - oldest;
    const average = weights.reduce((s, w) => s + w.weight, 0) / weights.length;
    return { latest, oldest, totalChange, average: average.toFixed(1) };
  };

  const stats = getStats();

  const calculateChange = (index) =>
    index < weights.length - 1 ? weights[index].weight - weights[index + 1].weight : null;

  const formatDate = (ds) =>
    new Date(ds).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  return (
    <View style={{ flex: 1 }}>
      {stats && (
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.statsHeader}
        >
          <MiniStat label="Mevcut" value={`${stats.latest} kg`} icon="fitness" />
          <MiniStat
            label="Değişim"
            value={`${stats.totalChange > 0 ? '+' : ''}${stats.totalChange.toFixed(1)} kg`}
            icon={stats.totalChange < 0 ? 'trending-down' : 'trending-up'}
          />
          <MiniStat label="Ortalama" value={`${stats.average} kg`} icon="stats-chart" />
        </LinearGradient>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            padding: SIZES.containerPadding,
            paddingBottom:
              stats && (loadingAdvice || aiAdvice) ? SIZES.md : 100,
          }}
        >
        <View style={s.listHeader}>
          <Text style={s.listTitle}>Kilo Geçmişi</Text>
          <Text style={s.listSub}>{weights.length} kayıt</Text>
        </View>

        {weights.length > 0 && (
          <View style={s.infoMsg}>
            <Ionicons name="information-circle" size={15} color={COLORS.info} />
            <Text style={s.infoText}>Düzenlemek için dokunun, silmek için basılı tutun</Text>
          </View>
        )}

        {weights.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="scale-outline" size={60} color={COLORS.textLight} />
            <Text style={s.emptyText}>Henüz kilo kaydı yok</Text>
            <Text style={s.emptySub}>Başlamak için + butonuna tıklayın</Text>
          </View>
        ) : (
          weights.map((record, index) => {
            const change = calculateChange(index);
            return (
              <TouchableOpacity
                key={record.id}
                style={s.recordCard}
                onPress={() => openEditModal(record)}
                onLongPress={() => deleteWeight(record.id)}
                activeOpacity={0.7}
              >
                <View style={s.recordTop}>
                  <Text style={s.recordDateText}>{formatDate(record.date)}</Text>
                  {change !== null && (
                    <View style={[s.changeBadge, { backgroundColor: change < 0 ? COLORS.success : COLORS.warning }]}>
                      <Text style={s.changeText}>{change > 0 ? '+' : ''}{change.toFixed(1)} kg</Text>
                    </View>
                  )}
                </View>
                <View style={s.recordBottom}>
                  <Text style={s.recordWeight}>{record.weight}</Text>
                  <Text style={s.recordUnit}>kg</Text>
                  {record.notes ? <Text style={s.recordNotes} numberOfLines={1}>{record.notes}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        </View>

        {stats && (loadingAdvice || aiAdvice) ? (
          <View style={{ marginBottom: 100 }}>
            <AIAdviceCard
              visible
              loading={loadingAdvice}
              advice={aiAdvice}
              onRefresh={() => runWeightAIAdvice()}
              gradientColors={[COLORS.primary, COLORS.primaryLight]}
              iconTint={COLORS.primary}
              subtitle="Kilo kayıtlarınıza göre kişiselleştirilir"
              footerDisclaimer="Bu tavsiye genel bilgilendirme amaçlıdır; tıbbi teşhis ve tedavi yerine geçmez."
            />
          </View>
        ) : null}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openAddModal} activeOpacity={0.8}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.fabGradient}>
          <Text style={s.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Kayıt Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalBox}>
                  <View style={s.modalHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SIZES.sm }}>
                      <Ionicons name={editingId ? 'create' : 'add-circle'} size={22} color={COLORS.primary} />
                      <Text style={s.modalTitle}>{editingId ? 'Düzenle' : 'Yeni Kayıt'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}>
                      <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Tarih</Text>
                      <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        <Text style={s.dateBtnText}>
                          {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                      {showDatePicker && (
                        <View style={s.datePickerWrap}>
                          <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            locale="tr-TR"
                            maximumDate={new Date()}
                          />
                          {Platform.OS === 'ios' && (
                            <TouchableOpacity style={s.datePickerClose} onPress={() => setShowDatePicker(false)}>
                              <Text style={s.datePickerCloseText}>Tamam</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Kilo (kg)</Text>
                      <View style={s.textInputWrap}>
                        <Ionicons name="fitness" size={20} color={COLORS.primary} />
                        <TextInput
                          style={s.textInput}
                          value={weight}
                          onChangeText={setWeight}
                          placeholder="75.5"
                          keyboardType="decimal-pad"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>

                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Notlar (Opsiyonel)</Text>
                      <View style={[s.textInputWrap, { alignItems: 'flex-start' }]}>
                        <Ionicons name="document-text" size={20} color={COLORS.primary} style={{ marginTop: 2 }} />
                        <TextInput
                          style={[s.textInput, { minHeight: 72, textAlignVertical: 'top' }]}
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Notlarınızı yazın..."
                          multiline
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>
                  </ScrollView>

                  <View style={s.modalFoot}>
                    <TouchableOpacity style={[s.modalActionBtn, s.cancelBtnStyle]} onPress={() => setModalVisible(false)}>
                      <Text style={s.cancelBtnText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.modalActionBtn, { overflow: 'hidden' }]} onPress={saveWeight}>
                      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.saveBtnGradient}>
                        <Text style={s.saveBtnText}>Kaydet</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ─── VKİ Paneli ───────────────────────────────────────────────────────────────
function BMIPanel({ latestWeight }) {
  const [loading, setLoading] = useState(true);
  const [bodyInfo, setBodyInfo] = useState({ height: '', age: '', gender: 'male', weight: '' });
  const [existingId, setExistingId] = useState(null);
  const [isSaved, setIsSaved] = useState(false); // VKİ ancak kaydedildikten sonra gösterilir
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [bulletRecs, setBulletRecs] = useState([]);
  const [loadingBullets, setLoadingBullets] = useState(false);

  const parsedWeight = () => {
    const w = parseFloat(bodyInfo.weight);
    return Number.isFinite(w) && w > 0 ? w : null;
  };

  // BMI hesapla
  const computeBMI = (height, weightStr) => {
    const h = parseFloat(height);
    const wt = parseFloat(weightStr);
    if (!h || !wt || h <= 0 || wt <= 0) return null;
    return (wt / ((h / 100) * (h / 100))).toFixed(1);
  };

  const bmi = computeBMI(bodyInfo.height, bodyInfo.weight);

  const bmiCategory = (() => {
    if (!bmi) return null;
    const v = parseFloat(bmi);
    if (v < 18.5) return { name: 'Zayıf',        color: COLORS.info,    icon: 'trending-down'    };
    if (v < 25)   return { name: 'Normal',        color: COLORS.success, icon: 'checkmark-circle' };
    if (v < 30)   return { name: 'Fazla Kilolu',  color: COLORS.warning, icon: 'alert-circle'     };
    return              { name: 'Obez',          color: COLORS.error,   icon: 'close-circle'     };
  })();

  useEffect(() => { loadBodyInfo(); }, []);

  const loadBodyInfo = async () => {
    try {
      const data = await bodyInfoService.getLatest();
      if (data) {
        const h = data.height?.toString() || '';
        const a = data.age?.toString() || '';
        const g = data.gender || 'male';
        const w =
          data.weight != null
            ? String(data.weight)
            : latestWeight != null
              ? String(latestWeight)
              : '';
        setBodyInfo({ height: h, age: a, gender: g, weight: w });
        setExistingId(data.id);
        setIsSaved(true);
        const pw = parseFloat(w);
        if (h && a && Number.isFinite(pw) && pw > 0) {
          const payload = {
            height: parseFloat(h),
            age: parseInt(a, 10),
            gender: g,
            weight: pw,
          };
          fetchAIAdvice(payload);
          fetchBulletRecommendations(payload);
        }
      } else {
        setBodyInfo({
          height: '',
          age: '',
          gender: 'male',
          weight: latestWeight != null ? String(latestWeight) : '',
        });
        setExistingId(null);
        setIsSaved(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // AI tavsiyesini inline çek (modal yok)
  const fetchAIAdvice = async (params) => {
    const pw = parsedWeight();
    const p = params || {
      height: parseFloat(bodyInfo.height),
      weight: pw,
      age: parseInt(bodyInfo.age, 10),
      gender: bodyInfo.gender,
    };
    if (!params && (!pw || !bodyInfo.height)) return;
    const currentBMI = computeBMI(p.height?.toString(), String(p.weight));
    const cat = (() => {
      if (!currentBMI) return null;
      const v = parseFloat(currentBMI);
      if (v < 18.5) return 'Zayıf';
      if (v < 25)   return 'Normal';
      if (v < 30)   return 'Fazla Kilolu';
      return 'Obez';
    })();
    if (!currentBMI || !cat || p.weight == null || Number(p.weight) <= 0) return;
    setLoadingAdvice(true);
    setAiAdvice('');
    try {
      const result = await aiService.getBMIAdvice({
        bmi: parseFloat(currentBMI),
        category: cat,
        height: p.height,
        weight: p.weight,
        age: p.age,
        gender: p.gender,
      });
      setAiAdvice(result.advice || '');
    } catch {
      setAiAdvice('⚠️ Tavsiye alınırken bir hata oluştu.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const fetchBulletRecommendations = async (params) => {
    const pw = parsedWeight();
    const p = params || {
      height: parseFloat(bodyInfo.height),
      weight: pw,
      age: parseInt(bodyInfo.age, 10),
      gender: bodyInfo.gender,
    };
    if (!params && (!pw || !bodyInfo.height)) return;
    const currentBMI = computeBMI(p.height?.toString(), String(p.weight));
    const cat = (() => {
      if (!currentBMI) return null;
      const v = parseFloat(currentBMI);
      if (v < 18.5) return 'Zayıf';
      if (v < 25) return 'Normal';
      if (v < 30) return 'Fazla Kilolu';
      return 'Obez';
    })();
    if (!currentBMI || !cat || p.weight == null || Number(p.weight) <= 0) return;

    setLoadingBullets(true);
    setBulletRecs([]);
    try {
      const result = await aiService.getBMIBulletRecommendations({
        bmi: parseFloat(currentBMI),
        category: cat,
        height: p.height,
        weight: p.weight,
        age: p.age,
        gender: p.gender,
      });
      setBulletRecs(result.bullets || []);
    } catch {
      setBulletRecs(aiService.getFallbackBMIBullets(cat));
    } finally {
      setLoadingBullets(false);
    }
  };

  const refreshBMIInsights = () => {
    fetchAIAdvice();
    fetchBulletRecommendations();
  };

  const saveBodyInfo = async () => {
    if (!bodyInfo.height || !bodyInfo.age) {
      Alert.alert('⚠️ Uyarı', 'Lütfen boy ve yaş alanlarını doldurun.');
      return;
    }
    const w = parsedWeight();
    if (!w) {
      Alert.alert('⚠️ Kilo Eksik', 'Lütfen geçerli bir kilo değeri girin.');
      return;
    }
    try {
      const data = {
        height: parseFloat(bodyInfo.height),
        weight: w,
        age: parseInt(bodyInfo.age, 10),
        gender: bodyInfo.gender,
      };
      if (existingId) {
        await bodyInfoService.update(existingId, data);
        setIsSaved(true);
      } else {
        const newInfo = await bodyInfoService.create(data);
        setExistingId(newInfo.id);
        setIsSaved(true);
      }

      Alert.alert('✅ Kaydedildi', 'Bilgileriniz güncellendi. AI tavsiyesi hazırlanıyor...');
      fetchAIAdvice(data);
      fetchBulletRecommendations(data);
    } catch {
      Alert.alert('❌ Hata', 'Vücut bilgileri kaydedilirken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.listContent}>

      <View style={s.syncBadge}>
        <Ionicons name="information-circle" size={16} color={COLORS.info} />
        <Text style={s.syncText}>
          Bu kilo VKİ ve profil bilginiz için saklanır. Kilo takibindeki tarihli ölçümlerinizi değiştirmez;
          ölçüm eklemek için &quot;Kilo Takibi&quot; sekmesini kullanın. Oradan eklediğiniz son kilo, mümkünse buraya da yansır.
        </Text>
      </View>

      {/* Form: Boy, Yaş, Cinsiyet */}
      <Text style={s.sectionTitle}>Temel Bilgiler</Text>

      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Boy (cm)</Text>
        <View style={s.textInputWrap}>
          <Ionicons name="resize" size={20} color={COLORS.primary} />
          <TextInput
            style={s.textInput}
            value={bodyInfo.height}
            onChangeText={(t) => { setBodyInfo({ ...bodyInfo, height: t }); setIsSaved(false); }}
            placeholder="175"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>

      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Kilo (kg)</Text>
        <View style={s.textInputWrap}>
          <Ionicons name="fitness" size={20} color={COLORS.primary} />
          <TextInput
            style={s.textInput}
            value={bodyInfo.weight}
            onChangeText={(t) => {
              setBodyInfo({ ...bodyInfo, weight: t });
              setIsSaved(false);
            }}
            placeholder="72.5"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>

      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Yaş</Text>
        <View style={s.textInputWrap}>
          <Ionicons name="calendar" size={20} color={COLORS.primary} />
          <TextInput
            style={s.textInput}
            value={bodyInfo.age}
            onChangeText={(t) => { setBodyInfo({ ...bodyInfo, age: t }); setIsSaved(false); }}
            placeholder="30"
            keyboardType="number-pad"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>

      <View style={s.inputGroup}>
        <Text style={s.inputLabel}>Cinsiyet</Text>
        <View style={{ flexDirection: 'row', gap: SIZES.md }}>
          {[{ key: 'male', label: 'Erkek' }, { key: 'female', label: 'Kadın' }].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.genderBtn, bodyInfo.gender === key && s.genderBtnActive]}
              onPress={() => { setBodyInfo({ ...bodyInfo, gender: key }); setIsSaved(false); }}
            >
              <Ionicons name={key} size={22} color={bodyInfo.gender === key ? COLORS.textOnPrimary : COLORS.textSecondary} />
              <Text style={[s.genderText, bodyInfo.gender === key && { color: COLORS.textOnPrimary }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={saveBodyInfo}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={s.saveBtnGradient}>
          <Ionicons name="save" size={18} color={COLORS.textOnPrimary} />
          <Text style={s.saveBtnText}>Kaydet</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* VKİ Sonuç — sadece kaydedildikten sonra göster */}
      {isSaved && bmi && bmiCategory && (
        <>
          <Text style={[s.sectionTitle, { marginTop: SIZES.xl }]}>Vücut Kitle İndeksi (VKİ)</Text>
          <View style={s.bmiCard}>
            <LinearGradient
              colors={[bmiCategory.color, bmiCategory.color + 'CC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.bmiGradient}
            >
              <View style={s.bmiIconCircle}>
                <Ionicons name={bmiCategory.icon} size={38} color={COLORS.textOnPrimary} />
              </View>
              <Text style={s.bmiVal}>{bmi}</Text>
              <Text style={s.bmiCat}>{bmiCategory.name}</Text>
            </LinearGradient>
          </View>

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
            <AIAdviceCard
              visible
              loading={loadingAdvice}
              advice={aiAdvice}
              onRefresh={refreshBMIInsights}
              gradientColors={[bmiCategory.color, `${bmiCategory.color}BB`]}
              iconTint={bmiCategory.color}
              subtitle="VKİ ve profilinize göre kişiselleştirilir"
            />
          )}
        </>
      )}

      {/* Öneriler — yapay zeka (kısa maddeler) */}
      {isSaved && bmi && bmiCategory && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SIZES.xl, marginBottom: SIZES.sm }}>
            <Text style={s.sectionTitle}>Öneriler</Text>
            <TouchableOpacity
              onPress={refreshBMIInsights}
              disabled={loadingBullets || loadingAdvice}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: loadingBullets || loadingAdvice ? 0.5 : 1 }}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
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
                <View style={s.recIcon}>
                  <Ionicons name="sparkles" size={16} color={bmiCategory.color} />
                </View>
                <Text style={s.recText}>{rec}</Text>
              </View>
            ))
          )}
        </>
      )}

      {/* Tıbbi Uyarı — Modern Banner */}
      <LinearGradient
        colors={[COLORS.disclaimerBackground, COLORS.disclaimerBackgroundEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.disclaimerBanner}
      >
        <View style={s.disclaimerIconWrap}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.disclaimerIcon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.disclaimerBannerTitle}>Tıbbi Uyarı</Text>
          <Text style={s.disclaimerBannerText}>
            Bu uygulama kişisel takip ve genel bilgilendirme amaçlıdır. VKİ hesaplamaları ve öneriler tıbbi teşhis yerine geçmez. Sağlığınız için bir doktor veya diyetisyene danışınız.
          </Text>
        </View>
      </LinearGradient>

      {/* Kaynaklar — Modern Kart */}
      <View style={s.sourcesCard}>
        <View style={s.sourcesHeader}>
          <View style={s.sourcesIconWrap}>
            <Ionicons name="library" size={16} color={COLORS.primary} />
          </View>
          <Text style={s.sourcesTitle}>Bilimsel Kaynaklar</Text>
        </View>

        {[
          {
            org: 'WHO',
            label: 'Obezite ve VKİ Sınıflandırması',
            url: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',
            icon: 'globe-outline',
            color: COLORS.primaryDark,
          },
          {
            org: 'Sağlık Bakanlığı',
            label: 'Türkiye Beslenme Rehberi (TÜBER)',
            url: 'https://hsgm.saglik.gov.tr/tr/beslenme',
            icon: 'medkit-outline',
            color: COLORS.primary,
          },
          {
            org: 'NIH',
            label: 'Body Mass Index Classification',
            url: 'https://www.nhlbi.nih.gov/health/educational/lose_wt/BMI/bmicalc.htm',
            icon: 'flask-outline',
            color: COLORS.info,
          },
        ].map(({ org, label, url, icon, color }, i, arr) => (
          <View key={org}>
            <TouchableOpacity
              style={s.sourceRow}
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.65}
            >
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

      {/* Modal kaldırıldı — AI tavsiyesi artık inline gösteriliyor */}
    </ScrollView>
  );
}

// ─── Ana Ekran (Segment Control + Panel Yönetimi) ─────────────────────────────
export default function WeightAndBMIScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('weight');
  // Kilo takibinden gelen en son kilo — her iki panel bu değeri paylaşır
  const [latestWeight, setLatestWeight] = useState(null);

  useEffect(() => {
    if (!user) {
      setLatestWeight(null);
      return;
    }
    loadLatestWeight();
  }, [user]);

  const loadLatestWeight = async () => {
    if (!user) return;
    try {
      const record = await weightService.getLatest();
      setLatestWeight(record ? record.weight : null);
    } catch (_) {}
  };

  const handleWeightChange = (newWeight) => {
    setLatestWeight(newWeight);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 8) + 10 }]}
      >
        <Text style={s.headerTitle}>Kilo ve VKİ</Text>
        <View style={s.segmentWrap}>
          <TouchableOpacity
            style={[s.segmentBtn, activeTab === 'weight' && s.segmentBtnActive]}
            onPress={() => setActiveTab('weight')}
            activeOpacity={0.8}
          >
            <Ionicons name="fitness" size={16} color={activeTab === 'weight' ? COLORS.primary : 'rgba(255,255,255,0.7)'} />
            <Text style={[s.segmentText, activeTab === 'weight' && s.segmentTextActive]}>Kilo Takibi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segmentBtn, activeTab === 'bmi' && s.segmentBtnActive]}
            onPress={() => setActiveTab('bmi')}
            activeOpacity={0.8}
          >
            <Ionicons name="body" size={16} color={activeTab === 'bmi' ? COLORS.primary : 'rgba(255,255,255,0.7)'} />
            <Text style={[s.segmentText, activeTab === 'bmi' && s.segmentTextActive]}>VKİ</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {!user ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: SIZES.containerPadding, paddingBottom: 40 }}>
          <GuestGateBanner
            navigation={navigation}
            message="Kilo takibi ve VKİ kayıtları hesabınıza bağlıdır. Kaydetmek ve yapay zeka önerileri almak için giriş yapın."
          />
        </ScrollView>
      ) : activeTab === 'weight' ? (
        <WeightPanel onWeightChange={handleWeightChange} />
      ) : (
        <BMIPanel latestWeight={latestWeight} />
      )}
    </View>
  );
}

// ─── Yardımcı Bileşenler ──────────────────────────────────────────────────────
const MiniStat = ({ label, value, icon }) => (
  <View style={s.miniStat}>
    <Ionicons name={icon} size={24} color={COLORS.textOnPrimary} />
    <Text style={s.miniStatVal}>{value}</Text>
    <Text style={s.miniStatLabel}>{label}</Text>
  </View>
);

// ─── Stiller ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingBottom: 16,
    paddingHorizontal: SIZES.containerPadding,
    alignItems: 'center',
    gap: SIZES.md,
  },
  headerTitle: { fontSize: SIZES.h3, fontWeight: '800', letterSpacing: -0.35, color: COLORS.textOnPrimary },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: SIZES.radiusMedium,
    padding: 3,
    width: '100%',
  },
  segmentBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: SIZES.radiusSmall, gap: 6,
  },
  segmentBtnActive: { backgroundColor: COLORS.surface },
  segmentText: { fontSize: SIZES.small, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  segmentTextActive: { color: COLORS.primary },

  // Senkronizasyon badge'leri
  syncBadge: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: COLORS.info + '12',
    borderRadius: SIZES.radiusMedium,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.info + '35',
  },
  syncText: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  statsHeader: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: SIZES.containerPadding, paddingVertical: SIZES.md,
  },
  miniStat: { alignItems: 'center' },
  miniStatVal: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary, marginTop: 4 },
  miniStatLabel: { fontSize: SIZES.tiny, color: COLORS.textOnPrimary, opacity: 0.85 },

  listContent: { padding: SIZES.containerPadding, paddingBottom: 100 },
  listHeader: { marginBottom: SIZES.md },
  listTitle: { fontSize: SIZES.h3, fontWeight: '700', color: COLORS.text },
  listSub: { fontSize: SIZES.small, color: COLORS.textSecondary, marginTop: 2 },
  infoMsg: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.highlight, borderRadius: SIZES.radiusSmall,
    paddingHorizontal: SIZES.sm, paddingVertical: 6, marginBottom: SIZES.md,
  },
  infoText: { fontSize: SIZES.small, color: COLORS.textSecondary, flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary, marginTop: SIZES.md },
  emptySub: { fontSize: SIZES.body, color: COLORS.textLight, marginTop: 4 },

  recordCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLarge,
    padding: SIZES.md, marginBottom: SIZES.md, ...SHADOWS.small,
  },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  recordDateText: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary },
  changeBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 3, borderRadius: SIZES.radiusSmall },
  changeText: { fontSize: SIZES.tiny, fontWeight: '700', color: COLORS.textOnPrimary },
  recordBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  recordWeight: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.primary },
  recordUnit: { fontSize: SIZES.h4, fontWeight: '600', color: COLORS.textSecondary },
  recordNotes: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, marginLeft: SIZES.sm },

  fab: { position: 'absolute', bottom: SIZES.lg, right: SIZES.lg, width: 60, height: 60, borderRadius: 30, overflow: 'hidden', ...SHADOWS.large },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fabText: { fontSize: 32, fontWeight: '300', color: COLORS.textOnPrimary },

  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.radiusXL, borderTopRightRadius: SIZES.radiusXL, maxHeight: '90%' },
  modalHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SIZES.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  modalTitle: { fontSize: SIZES.h4, fontWeight: '700', color: COLORS.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: SIZES.lg },
  modalFoot: {
    flexDirection: 'row', gap: SIZES.md,
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.lg,
    borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.surface,
  },
  modalActionBtn: { flex: 1, height: 52, borderRadius: SIZES.radiusMedium },
  cancelBtnStyle: { backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: SIZES.h5, fontWeight: '600', color: COLORS.textSecondary },
  saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 },
  saveBtnText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },

  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm },
  dateBtnText: { flex: 1, fontSize: SIZES.body, fontWeight: '600', color: COLORS.text },
  datePickerWrap: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, marginTop: SIZES.sm, overflow: 'hidden' },
  datePickerClose: { backgroundColor: COLORS.primary, paddingVertical: SIZES.md, alignItems: 'center' },
  datePickerCloseText: { fontSize: SIZES.h5, fontWeight: '700', color: COLORS.textOnPrimary },

  inputGroup: { marginBottom: SIZES.md },
  inputLabel: { fontSize: SIZES.small, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  textInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusMedium, paddingHorizontal: SIZES.md, gap: SIZES.sm },
  textInput: { flex: 1, fontSize: SIZES.h4, fontWeight: '600', color: COLORS.text, paddingVertical: SIZES.md },

  sectionTitle: { fontSize: SIZES.h3, fontWeight: '700', color: COLORS.text, marginBottom: SIZES.md },
  saveBtn: { borderRadius: SIZES.radiusMedium, overflow: 'hidden', height: 52, ...SHADOWS.medium },
  genderBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, padding: SIZES.md, gap: SIZES.sm, ...SHADOWS.small },
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

  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.sm, backgroundColor: COLORS.disclaimerBackground, borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginTop: SIZES.xl, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.disclaimerBorder },
  warningText: { flex: 1, fontSize: SIZES.tiny, color: COLORS.disclaimerText, lineHeight: 18 },
  citationsBox: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusMedium, padding: SIZES.md, marginBottom: SIZES.xl, gap: SIZES.xs, ...SHADOWS.small },
  citationsTitle: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  citationLink: { fontSize: SIZES.tiny, color: COLORS.info, lineHeight: 20, textDecorationLine: 'underline' },

  // Modern Tıbbi Uyarı Banner
  disclaimerBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SIZES.md,
    borderRadius: SIZES.radiusLarge, padding: SIZES.md,
    marginTop: SIZES.xl, marginBottom: SIZES.md,
    borderWidth: 1, borderColor: COLORS.disclaimerBorder,
    ...SHADOWS.small,
  },
  disclaimerIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.overlayLight,
    justifyContent: 'center', alignItems: 'center',
  },
  disclaimerBannerTitle: { fontSize: SIZES.small, fontWeight: '700', color: COLORS.disclaimerTitle, marginBottom: 3 },
  disclaimerBannerText: { fontSize: SIZES.tiny, color: COLORS.disclaimerText, lineHeight: 18 },

  // Modern Kaynaklar Kartı
  sourcesCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLarge,
    marginBottom: SIZES.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  sourcesHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    paddingHorizontal: SIZES.md, paddingTop: SIZES.md, paddingBottom: SIZES.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  sourcesIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.highlight,
    justifyContent: 'center', alignItems: 'center',
  },
  sourcesTitle: { fontSize: SIZES.body, fontWeight: '700', color: COLORS.text },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingVertical: 14, gap: SIZES.sm,
  },
  sourceOrgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SIZES.sm, paddingVertical: 4,
    borderRadius: SIZES.radiusSmall,
    minWidth: 80,
  },
  sourceOrgText: { fontSize: SIZES.tiny, fontWeight: '700' },
  sourceLabelText: { flex: 1, fontSize: SIZES.small, color: COLORS.textSecondary, lineHeight: 18 },
  sourceDivider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SIZES.md },

  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: SIZES.radiusSmall, padding: SIZES.sm, marginTop: SIZES.md },
  disclaimerText: { flex: 1, fontSize: SIZES.tiny, color: COLORS.textSecondary, lineHeight: 17 },
});
