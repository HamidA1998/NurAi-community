import Foundation
import React

#if canImport(ActivityKit)
import ActivityKit
#endif

#if canImport(WidgetKit)
import WidgetKit
#endif

#if canImport(ActivityKit)
@available(iOS 16.1, *)
struct NurAIPrayerActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var prayerName: String
    var prayerTimeLabel: String
    var locationLabel: String
    var hijriDateLabel: String
    var qiblaLabel: String
    var weatherInsight: String
    var nextPrayerTime: Date?
    var updatedAt: Double
  }

  var activityId: String
}
#endif

@objc(NurAIWidgetModule)
class NurAIWidgetModule: NSObject {
  private let appGroupId = "group.uk.co.eliteautomations.nurai"
  private let snapshotKey = "nurai_widget_snapshot_v1"

  @objc(saveSnapshot:resolver:rejecter:)
  func saveSnapshot(
    _ snapshot: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      reject("widget_app_group_unavailable", "NurAI widget storage is not available.", nil)
      return
    }

    do {
      let data = try JSONSerialization.data(withJSONObject: snapshot, options: [])
      guard let json = String(data: data, encoding: .utf8) else {
        reject("widget_snapshot_encoding_failed", "NurAI widget snapshot could not be encoded.", nil)
        return
      }

      defaults.set(json, forKey: snapshotKey)
      defaults.synchronize()

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }

      syncPrayerLiveActivity(from: snapshot)

      resolve(true)
    } catch {
      reject("widget_snapshot_save_failed", "NurAI widget snapshot could not be saved.", error)
    }
  }

  @objc(clearSnapshot:rejecter:)
  func clearSnapshot(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      reject("widget_app_group_unavailable", "NurAI widget storage is not available.", nil)
      return
    }

    defaults.removeObject(forKey: snapshotKey)
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }

    endPrayerLiveActivities()

    resolve(true)
  }

  @objc(mergeSnapshot:resolver:rejecter:)
  func mergeSnapshot(
    _ partialSnapshot: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      reject("widget_app_group_unavailable", "NurAI widget storage is not available.", nil)
      return
    }

    do {
      var mergedSnapshot: [String: Any] = [:]
      if
        let existingJson = defaults.string(forKey: snapshotKey),
        let existingData = existingJson.data(using: .utf8),
        let existingObject = try? JSONSerialization.jsonObject(with: existingData, options: []),
        let existingSnapshot = existingObject as? [String: Any]
      {
        mergedSnapshot = existingSnapshot
      }

      for (key, value) in partialSnapshot {
        if let key = key as? String {
          mergedSnapshot[key] = value
        }
      }

      if mergedSnapshot["updatedAt"] == nil {
        mergedSnapshot["updatedAt"] = Date().timeIntervalSince1970 * 1000
      }

      let data = try JSONSerialization.data(withJSONObject: mergedSnapshot, options: [])
      guard let json = String(data: data, encoding: .utf8) else {
        reject("widget_snapshot_encoding_failed", "NurAI widget snapshot could not be encoded.", nil)
        return
      }

      defaults.set(json, forKey: snapshotKey)
      defaults.synchronize()

      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }

      syncPrayerLiveActivity(from: mergedSnapshot as NSDictionary)

      resolve(true)
    } catch {
      reject("widget_snapshot_merge_failed", "NurAI widget snapshot could not be updated.", error)
    }
  }

  @objc(endPrayerActivity:rejecter:)
  func endPrayerActivity(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    endPrayerLiveActivities()
    resolve(true)
  }

  private func syncPrayerLiveActivity(from snapshot: NSDictionary) {
    #if canImport(ActivityKit)
    guard #available(iOS 16.1, *) else { return }

    let state = prayerActivityState(from: snapshot)
    guard let nextPrayerTime = state.nextPrayerTime else {
      endPrayerLiveActivities()
      return
    }

    if nextPrayerTime < Date().addingTimeInterval(-900) {
      endPrayerLiveActivities()
      return
    }

    Task {
      let activities = Activity<NurAIPrayerActivityAttributes>.activities
      if activities.isEmpty {
        do {
          let attributes = NurAIPrayerActivityAttributes(activityId: "nurai-prayer-countdown")
          if #available(iOS 16.2, *) {
            let content = ActivityContent(
              state: state,
              staleDate: nextPrayerTime.addingTimeInterval(900)
            )
            _ = try Activity<NurAIPrayerActivityAttributes>.request(
              attributes: attributes,
              content: content,
              pushType: nil
            )
          } else {
            _ = try Activity<NurAIPrayerActivityAttributes>.request(
              attributes: attributes,
              contentState: state,
              pushType: nil
            )
          }
        } catch {
          // Live Activities can be disabled by the user or unavailable on the device.
        }
        return
      }

      for activity in activities {
        if #available(iOS 16.2, *) {
          let content = ActivityContent(
            state: state,
            staleDate: nextPrayerTime.addingTimeInterval(900)
          )
          await activity.update(content)
        } else {
          await activity.update(using: state)
        }
      }
    }
    #endif
  }

  private func endPrayerLiveActivities() {
    #if canImport(ActivityKit)
    guard #available(iOS 16.1, *) else { return }

    Task {
      for activity in Activity<NurAIPrayerActivityAttributes>.activities {
        if #available(iOS 16.2, *) {
          await activity.end(nil, dismissalPolicy: .immediate)
        } else {
          await activity.end(dismissalPolicy: .immediate)
        }
      }
    }
    #endif
  }

  #if canImport(ActivityKit)
  @available(iOS 16.1, *)
  private func prayerActivityState(from snapshot: NSDictionary) -> NurAIPrayerActivityAttributes.ContentState {
    let isoDate = stringValue(snapshot["nextPrayerTimeISO"])
    let nextPrayerTime = isoDate.flatMap { ISO8601DateFormatter().date(from: $0) }

    return NurAIPrayerActivityAttributes.ContentState(
      prayerName: clean(snapshot["nextPrayerName"], fallback: "Next prayer"),
      prayerTimeLabel: clean(snapshot["prayerTimeLabel"], fallback: "--:--"),
      locationLabel: clean(snapshot["locationLabel"], fallback: "NurAI"),
      hijriDateLabel: clean(snapshot["hijriDateLabel"], fallback: "Daily Deen"),
      qiblaLabel: clean(snapshot["qiblaLabel"], fallback: "Qibla"),
      weatherInsight: clean(snapshot["weatherInsight"], fallback: "Open NurAI for prayer guidance."),
      nextPrayerTime: nextPrayerTime,
      updatedAt: doubleValue(snapshot["updatedAt"]) ?? Date().timeIntervalSince1970 * 1000
    )
  }
  #endif

  private func clean(_ value: Any?, fallback: String) -> String {
    guard
      let string = stringValue(value)?.trimmingCharacters(in: .whitespacesAndNewlines),
      !string.isEmpty
    else {
      return fallback
    }
    return string
  }

  private func stringValue(_ value: Any?) -> String? {
    if let string = value as? String { return string }
    if let number = value as? NSNumber { return number.stringValue }
    return nil
  }

  private func doubleValue(_ value: Any?) -> Double? {
    if let number = value as? NSNumber { return number.doubleValue }
    if let string = value as? String { return Double(string) }
    return nil
  }
}
