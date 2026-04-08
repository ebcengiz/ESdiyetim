import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

/**
 * Asenkron veri yükleme için hook.
 * loading/error/data state döngüsünü otomatik yönetir.
 *
 * @param {function} fetchFn - async fonksiyon, veriyi döndürmeli
 * @param {object} options
 * @param {boolean} options.immediate - mount'ta hemen çağır (default: true)
 * @param {string} options.errorMessage - hata mesajı başlığı
 */
export const useDataFetch = (fetchFn, { immediate = true, errorMessage = 'Yükleme Hatası' } = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result || []);
      return result;
    } catch (e) {
      setError(e.message);
      Alert.alert(`⚠️ ${errorMessage}`, e.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFn, errorMessage]);

  useEffect(() => {
    if (immediate) fetch();
  }, []);

  return { data, setData, loading, error, refresh: fetch };
};
