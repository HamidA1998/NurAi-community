import ExpoModulesCore

#if canImport(AlarmKit)
  import AlarmKit
  import ActivityKit
  import AppIntents
  import SwiftUI

  // Metadata attached to each athan alarm. Empty is fine; AlarmMetadata just
  // requires Codable + Hashable + Sendable, all synthesised for an empty struct.
  @available(iOS 26.0, *)
  struct AthanAlarmMetadata: AlarmMetadata {}
#endif

// Native bridge that schedules an adhan as a system alarm via AlarmKit
// (iOS 26+). AlarmKit is designed for prominent alerts and can break through
// Silent Mode and Focus when the user authorises it. Playback details remain
// owned by the operating system, so the app does not promise looping or a
// particular volume behaviour.
//
// Everything degrades gracefully: on iOS < 26 or where AlarmKit is unavailable,
// every method resolves to `false`/no-op so the JS layer can fall back to the
// existing 29s notification athan.
public class AthanAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AthanAlarm")

    AsyncFunction("isSupported") { () -> Bool in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) { return true }
      #endif
      return false
    }

    // Returns "authorized" | "denied" | "notDetermined" | "unsupported".
    AsyncFunction("requestAuthorization") { () async -> String in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
          do {
            let state = try await AlarmManager.shared.requestAuthorization()
            switch state {
            case .authorized: return "authorized"
            case .denied: return "denied"
            default: return "notDetermined"
            }
          } catch {
            return "notDetermined"
          }
        }
      #endif
      return "unsupported"
    }

    Function("authorizationStatus") { () -> String in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
          switch AlarmManager.shared.authorizationState {
          case .authorized: return "authorized"
          case .denied: return "denied"
          default: return "notDetermined"
          }
        }
      #endif
      return "unsupported"
    }

    // Schedule a one-shot athan alarm at a fixed date.
    //  id        - stable UUID string (reused so re-scheduling replaces it)
    //  timestampMs - fire time, ms since epoch
    //  title     - alert title, e.g. "Maghrib · Time to pray"
    //  stopText  - stop-button label, e.g. "I'm praying"
    //  soundName - bundled sound resource name (full-length athan), "" = default
    //  tintHex   - accent colour hex like "#56B394" (brand emerald)
    AsyncFunction("schedule") {
      (
        id: String,
        timestampMs: Double,
        title: String,
        stopText: String,
        soundName: String,
        tintHex: String
      ) async throws -> Bool in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
          guard let uuid = UUID(uuidString: id) else {
            throw Exception(name: "AthanAlarm", description: "Invalid alarm id")
          }
          let fireDate = Date(timeIntervalSince1970: timestampMs / 1000.0)
          if fireDate.timeIntervalSinceNow <= 0 { return false }

          let stopButton = AlarmButton(
            text: LocalizedStringResource(stringLiteral: stopText),
            textColor: .white,
            systemImageName: "moon.stars.fill"
          )
          let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: title),
            stopButton: stopButton
          )
          let presentation = AlarmPresentation(alert: alert)
          let attributes = AlarmAttributes<AthanAlarmMetadata>(
            presentation: presentation,
            metadata: AthanAlarmMetadata(),
            tintColor: Color(hex: tintHex) ?? .green
          )

          let sound: ActivityKit.AlertConfiguration.AlertSound =
            soundName.isEmpty ? .default : .named(soundName)

          let configuration = AlarmManager.AlarmConfiguration.alarm(
            schedule: .fixed(fireDate),
            attributes: attributes,
            sound: sound
          )

          _ = try await AlarmManager.shared.schedule(
            id: uuid,
            configuration: configuration
          )
          return true
        }
      #endif
      return false
    }

    AsyncFunction("cancel") { (id: String) async in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
          if let uuid = UUID(uuidString: id) {
            try? AlarmManager.shared.cancel(id: uuid)
          }
        }
      #endif
    }

    AsyncFunction("cancelAll") { () async in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
          if let alarms = try? AlarmManager.shared.alarms {
            for alarm in alarms {
              try? AlarmManager.shared.cancel(id: alarm.id)
            }
          }
        }
      #endif
    }

    AsyncFunction("scheduledCount") { () async -> Int in
      #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
          return (try? AlarmManager.shared.alarms.count) ?? 0
        }
      #endif
      return 0
    }
  }
}

#if canImport(AlarmKit)
  import SwiftUI

  extension Color {
    fileprivate init?(hex: String) {
      var hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
      if hex.hasPrefix("#") { hex.removeFirst() }
      guard hex.count == 6, let value = UInt32(hex, radix: 16) else { return nil }
      self = Color(
        red: Double((value >> 16) & 0xFF) / 255.0,
        green: Double((value >> 8) & 0xFF) / 255.0,
        blue: Double(value & 0xFF) / 255.0
      )
    }
  }
#endif
