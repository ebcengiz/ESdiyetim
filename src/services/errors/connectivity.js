// Bağlantı durumu — @react-native-community/netinfo sarmalayıcı.
//
// normalizeError() ağ hatasını "çevrimdışı" mı yoksa "sunucuya ulaşılamıyor" mu
// diye ayırmak için senkron son bilinen durumu okur; OfflineBanner (Adım 2)
// subscribeConnectivity ile dinler.

import NetInfo from '@react-native-community/netinfo';

let state = { isConnected: true, isInternetReachable: null };
let unsubscribe = null;
const listeners = new Set();

function apply(next) {
  state = {
    isConnected: next?.isConnected !== false,
    isInternetReachable: next?.isInternetReachable ?? null,
  };
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch {
      /* dinleyici hatası uygulamayı durdurmasın */
    }
  });
}

/** Uygulama açılışında bir kez çağrılır (App.js) */
export function startConnectivityWatch() {
  if (unsubscribe) return;
  try {
    unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply).catch(() => {});
  } catch (e) {
    // Native modül yoksa (çok eski Expo Go vb.) her zaman "bağlı" varsay.
    console.warn('Netinfo başlatılamadı:', e?.message);
  }
}

export function stopConnectivityWatch() {
  unsubscribe?.();
  unsubscribe = null;
}

export function getConnectionState() {
  return state;
}

/** Cihaz internete bağlı görünüyor mu (bilinmiyorsa iyimser: true) */
export function isOnline() {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function subscribeConnectivity(fn) {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}
