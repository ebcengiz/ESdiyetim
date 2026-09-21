/**
 * Expo, bu dosyayı app.json yerine okuyabilir.
 * dotenv ile kökteki .env yüklenir; EXPO_PUBLIC_* değişkenleri Metro'da kullanılır.
 * @see https://docs.expo.dev/guides/environment-variables/
 *
 * AdMob plugin'i burada (app.json'da değil) eklenir: App ID `.env`'den okunur,
 * yoksa Google'ın resmî TEST App ID'si kullanılır (dev build / simülatör için
 * yeterli; production build'de gerçek ID `.env`'de olmalı — bkz. REKLAM_ENTEGRASYON_REHBERI.md).
 */
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch (_) {
  // dotenv yoksa Expo yine de kendi .env yüklemesini dener
}

const base = require('./app.json');

// Google'ın herkese açık test App ID'leri (https://developers.google.com/admob/ios/test-ads)
const ADMOB_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const ADMOB_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

const admobIosAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || ADMOB_TEST_IOS_APP_ID;
const admobAndroidAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || ADMOB_TEST_ANDROID_APP_ID;

// Apple 5.1.2 — ATT metni: ne için, ne kazandığı ve reddin sonucu açık olmalı.
const USER_TRACKING_DESCRIPTION =
  'İzin verirseniz ücretsiz sürümdeki reklamlar ilgi alanlarınıza göre seçilir. Reddederseniz yalnızca genel reklam gösterilir; uygulama özellikleri değişmez.';

// Google'ın resmî SKAdNetwork listesi (AdMob + Google'a teklif veren ağlar).
// Kaynak: https://developers.google.com/admob/ios/3p-skadnetworks (2026-09-22 kopyası) —
// Google listeyi güncelledikçe buraya yansıt (eksik ID = o ağdan düşük fill).
const SK_AD_NETWORK_ITEMS = [
  'cstr6suwn9.skadnetwork', '4fzdc2evr5.skadnetwork', '2fnua5tdw4.skadnetwork', 'ydx93a7ass.skadnetwork',
  'p78axxw29g.skadnetwork', 'v72qych5uu.skadnetwork', 'ludvb6z3bs.skadnetwork', 'cp8zw746q7.skadnetwork',
  '3sh42y64q3.skadnetwork', 'c6k4g5qg8m.skadnetwork', 's39g8k73mm.skadnetwork', 'wg4vff78zm.skadnetwork',
  '3qy4746246.skadnetwork', 'f38h382jlk.skadnetwork', 'hs6bdukanm.skadnetwork', 'mlmmfzh3r3.skadnetwork',
  'v4nxqhlyqp.skadnetwork', 'wzmmz9fp6w.skadnetwork', 'su67r6k2v3.skadnetwork', 'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork', '7ug5zh24hu.skadnetwork', 'gta9lk7p23.skadnetwork', 'vutu7akeur.skadnetwork',
  'y5ghdn5j9k.skadnetwork', 'v9wttpbfk9.skadnetwork', 'n38lu8286q.skadnetwork', '47vhws6wlr.skadnetwork',
  'kbd757ywx3.skadnetwork', '9t245vhmpl.skadnetwork', 'a2p9lx4jpn.skadnetwork', '22mmun2rn5.skadnetwork',
  '44jx6755aq.skadnetwork', 'k674qkevps.skadnetwork', '4468km3ulz.skadnetwork', '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork', 'klf5c3l5u5.skadnetwork', 'ppxm28t8ap.skadnetwork', 'kbmxgpxpgc.skadnetwork',
  'uw77j35x4d.skadnetwork', '578prtvx9j.skadnetwork', '4dzt52r2t5.skadnetwork', 'tl55sbb4fm.skadnetwork',
  'c3frkrj4fj.skadnetwork', 'e5fvkxwrpn.skadnetwork', '8c4e2ghe7u.skadnetwork', '3rd42ekr43.skadnetwork',
  '97r2b46745.skadnetwork', '3qcr597p9d.skadnetwork',
];

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    plugins: [
      ...base.expo.plugins,
      [
        'react-native-google-mobile-ads',
        {
          iosAppId: admobIosAppId,
          androidAppId: admobAndroidAppId,
          // Rıza alınmadan ölçüm başlamasın (AdsContext initAds'i rıza sonrası çağırır)
          delayAppMeasurementInit: true,
          userTrackingUsageDescription: USER_TRACKING_DESCRIPTION,
          skAdNetworkItems: SK_AD_NETWORK_ITEMS,
        },
      ],
      ['expo-tracking-transparency', { userTrackingPermission: USER_TRACKING_DESCRIPTION }],
    ],
  },
};
