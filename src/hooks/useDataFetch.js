import { useState, useEffect, useCallback } from 'react';
import { useAppError } from './useAppError';

/**
 * Asenkron veri yükleme için hook.
 * loading/error/data state döngüsünü otomatik yönetir; hata olursa kullanıcıya
 * yalnızca normalize edilmiş (teknik olmayan) mesaj toast olarak gösterilir.
 *
 * @param {function} fetchFn - async fonksiyon, veriyi döndürmeli
 * @param {object} options
 * @param {boolean} options.immediate - mount'ta hemen çağır (default: true)
 * @param {string}  options.context   - log etiketi (ör. 'goals.list')
 * @param {boolean} options.silent    - hata toast'ı gösterme (ekran kendi ErrorState'ini çizer)
 */
export const useDataFetch = (fetchFn, { immediate = true, context = 'dataFetch', silent = false } = {}) => {
  const { handleError } = useAppError();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // AppError | null

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result || []);
      return result;
    } catch (e) {
      setError(handleError(e, { context, silent }));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFn, context, silent, handleError]);

  useEffect(() => {
    if (immediate) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, setData, loading, error, refresh: fetch };
};
