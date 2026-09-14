/**
 * iOS 27 SDK (Xcode 27+) ile derlenen uygulamalarda UIKit, scene tabanlı yaşam döngüsünü
 * (UIScene) zorunlu kılıyor; aksi halde uygulama açılışta şu hatayla duruyor:
 *   "Application failed to launch: UIScene life cycle is required for apps built with this SDK."
 *
 * Expo SDK 57'nin prebuild şablonu hâlâ eski AppDelegate/UIWindow modelini üretiyor
 * (UIScene desteği SDK 58 ile geldi). Bu plugin, SDK 58 şablonunu referans alarak:
 *   1. Info.plist'e `UIApplicationSceneManifest` ekler (SceneDelegate'i kaydeder),
 *   2. AppDelegate.swift içindeki window/startReactNative bloğunu kaldırır,
 *   3. AppDelegate.swift sonuna React Native'i başlatan ve scene olaylarını
 *      ExpoAppDelegate'e (dolayısıyla expo-splash-screen, expo-iap gibi subscriber'lara)
 *      ileten bir `SceneDelegate` sınıfı ekler.
 *
 * Expo SDK 58'e geçildiğinde bu plugin kaldırılmalı (şablon zaten SceneDelegate içeriyor).
 * @see https://github.com/expo/expo/issues/46663
 * @see https://developer.apple.com/documentation/technotes/tn3187-migrating-to-the-uikit-scene-based-life-cycle
 */
const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

const MARKER = "// --expo-uiscene-lifecycle-patch--";

// AppDelegate.swift'te kaldırılacak blok (SDK 57 şablonu).
const WINDOW_START_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n#endif\s*\n/;

const WINDOW_START_REPLACEMENT = `    // Window oluşturma ve React Native başlatma işi scene yaşam döngüsünde (iOS 27 SDK
    // zorunluluğu) aşağıdaki SceneDelegate tarafından yapılır.
`;

const SCENE_DELEGATE_SWIFT = `
${MARKER}
// MARK: - UIScene yaşam döngüsü
// Bu sınıf plugins/with-ios-uiscene-lifecycle.js tarafından eklenir; elle düzenleme,
// prebuild sonrası kaybolur. UIKit, iOS 27 SDK ile derlenen uygulamalarda scene tabanlı
// yaşam döngüsünü zorunlu tutar. Scene olayları ExpoAppDelegate'e geri iletilir ki
// expo modüllerinin AppDelegate subscriber'ları (splash screen, expo-iap vb.) çalışmaya devam etsin.

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = appDelegate, let factory = appDelegate.reactNativeFactory else {
      fatalError("SceneDelegate: AppDelegate.reactNativeFactory henüz oluşturulmamış.")
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // UIApplication.shared.delegate?.window okuyan kodlar (ör. expo-system-ui) için aynala.
    appDelegate.window = window

    // Soğuk başlatmada deep link / universal link connectionOptions ile gelir; React Native'in
    // Linking.getInitialURL() bunu launchOptions'tan okuduğu için burada yeniden kuruyoruz.
    let browsingWebActivity = connectionOptions.userActivities.first {
      $0.activityType == NSUserActivityTypeBrowsingWeb
    }
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: Self.launchOptions(
        url: connectionOptions.urlContexts.first?.url,
        userActivity: browsingWebActivity
      )
    )

    for context in connectionOptions.urlContexts {
      _ = appDelegate.application(
        UIApplication.shared, open: context.url, options: Self.openURLOptions(from: context.options))
    }
    for activity in connectionOptions.userActivities {
      _ = appDelegate.application(
        UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  // MARK: Yaşam döngüsü olaylarını AppDelegate'e ilet
  // Scene modelinde UIKit bu metodları AppDelegate üzerinde artık çağırmaz.

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  // MARK: Deep link / universal link

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = appDelegate?.application(
        UIApplication.shared, open: context.url, options: Self.openURLOptions(from: context.options))
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  // MARK: Yardımcılar

  private static func launchOptions(
    url: URL?,
    userActivity: NSUserActivity?
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    // \`.url\` / \`.userActivityDictionary\` erişimcileri iOS 26'da deprecated; RN'nin getInitialURL'i
    // yine de bu ham anahtarları okuduğu için string sabitlerle kuruyoruz.
    var options: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url {
      options[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")] = url
    }
    if let userActivity {
      options[UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }
    return options.isEmpty ? nil : options
  }

  private static func openURLOptions(
    from sceneOptions: UIScene.OpenURLOptions
  ) -> [UIApplication.OpenURLOptionsKey: Any] {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = sceneOptions.openInPlace
    return options
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });
}

function withSceneDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("[with-ios-uiscene-lifecycle] Yalnızca Swift AppDelegate destekleniyor.");
    }
    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }
    if (!WINDOW_START_BLOCK.test(contents)) {
      throw new Error(
        "[with-ios-uiscene-lifecycle] AppDelegate.swift içinde beklenen window/startReactNative bloğu bulunamadı. " +
          "Expo şablonu değişmiş olabilir; plugin'i güncelle veya SDK 58+ ise plugin'i kaldır."
      );
    }
    contents = contents.replace(WINDOW_START_BLOCK, WINDOW_START_REPLACEMENT);
    cfg.modResults.contents = contents.trimEnd() + "\n" + SCENE_DELEGATE_SWIFT;
    return cfg;
  });
}

module.exports = function withIosUISceneLifecycle(config) {
  return withSceneDelegate(withSceneManifest(config));
};
