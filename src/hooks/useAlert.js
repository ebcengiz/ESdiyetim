import { Alert } from 'react-native';

/**
 * Tutarlı alert mesajları için yardımcı hook.
 * 73 Alert.alert() çağrısını standartlaştırır.
 */
export const useAlert = () => {
  const showError = (message, title = 'Hata') => {
    Alert.alert(`❌ ${title}`, message);
  };

  const showSuccess = (message, title = 'Başarılı') => {
    Alert.alert(`✅ ${title}`, message);
  };

  const showWarning = (message, title = 'Uyarı') => {
    Alert.alert(`⚠️ ${title}`, message);
  };

  const showConfirm = (title, message, onConfirm, destructive = false) => {
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel' },
      {
        text: destructive ? 'Sil' : 'Tamam',
        style: destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);
  };

  const showDeleteConfirm = (itemName, onConfirm) => {
    showConfirm(
      `🗑️ ${itemName} Sil`,
      `Bu ${itemName.toLowerCase()}ı silmek istediğinizden emin misiniz?`,
      onConfirm,
      true
    );
  };

  return { showError, showSuccess, showWarning, showConfirm, showDeleteConfirm };
};
