/**
 * Expo, bu dosyayı app.json yerine okuyabilir.
 * dotenv ile kökteki .env yüklenir; EXPO_PUBLIC_* değişkenleri Metro'da kullanılır.
 * @see https://docs.expo.dev/guides/environment-variables/
 */
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch (_) {
  // dotenv yoksa Expo yine de kendi .env yüklemesini dener
}

module.exports = require('./app.json');
