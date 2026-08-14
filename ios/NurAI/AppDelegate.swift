import Expo
import React
import ReactAppDependencyProvider
import BackgroundTasks

#if canImport(WidgetKit)
import WidgetKit
#endif

private let nurAIWidgetRefreshTaskIdentifier = "uk.co.eliteautomations.nurai.widget-refresh"
private let nurAIWidgetAppGroupId = "group.uk.co.eliteautomations.nurai"
private let nurAIWidgetSnapshotKey = "nurai_widget_snapshot_v1"

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)
    configureWidgetBackgroundRefresh()

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    scheduleWidgetBackgroundRefresh()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  public override func applicationDidEnterBackground(_ application: UIApplication) {
    super.applicationDidEnterBackground(application)
    scheduleWidgetBackgroundRefresh()
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  private func configureWidgetBackgroundRefresh() {
    guard #available(iOS 13.0, *) else { return }

    BGTaskScheduler.shared.register(
      forTaskWithIdentifier: nurAIWidgetRefreshTaskIdentifier,
      using: nil
    ) { [weak self] task in
      guard let refreshTask = task as? BGAppRefreshTask else {
        task.setTaskCompleted(success: false)
        return
      }
      self?.handleWidgetBackgroundRefresh(task: refreshTask)
    }
  }

  private func scheduleWidgetBackgroundRefresh() {
    guard #available(iOS 13.0, *) else { return }

    let request = BGAppRefreshTaskRequest(identifier: nurAIWidgetRefreshTaskIdentifier)
    request.earliestBeginDate = Date(timeIntervalSinceNow: 5 * 60)

    do {
      try BGTaskScheduler.shared.submit(request)
    } catch {
      // iOS may reject duplicate or unavailable background refresh requests.
    }
  }

  @available(iOS 13.0, *)
  private func handleWidgetBackgroundRefresh(task: BGAppRefreshTask) {
    scheduleWidgetBackgroundRefresh()

    let queue = OperationQueue()
    queue.maxConcurrentOperationCount = 1
    let operation = BlockOperation { [weak self] in
      self?.refreshWidgetSnapshotTimestamp()
    }

    task.expirationHandler = {
      queue.cancelAllOperations()
    }

    operation.completionBlock = {
      let success = !operation.isCancelled
      DispatchQueue.main.async {
        #if canImport(WidgetKit)
        if #available(iOS 14.0, *) {
          WidgetCenter.shared.reloadAllTimelines()
        }
        #endif
        task.setTaskCompleted(success: success)
      }
    }

    queue.addOperation(operation)
  }

  private func refreshWidgetSnapshotTimestamp() {
    guard let defaults = UserDefaults(suiteName: nurAIWidgetAppGroupId) else {
      return
    }

    var snapshot: [String: Any] = [:]
    if
      let existingJson = defaults.string(forKey: nurAIWidgetSnapshotKey),
      let existingData = existingJson.data(using: .utf8),
      let existingObject = try? JSONSerialization.jsonObject(with: existingData, options: []),
      let existingSnapshot = existingObject as? [String: Any]
    {
      snapshot = existingSnapshot
    }

    snapshot["updatedAt"] = Date().timeIntervalSince1970 * 1000
    snapshot["backgroundRefreshAt"] = Date().timeIntervalSince1970 * 1000

    if
      JSONSerialization.isValidJSONObject(snapshot),
      let data = try? JSONSerialization.data(withJSONObject: snapshot, options: []),
      let json = String(data: data, encoding: .utf8)
    {
      defaults.set(json, forKey: nurAIWidgetSnapshotKey)
      defaults.synchronize()
    }
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
