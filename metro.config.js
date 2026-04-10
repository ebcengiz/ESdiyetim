// Expo SDK 54 — Metro’nun eski önbellekte tuttuğu `@expo/metro-config/build/async-require.js`
// yolunu kullanmasını engellemek için asyncRequireModulePath açıkça expo iç modülüne sabitlenir.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.asyncRequireModulePath = require.resolve(
  'expo/internal/async-require-module'
);

module.exports = config;
