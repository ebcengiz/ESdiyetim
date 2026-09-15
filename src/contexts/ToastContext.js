import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import Toast from '../components/ui/Toast';

const ToastContext = createContext(null);

/**
 * Toast kuyruğu — art arda gelen mesajlar üst üste binmez, sırayla gösterilir.
 * Aynı mesaj kuyrukta zaten varsa tekrar eklenmez (ör. 3 paralel isteğin aynı ağ hatası).
 *
 *   showToast('Kaydedildi.', 'success')
 *   showToast('Sunucuya ulaşılamıyor.', 'error', { action: { label: 'Tekrar dene', onPress: reload } })
 */
export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null); // { id, message, type, action, duration }
  const queueRef = useRef([]);
  const idRef = useRef(0);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() || null;
    setCurrent(next);
  }, []);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    if (!message) return;
    const item = { id: ++idRef.current, message: String(message), type, action: options.action, duration: options.duration };
    setCurrent((cur) => {
      if (!cur) return item;
      // Aynı metin gösteriliyor veya sırada → tekrar ekleme
      if (cur.message === item.message || queueRef.current.some((q) => q.message === item.message)) return cur;
      queueRef.current.push(item);
      return cur;
    });
  }, []);

  const hideToast = useCallback(() => {
    queueRef.current = [];
    setCurrent(null);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        key={current?.id}
        visible={!!current}
        type={current?.type}
        message={current?.message}
        action={current?.action}
        duration={current?.duration}
        onHide={showNext}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
