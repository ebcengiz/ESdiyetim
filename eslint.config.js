// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    // Üretilen native klasörler, build çıktıları ve Deno Edge Function'ları (ayrı runtime)
    ignores: ['dist/*', 'build/*', 'ios/*', 'android/*', 'supabase/functions/*'],
  },
  {
    rules: {
      // React Compiler kuralları (eslint-plugin-react-hooks v6). Proje React Compiler
      // kullanmıyor; `useRef(new Animated.Value(0)).current` gibi standart RN kalıplarını
      // hata sayıyorlar. Uyarı olarak görünür kalsınlar, CI'ı kırmasınlar.
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      // RN'de JSX metni HTML değil — Türkçe kesme işareti ("ESdiyet'i") sorun değil.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: ['__tests__/**/*.js'],
    languageOptions: { globals: globals.jest },
  },
]);
