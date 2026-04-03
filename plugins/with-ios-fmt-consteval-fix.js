/**
 * Xcode 16.4+ Apple Clang: fmt 11.x `consteval` / `basic_format_string` derleme hataları.
 * `-DFMT_USE_CONSTEVAL=0` yetmez; base.h içindeki #elif dalları değeri tekrar 1 yapar.
 * post_install'da Pods/fmt/include/fmt/base.h iki satırı 0'a çevirir.
 * @see https://github.com/facebook/react-native/issues/55601
 */
const { withPodfile } = require("@expo/config-plugins");

const MARKER = "# --expo-fmt-apple-clang-patch--";

const RUBY_SNIPPET = `
    ${MARKER}
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      txt = File.read(fmt_base)
      unless txt.include?('EXPO_APPLE_CLANG_CONSTEVAL_FIX')
        txt = txt.sub(
          /#elif defined\\(__cpp_consteval\\)\\n#  define FMT_USE_CONSTEVAL 1/,
          '#elif defined(__cpp_consteval)' + \"\\n\" + '#  define FMT_USE_CONSTEVAL 0  // EXPO_APPLE_CLANG_CONSTEVAL_FIX'
        )
        txt = txt.sub(
          /#elif FMT_GCC_VERSION >= 1002 \\|\\| FMT_CLANG_VERSION >= 1101\\n#  define FMT_USE_CONSTEVAL 1/,
          '#elif FMT_GCC_VERSION >= 1002 || FMT_CLANG_VERSION >= 1101' + \"\\n\" + '#  define FMT_USE_CONSTEVAL 0  // EXPO_APPLE_CLANG_CONSTEVAL_FIX'
        )
        File.write(fmt_base, txt)
        Pod::UI.puts '[expo-fmt-fix] Patched Pods/fmt/include/fmt/base.h (FMT_USE_CONSTEVAL for Apple Clang)'
      end
    end
`;

function insertBeforePostInstallEnd(contents) {
  const key = "post_install do |installer|";
  const idx = contents.lastIndexOf(key);
  if (idx === -1) return null;
  const tail = contents.slice(idx);
  const m = tail.match(/\n  end\n/);
  if (!m || m.index === undefined) return null;
  const insertAt = idx + m.index;
  return contents.slice(0, insertAt) + RUBY_SNIPPET + contents.slice(insertAt);
}

module.exports = function withIosFmtConstevalFix(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }
    const next = insertBeforePostInstallEnd(contents);
    if (next) {
      cfg.modResults.contents = next;
    }
    return cfg;
  });
};
