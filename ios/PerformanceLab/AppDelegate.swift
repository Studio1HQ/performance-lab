import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Measure

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    if let apiKey = Bundle.main.object(forInfoDictionaryKey: "MeasureAPIKey") as? String,
       let apiUrl = Bundle.main.object(forInfoDictionaryKey: "MeasureAPIURL") as? String,
       !apiKey.isEmpty, !apiUrl.isEmpty,
       !apiKey.contains("$("), !apiUrl.contains("$(") {
      let clientInfo = ClientInfo(apiKey: apiKey, apiUrl: apiUrl)
      let measureConfig = BaseMeasureConfig(autoStart: true, enableFullCollectionMode: false)
      Measure.initialize(with: clientInfo, config: measureConfig)
    }

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "PerformanceLab",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
