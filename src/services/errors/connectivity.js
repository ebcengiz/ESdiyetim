// Bağlantı durumu — @react-native-community/netinfo sarmalayıcı.
//
// normalizeError() ağ hatasını "çevrimdışı" mı yoksa "sunucuya ulaşılamıyor" mu
// diye ayırmak için senkron son bilinen durumu okur; OfflineBanner (Adım 2)
// subscribeConnectivity ile dinler.

// DİKKAT: netinfo, native modül yoksa (yeniden build alınmamış dev build / eski
// TestFlight binary'si) MODÜL YÜKLENİRKEN throw eder. Bu yüzden `import` yerine
// try/catch içinde require: en kötü durumda "her zaman bağlı" varsayılır, uygulama
// açılışta çökmez.
//
// Bu require MODÜL KAPSAMINDA (ilk bundle yüklemesi sırasında) olmalı: Metro,
// runtime'da (ör. useEffect içinde) yapılan bir require hata verirse throw etmek
// yerine ErrorUtils.reportFatalError çağırır ve try/catch yakalayamaz
// (metro-runtime/src/polyfills/require.js → guardedLoadModule/inGuard).
let NetInfo = null;
try {
  // eslint-disable-next-line global-require
  const mod = require('@react-native-community/netinfo');
  NetInfo = mod?.default || mod;
} catch (e) {
  console.warn('Netinfo native modülü yok (build yenilenmeli):', String(e?.message || e).split('\n')[0]);
}

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
  if (!NetInfo) return; // her zaman "bağlı" varsay
  try {
    unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply).catch(() => {});
  } catch (e) {
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
