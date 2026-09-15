import React from 'react';
import { View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomSheet from './BottomSheet';
import AppButton from './AppButton';

/** Tarih seçici alt sayfası — BottomSheet üstünde. */
export default function DatePickerSheet({ visible, onClose, value, onChange, title = 'Tarih Seç', maximumDate, minimumDate }) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      keyboard={false}
      scroll={false}
      footer={<AppButton title="Tamam" fullWidth onPress={onClose} />}
    >
      <View style={styles.pickerWrap}>
        <DateTimePicker
          value={value}
          mode="date"
          display="spinner"
          onChange={onChange}
          locale="tr-TR"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          style={styles.picker}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  pickerWrap: { alignItems: 'center' },
  picker: { width: '100%' },
});
