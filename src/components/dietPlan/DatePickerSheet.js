import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES } from '../../constants/theme';

export default function DatePickerSheet({ visible, onClose, value, onChange }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Tarih Seç</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            onChange={onChange}
            locale="tr-TR"
            style={{ width: '100%' }}
          />
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.doneGradient}
            >
              <Text style={styles.doneText}>Tamam</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.containerPadding, paddingVertical: SIZES.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: SIZES.h4, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  doneBtn: {
    marginHorizontal: SIZES.containerPadding, marginTop: SIZES.sm,
    borderRadius: SIZES.radiusMedium, overflow: 'hidden',
  },
  doneGradient: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  doneText: { fontSize: SIZES.body, fontWeight: '700', color: '#fff' },
});
