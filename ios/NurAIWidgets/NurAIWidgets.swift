import SwiftUI
import WidgetKit

#if canImport(ActivityKit)
import ActivityKit
#endif

private let appGroupId = "group.uk.co.eliteautomations.nurai"
private let snapshotKey = "nurai_widget_snapshot_v1"

#if canImport(ActivityKit)
@available(iOSApplicationExtension 16.1, *)
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

struct NurAIPrayerScheduleEntry: Codable {
  var name: String?
  var displayName: String?
  var timeISO: String?
  var timeLabel: String?
}

struct NurAIWidgetSnapshot: Codable {
  var updatedAt: Double?
  var displayName: String?
  var locationLabel: String?
  var hijriDateLabel: String?
  var gregorianDateLabel: String?
  var nextPrayerName: String?
  var nextPrayerTimeISO: String?
  var prayerTimeLabel: String?
  var prayerSchedule: [NurAIPrayerScheduleEntry]?
  var qiblaLabel: String?
  var weatherTemperatureC: Double?
  var weatherCondition: String?
  var weatherInsight: String?
  var streakDays: Int?
  var checkedDays: [String]?
  var quranContinueLabel: String?
  var quranProgressLabel: String?
  var quranContinueSurah: Int?
  var quranContinueVerse: Int?
  var dailyGoalLabel: String?
  var dailyGoalProgress: Double?
  var familyGoalLabel: String?
  var tasbeehCount: Int?
  var tasbeehTarget: Int?
  var tasbeehDhikrLabel: String?
  var tasbeehTodayTotal: Int?
  var travelModeEnabled: Bool?
  var travelDestinationLabel: String?
  var travelFlightLabel: String?
  var travelPrayerPlanLabel: String?
  var travelReadinessProgress: Double?

  static let fallback = NurAIWidgetSnapshot(
    updatedAt: nil,
    displayName: nil,
    locationLabel: "Open NurAI",
    hijriDateLabel: "Daily Deen",
    gregorianDateLabel: nil,
    nextPrayerName: "Next prayer",
    nextPrayerTimeISO: nil,
    prayerTimeLabel: "--:--",
    prayerSchedule: [],
    qiblaLabel: "Qibla",
    weatherTemperatureC: nil,
    weatherCondition: nil,
    weatherInsight: "Open NurAI to refresh live guidance.",
    streakDays: 0,
    checkedDays: [],
    quranContinueLabel: "Continue Quran",
    quranProgressLabel: "Build your Quran rhythm",
    quranContinueSurah: nil,
    quranContinueVerse: nil,
    dailyGoalLabel: "Set today's intention",
    dailyGoalProgress: 0,
    familyGoalLabel: "Grow together",
    tasbeehCount: 0,
    tasbeehTarget: 33,
    tasbeehDhikrLabel: "Tasbeeh",
    tasbeehTodayTotal: 0,
    travelModeEnabled: false,
    travelDestinationLabel: "Plan your journey",
    travelFlightLabel: nil,
    travelPrayerPlanLabel: "Add a trip for prayer-first planning",
    travelReadinessProgress: 0
  )
}

struct NurAIWidgetEntry: TimelineEntry {
  let date: Date
  let snapshot: NurAIWidgetSnapshot
}

struct NurAIWidgetProvider: TimelineProvider {
  private let maximumPrayerTimelineEntries = 96
  private let passiveRefreshInterval: TimeInterval = 5 * 60
  private let passiveRefreshWindow: TimeInterval = 24 * 60 * 60

  func placeholder(in context: Context) -> NurAIWidgetEntry {
    NurAIWidgetEntry(date: Date(), snapshot: .fallback)
  }

  func getSnapshot(in context: Context, completion: @escaping (NurAIWidgetEntry) -> Void) {
    completion(NurAIWidgetEntry(date: Date(), snapshot: loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<NurAIWidgetEntry>) -> Void) {
    let snapshot = loadSnapshot()
    let now = Date()
    let entries = buildTimelineEntries(from: snapshot, now: now)
    let standardRefresh = Calendar.current.date(byAdding: .minute, value: 5, to: now) ?? now.addingTimeInterval(300)

    if entries.count > 1, let lastEntryDate = entries.last?.date {
      let nextRefresh = Calendar.current.date(byAdding: .minute, value: 5, to: lastEntryDate)
        ?? lastEntryDate.addingTimeInterval(300)
      completion(Timeline(entries: entries, policy: .after(nextRefresh)))
      return
    }

    let prayerRefresh = snapshot.nextPrayerDate?.addingTimeInterval(5)
    let nextRefresh = [standardRefresh, prayerRefresh]
      .compactMap { $0 }
      .filter { $0 > now.addingTimeInterval(1) }
      .min() ?? standardRefresh
    completion(Timeline(entries: entries, policy: .after(nextRefresh)))
  }

  private func loadSnapshot() -> NurAIWidgetSnapshot {
    guard
      let defaults = UserDefaults(suiteName: appGroupId),
      let json = defaults.string(forKey: snapshotKey),
      let data = json.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(NurAIWidgetSnapshot.self, from: data)
    else {
      return .fallback
    }

    return snapshot
  }

  private func buildTimelineEntries(from snapshot: NurAIWidgetSnapshot, now: Date) -> [NurAIWidgetEntry] {
    var entryDates = [now]
    let transitionDates = snapshot.prayerTransitionDates(after: now)
      .prefix(maximumPrayerTimelineEntries - 1)

    for transitionDate in transitionDates {
      if transitionDate > now.addingTimeInterval(1) {
        entryDates.append(transitionDate)
      }
    }

    let passiveRefreshEnd = now.addingTimeInterval(passiveRefreshWindow)
    var passiveRefreshDate = now.addingTimeInterval(passiveRefreshInterval)

    while passiveRefreshDate <= passiveRefreshEnd && entryDates.count < maximumPrayerTimelineEntries {
      entryDates.append(passiveRefreshDate)
      passiveRefreshDate = passiveRefreshDate.addingTimeInterval(passiveRefreshInterval)
    }

    let sortedEntryDates = Array(Set(entryDates)).sorted().prefix(maximumPrayerTimelineEntries)

    return sortedEntryDates.map { entryDate in
      NurAIWidgetEntry(date: entryDate, snapshot: snapshot)
    }
  }
}

private enum NurAIWidgetPalette {
  // Keep WidgetKit on the same quiet-dark palette as the main NurAI app.
  static let backgroundTop = Color(red: 0.027, green: 0.102, blue: 0.102)
  static let backgroundMid = Color(red: 0.043, green: 0.067, blue: 0.078)
  static let backgroundBottom = Color(red: 0.027, green: 0.102, blue: 0.102)
  static let surface = Color.white.opacity(0.06)
  static let surfaceStrong = Color.white.opacity(0.10)
  static let border = Color(red: 0.812, green: 0.682, blue: 0.412).opacity(0.24)
  static let borderSoft = Color.white.opacity(0.12)
  static let emerald = Color(red: 0.337, green: 0.702, blue: 0.580)
  static let emeraldMuted = Color(red: 0.243, green: 0.549, blue: 0.471)
  static let gold = Color(red: 0.812, green: 0.682, blue: 0.412)
  static let warning = Color(red: 0.886, green: 0.663, blue: 0.302)
  static let critical = Color(red: 0.851, green: 0.510, blue: 0.486)
  static let text = Color(red: 0.953, green: 0.941, blue: 0.910)
  static let muted = Color(red: 0.722, green: 0.761, blue: 0.741)
  static let textMuted = Color(red: 0.467, green: 0.518, blue: 0.494)
}

private extension NurAIWidgetSnapshot {
  private static let isoFormatter = ISO8601DateFormatter()

  var prayerName: String { clean(activePrayerEntry?.displayName ?? nextPrayerName, fallback: "Next prayer") }
  var prayerTime: String { clean(activePrayerEntry?.timeLabel ?? prayerTimeLabel, fallback: "--:--") }
  var location: String { clean(locationLabel, fallback: "NurAI") }
  var hijri: String { clean(hijriDateLabel, fallback: "Daily Deen") }
  var gregorian: String { clean(gregorianDateLabel, fallback: "") }
  var qibla: String { clean(qiblaLabel, fallback: "Qibla") }
  var weather: String { clean(weatherCondition, fallback: "Live weather") }
  var weatherCopy: String { clean(weatherInsight, fallback: "Open NurAI for live prayer guidance.") }
  var streak: Int { max(streakDays ?? 0, 0) }
  var goalProgress: Double { min(max((dailyGoalProgress ?? 0) / 100, 0), 1) }
  var quranLabel: String { clean(quranContinueLabel, fallback: "Continue Quran") }
  var quranProgress: String { clean(quranProgressLabel, fallback: "Build your Quran rhythm") }
  var quranDeepLink: URL? {
    guard let surah = quranContinueSurah, surah >= 1, surah <= 114 else {
      return URL(string: "nurai://quran")
    }
    let verse = min(max(quranContinueVerse ?? 1, 1), 286)
    return URL(string: "nurai://quran?surah=\(surah)&verse=\(verse)") ?? URL(string: "nurai://quran")
  }
  var dailyGoal: String { clean(dailyGoalLabel, fallback: "Set today's intention") }
  var familyGoal: String { clean(familyGoalLabel, fallback: "Grow together") }
  var tasbeehValue: Int { max(tasbeehCount ?? 0, 0) }
  var tasbeehTargetValue: Int { max(tasbeehTarget ?? 33, 1) }
  var tasbeehDailyTotal: Int { max(tasbeehTodayTotal ?? 0, 0) }
  var tasbeehDhikr: String { clean(tasbeehDhikrLabel, fallback: "Tasbeeh") }
  var tasbeehProgress: Double {
    if tasbeehValue > 0 && tasbeehValue % tasbeehTargetValue == 0 { return 1 }
    return min(Double(tasbeehValue % tasbeehTargetValue) / Double(tasbeehTargetValue), 1)
  }
  var tasbeehRemainingToTarget: Int {
    let remainder = tasbeehValue % tasbeehTargetValue
    return remainder == 0 ? tasbeehTargetValue : tasbeehTargetValue - remainder
  }
  var travelEnabled: Bool { travelModeEnabled ?? false }
  var travelDestination: String { clean(travelDestinationLabel, fallback: "Plan your journey") }
  var travelFlight: String { clean(travelFlightLabel, fallback: travelEnabled ? "Trip active" : "Add flight") }
  var travelPrayerPlan: String { clean(travelPrayerPlanLabel, fallback: "Prayer-first travel plan") }
  var travelProgress: Double { min(max((travelReadinessProgress ?? 0) / 100, 0), 1) }

  var nextPrayerDate: Date? {
    if let activePrayerDate { return activePrayerDate }
    return parsePrayerDate(nextPrayerTimeISO)
  }

  func prayerTransitionDates(after date: Date) -> [Date] {
    (prayerSchedule ?? [])
      .compactMap { parsePrayerDate($0.timeISO)?.addingTimeInterval(5) }
      .filter { $0 > date.addingTimeInterval(1) }
      .sorted()
  }

  private var activePrayerEntry: NurAIPrayerScheduleEntry? {
    activePrayerPair?.entry
  }

  private var activePrayerDate: Date? {
    activePrayerPair?.date
  }

  private var activePrayerPair: (entry: NurAIPrayerScheduleEntry, date: Date)? {
    let now = Date()
    return (prayerSchedule ?? [])
      .compactMap { entry -> (entry: NurAIPrayerScheduleEntry, date: Date)? in
        guard let date = parsePrayerDate(entry.timeISO), date > now else { return nil }
        return (entry, date)
      }
      .min { lhs, rhs in lhs.date < rhs.date }
  }

  private func parsePrayerDate(_ value: String?) -> Date? {
    guard let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return nil
    }
    return Self.isoFormatter.date(from: value)
  }

  private func clean(_ value: String?, fallback: String) -> String {
    guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
      return fallback
    }
    return value
  }
}

private extension View {
  func nuraiWidgetBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      return containerBackground(for: .widget) {
        NurAIWidgetBackground()
      }
    } else {
      return background(NurAIWidgetBackground())
    }
  }
}

private struct NurAIWidgetBackground: View {
  var body: some View {
    ZStack {
      LinearGradient(
        colors: [
          NurAIWidgetPalette.backgroundTop,
          NurAIWidgetPalette.backgroundMid,
          NurAIWidgetPalette.backgroundBottom,
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
      RadialGradient(
        colors: [
          NurAIWidgetPalette.emerald.opacity(0.14),
          Color.clear,
        ],
        center: .topTrailing,
        startRadius: 8,
        endRadius: 190
      )
    }
  }
}

private struct BrandMark: View {
  var compact = false

  var body: some View {
    ZStack {
      Circle()
        .fill(
          LinearGradient(
            colors: [NurAIWidgetPalette.gold.opacity(0.16), NurAIWidgetPalette.emerald.opacity(0.10)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
      Image(systemName: "moon.stars.fill")
        .font(.system(size: compact ? 11 : 14, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.gold)
    }
    .frame(width: compact ? 26 : 34, height: compact ? 26 : 34)
    .overlay(Circle().stroke(NurAIWidgetPalette.border, lineWidth: 1))
  }
}

private struct PillLabel: View {
  let icon: String
  let text: String

  var body: some View {
    HStack(spacing: 5) {
      Image(systemName: icon)
        .font(.system(size: 10, weight: .semibold))
      Text(text)
        .font(.system(size: 10, weight: .semibold))
        .tracking(0.7)
        .textCase(.uppercase)
        .lineLimit(1)
    }
    .foregroundStyle(NurAIWidgetPalette.emerald)
  }
}

private struct PrayerOrb: View {
  let snapshot: NurAIWidgetSnapshot
  var compact = false

  var body: some View {
    ZStack {
      Circle()
        .fill(Color.black.opacity(0.15))
      Circle()
        .stroke(NurAIWidgetPalette.gold.opacity(0.34), lineWidth: compact ? 3 : 5)
      Circle()
        .trim(from: 0.02, to: max(snapshot.goalProgress, 0.24))
        .stroke(
          LinearGradient(
            colors: [NurAIWidgetPalette.emerald, NurAIWidgetPalette.emeraldMuted, NurAIWidgetPalette.gold],
            startPoint: .leading,
            endPoint: .trailing
          ),
          style: StrokeStyle(lineWidth: compact ? 4 : 6, lineCap: .round)
        )
        .rotationEffect(.degrees(-90))
      Circle()
        .stroke(NurAIWidgetPalette.emerald.opacity(0.18), lineWidth: 1)
        .padding(compact ? 12 : 16)
      VStack(spacing: compact ? 1 : 3) {
        Image(systemName: "moon.stars.fill")
          .font(.system(size: compact ? 13 : 17, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.gold)
        Text(snapshot.prayerName)
          .font(.system(size: compact ? 18 : 25, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(1)
          .minimumScaleFactor(0.68)
        if let nextPrayerDate = snapshot.nextPrayerDate, nextPrayerDate > Date() {
          Text(nextPrayerDate, style: .timer)
            .font(.system(size: compact ? 15 : 21, weight: .semibold, design: .rounded))
            .foregroundStyle(NurAIWidgetPalette.gold)
            .monospacedDigit()
            .minimumScaleFactor(0.55)
        } else {
          Text(snapshot.prayerTime)
            .font(.system(size: compact ? 15 : 21, weight: .semibold, design: .rounded))
            .foregroundStyle(NurAIWidgetPalette.gold)
            .monospacedDigit()
        }
      }
      .padding(compact ? 12 : 18)
    }
  }
}

private struct GardenSprout: View {
  let progress: Double

  var body: some View {
    ZStack {
      Circle()
        .fill(NurAIWidgetPalette.surface)
      Circle()
        .trim(from: 0, to: max(progress, 0.14))
        .stroke(NurAIWidgetPalette.emerald, style: StrokeStyle(lineWidth: 5, lineCap: .round))
        .rotationEffect(.degrees(-90))
      VStack(spacing: 1) {
        Image(systemName: progress >= 0.75 ? "tree.fill" : "leaf.fill")
          .font(.system(size: 28, weight: .semibold))
          .foregroundStyle(
            LinearGradient(
              colors: [
                NurAIWidgetPalette.emerald,
                NurAIWidgetPalette.emeraldMuted,
              ],
              startPoint: .top,
              endPoint: .bottom
            )
          )
        Text(progress >= 0.75 ? "Bloom" : "Sprout")
          .font(.system(size: 10, weight: .bold))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
    }
  }
}

private struct GardenDots: View {
  let checkedDays: [String]

  var body: some View {
    HStack(spacing: 6) {
      ForEach(0..<7, id: \.self) { index in
        Circle()
          .fill(index < min(checkedDays.count, 7) ? NurAIWidgetPalette.emerald : Color.white.opacity(0.14))
          .frame(width: 8, height: 8)
          .overlay(Circle().stroke(index == 6 ? NurAIWidgetPalette.gold.opacity(0.75) : Color.clear, lineWidth: 1))
          .shadow(color: index < min(checkedDays.count, 7) ? NurAIWidgetPalette.emerald.opacity(0.55) : .clear, radius: 4)
      }
    }
  }
}

private struct ProgressBar: View {
  let progress: Double
  var tint: Color = NurAIWidgetPalette.emerald

  var body: some View {
    GeometryReader { proxy in
      ZStack(alignment: .leading) {
        Capsule().fill(Color.white.opacity(0.11))
        Capsule()
          .fill(tint)
          .frame(width: proxy.size.width * min(max(progress, 0.06), 1))
      }
    }
    .frame(height: 6)
  }
}

private struct WidgetMetricRow: View {
  let icon: String
  let title: String
  let subtitle: String

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: icon)
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.emerald)
        .frame(width: 30, height: 30)
        .background(RoundedRectangle(cornerRadius: 10).fill(NurAIWidgetPalette.surface))
      VStack(alignment: .leading, spacing: 1) {
        Text(title)
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(1)
        Text(subtitle)
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(1)
      }
      Spacer(minLength: 0)
    }
  }
}

private struct NurAIPrayerWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      case .systemMedium:
        medium
      case .systemLarge:
        large
      case .accessoryCircular:
        accessoryCircular
      case .accessoryRectangular:
        accessoryRectangular
      case .accessoryInline:
        accessoryInline
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://prayer"))
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        BrandMark(compact: true)
        Spacer()
        Text(entry.snapshot.prayerTime)
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      Spacer(minLength: 0)
      PrayerOrb(snapshot: entry.snapshot, compact: true)
      Spacer(minLength: 0)
      Text(entry.snapshot.location)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
        .lineLimit(1)
    }
    .padding(14)
  }

  private var medium: some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 7) {
        HStack {
          BrandMark(compact: true)
          Text(entry.snapshot.hijri)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(NurAIWidgetPalette.gold)
            .lineLimit(1)
        }
        Text(entry.snapshot.prayerName)
          .font(.system(size: 30, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(1)
          .minimumScaleFactor(0.72)
        if let nextPrayerDate = entry.snapshot.nextPrayerDate, nextPrayerDate > Date() {
          Text(nextPrayerDate, style: .timer)
            .font(.system(size: 21, weight: .semibold, design: .rounded))
            .foregroundStyle(NurAIWidgetPalette.emerald)
            .monospacedDigit()
        } else {
          Text(entry.snapshot.prayerTime)
            .font(.system(size: 21, weight: .semibold, design: .rounded))
            .foregroundStyle(NurAIWidgetPalette.emerald)
            .monospacedDigit()
        }
        Text(entry.snapshot.weatherCopy)
          .font(.system(size: 11, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(2)
      }
      Spacer(minLength: 2)
      VStack(spacing: 8) {
        PrayerOrb(snapshot: entry.snapshot, compact: true)
          .frame(width: 102, height: 102)
        PillLabel(icon: "location.north.line.fill", text: entry.snapshot.qibla)
      }
    }
    .padding(16)
  }

  private var large: some View {
    VStack(alignment: .leading, spacing: 13) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 4) {
          Text("NurAI Daily Deen")
            .font(.system(size: 18, weight: .bold, design: .serif))
            .foregroundStyle(NurAIWidgetPalette.text)
          Text(entry.snapshot.hijri)
            .font(.system(size: 12, weight: .semibold))
            .foregroundStyle(NurAIWidgetPalette.gold)
        }
        Spacer()
        PillLabel(icon: "mappin.and.ellipse", text: entry.snapshot.location)
      }
      HStack(spacing: 16) {
        PrayerOrb(snapshot: entry.snapshot)
          .frame(width: 136, height: 136)
        VStack(alignment: .leading, spacing: 12) {
          WidgetMetricRow(icon: "cloud.moon.fill", title: weatherTitle, subtitle: entry.snapshot.weatherCopy)
          WidgetMetricRow(icon: "book.closed.fill", title: entry.snapshot.quranLabel, subtitle: entry.snapshot.quranProgress)
          WidgetMetricRow(icon: "leaf.fill", title: "\(entry.snapshot.streak) day streak", subtitle: entry.snapshot.dailyGoal)
        }
      }
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text("Today’s progress")
            .font(.system(size: 13, weight: .bold))
            .foregroundStyle(NurAIWidgetPalette.text)
          Spacer()
          Text("\(Int(entry.snapshot.goalProgress * 100))%")
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(NurAIWidgetPalette.gold)
        }
        ProgressBar(progress: entry.snapshot.goalProgress)
        GardenDots(checkedDays: entry.snapshot.checkedDays ?? [])
      }
    }
    .padding(18)
  }

  private var accessoryCircular: some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 1) {
        Image(systemName: "moon.stars.fill")
          .font(.system(size: 12, weight: .semibold))
        Text(entry.snapshot.prayerName.prefix(4))
          .font(.system(size: 12, weight: .bold))
        if let nextPrayerDate = entry.snapshot.nextPrayerDate, nextPrayerDate > Date() {
          Text(nextPrayerDate, style: .timer)
            .font(.system(size: 9, weight: .semibold))
            .minimumScaleFactor(0.55)
            .monospacedDigit()
        }
      }
    }
  }

  private var accessoryRectangular: some View {
    HStack(spacing: 8) {
      Image(systemName: "moon.stars.fill")
      VStack(alignment: .leading, spacing: 1) {
        Text("\(entry.snapshot.prayerName) \(entry.snapshot.prayerTime)")
          .font(.system(size: 13, weight: .semibold))
        if let nextPrayerDate = entry.snapshot.nextPrayerDate, nextPrayerDate > Date() {
          Text("Remaining \(nextPrayerDate, style: .timer)")
            .font(.system(size: 11, weight: .medium))
        } else {
          Text(entry.snapshot.hijri)
            .font(.system(size: 11, weight: .medium))
        }
      }
    }
  }

  private var accessoryInline: some View {
    if let nextPrayerDate = entry.snapshot.nextPrayerDate, nextPrayerDate > Date() {
      return Text("\(entry.snapshot.prayerName) in \(nextPrayerDate, style: .timer)")
    }
    return Text("\(entry.snapshot.prayerName) \(entry.snapshot.prayerTime)")
  }

  private var weatherTitle: String {
    if let temp = entry.snapshot.weatherTemperatureC {
      return "\(Int(temp))° \(entry.snapshot.weather)"
    }
    return entry.snapshot.weather
  }
}

private struct NurAIStreakGardenWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      case .systemLarge:
        large
      case .accessoryCircular:
        accessoryCircular
      case .accessoryRectangular:
        accessoryRectangular
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://streak-garden"))
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Text("Garden")
          .font(.system(size: 14, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.gold)
        Spacer()
        Image(systemName: "leaf.fill")
          .foregroundStyle(NurAIWidgetPalette.emerald)
      }
      GardenSprout(progress: min(Double(entry.snapshot.streak) / 7, 1))
      Text("\(entry.snapshot.streak) Day Streak")
        .font(.system(size: 18, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
        .lineLimit(1)
        .minimumScaleFactor(0.76)
      GardenDots(checkedDays: entry.snapshot.checkedDays ?? [])
    }
    .padding(14)
  }

  private var medium: some View {
    HStack(spacing: 15) {
      GardenSprout(progress: min(Double(entry.snapshot.streak) / 7, 1))
        .frame(width: 92, height: 92)
      VStack(alignment: .leading, spacing: 8) {
        Text("Living Deen Garden")
          .font(.system(size: 14, weight: .bold))
          .foregroundStyle(NurAIWidgetPalette.emerald)
        Text("\(entry.snapshot.streak) Day Streak")
          .font(.system(size: 27, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(entry.snapshot.streak > 0 ? "Your garden is growing." : "Plant your first seed today.")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(2)
        GardenDots(checkedDays: entry.snapshot.checkedDays ?? [])
      }
      Spacer(minLength: 0)
    }
    .padding(16)
  }

  private var large: some View {
    VStack(alignment: .leading, spacing: 15) {
      HStack {
        VStack(alignment: .leading, spacing: 3) {
          Text("Streak Garden")
            .font(.system(size: 22, weight: .bold, design: .serif))
            .foregroundStyle(NurAIWidgetPalette.text)
          Text("Nurture faith. Grow every day.")
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(NurAIWidgetPalette.muted)
        }
        Spacer()
        GardenSprout(progress: min(Double(entry.snapshot.streak) / 7, 1))
          .frame(width: 92, height: 92)
      }
      Text("\(entry.snapshot.streak)")
        .font(.system(size: 62, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
      Text("Day Streak")
        .font(.system(size: 22, weight: .semibold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.gold)
      ProgressBar(progress: min(Double(entry.snapshot.streak) / 7, 1), tint: NurAIWidgetPalette.emerald)
      HStack {
        Text(daysUntilWeekCopy)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.text)
        Spacer()
        GardenDots(checkedDays: entry.snapshot.checkedDays ?? [])
      }
      WidgetMetricRow(icon: "target", title: entry.snapshot.dailyGoal, subtitle: entry.snapshot.familyGoal)
    }
    .padding(18)
  }

  private var accessoryCircular: some View {
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 1) {
        Image(systemName: "leaf.fill")
        Text("\(entry.snapshot.streak)d")
          .font(.system(size: 14, weight: .bold))
      }
    }
  }

  private var accessoryRectangular: some View {
    HStack(spacing: 7) {
      Image(systemName: "leaf.fill")
      VStack(alignment: .leading, spacing: 1) {
        Text("\(entry.snapshot.streak) day streak")
          .font(.system(size: 13, weight: .semibold))
        Text(entry.snapshot.dailyGoal)
          .font(.system(size: 11, weight: .medium))
      }
    }
  }

  private var daysUntilWeekCopy: String {
    let remaining = max(7 - min(entry.snapshot.streak, 7), 0)
    return remaining == 0 ? "Weekly milestone reached" : "\(remaining) days to 1 Week"
  }
}

private struct NurAIQuranWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      case .accessoryRectangular:
        accessoryRectangular
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(entry.snapshot.quranDeepLink)
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 10) {
      BrandMark(compact: true)
      Spacer()
      Image(systemName: "book.closed.fill")
        .font(.system(size: 22, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.gold)
      Text(entry.snapshot.quranLabel)
        .font(.system(size: 20, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
        .lineLimit(2)
        .minimumScaleFactor(0.62)
      Text(entry.snapshot.quranProgress)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
        .lineLimit(2)
    }
    .padding(14)
  }

  private var medium: some View {
    HStack(spacing: 14) {
      ZStack {
        RoundedRectangle(cornerRadius: 24)
          .fill(
            LinearGradient(
              colors: [NurAIWidgetPalette.gold.opacity(0.18), NurAIWidgetPalette.emerald.opacity(0.10)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
        Image(systemName: "book.closed.fill")
          .font(.system(size: 30, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      .frame(width: 82, height: 92)
      .overlay(RoundedRectangle(cornerRadius: 24).stroke(NurAIWidgetPalette.border, lineWidth: 1))
      VStack(alignment: .leading, spacing: 8) {
        Text("Continue Quran")
          .font(.system(size: 13, weight: .bold))
          .foregroundStyle(NurAIWidgetPalette.emerald)
        Text(entry.snapshot.quranLabel)
          .font(.system(size: 24, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(2)
          .minimumScaleFactor(0.72)
        Text(entry.snapshot.quranProgress)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(2)
        ProgressBar(progress: entry.snapshot.goalProgress, tint: NurAIWidgetPalette.gold)
      }
      Spacer(minLength: 0)
    }
    .padding(16)
  }

  private var accessoryRectangular: some View {
    HStack(spacing: 7) {
      Image(systemName: "book.closed.fill")
      VStack(alignment: .leading, spacing: 1) {
        Text(entry.snapshot.quranLabel)
          .font(.system(size: 13, weight: .semibold))
        Text(entry.snapshot.quranProgress)
          .font(.system(size: 11, weight: .medium))
      }
    }
  }
}

private struct NurAIDailyPulseWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://home"))
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Image(systemName: "sparkles")
          .foregroundStyle(NurAIWidgetPalette.emerald)
        Spacer()
        Text("\(Int(entry.snapshot.goalProgress * 100))%")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      Text("Daily Pulse")
        .font(.system(size: 17, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
      Text(entry.snapshot.dailyGoal)
        .font(.system(size: 13, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
        .lineLimit(3)
      Spacer(minLength: 0)
      ProgressBar(progress: entry.snapshot.goalProgress)
    }
    .padding(14)
  }

  private var medium: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        PillLabel(icon: "sparkles", text: "Daily Pulse")
        Spacer()
        Text("\(Int(entry.snapshot.goalProgress * 100))%")
          .font(.system(size: 16, weight: .bold, design: .rounded))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      Text(entry.snapshot.dailyGoal)
        .font(.system(size: 25, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
        .lineLimit(2)
        .minimumScaleFactor(0.68)
      Text("One focused action keeps your day connected.")
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
      ProgressBar(progress: entry.snapshot.goalProgress)
      HStack(spacing: 9) {
        WidgetMetricRow(icon: "moon.stars.fill", title: entry.snapshot.prayerName, subtitle: entry.snapshot.prayerTime)
        WidgetMetricRow(icon: "leaf.fill", title: "\(entry.snapshot.streak)d", subtitle: "Garden")
      }
    }
    .padding(16)
  }
}

private struct NurAITasbeehWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      case .accessoryCircular:
        accessoryCircular
      case .accessoryRectangular:
        accessoryRectangular
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://tasbeeh"))
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        Image(systemName: "circle.dotted")
          .font(.system(size: 18, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.emerald)
        Spacer()
        Text("\(entry.snapshot.tasbeehTargetValue)")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      Text("\(entry.snapshot.tasbeehValue)")
        .font(.system(size: 42, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
        .minimumScaleFactor(0.68)
      Text(entry.snapshot.tasbeehDhikr)
        .font(.system(size: 12, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.gold)
        .lineLimit(1)
      Text("Tap NurAI to continue your dhikr.")
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
        .lineLimit(2)
      Spacer(minLength: 0)
      ProgressBar(progress: entry.snapshot.tasbeehProgress, tint: NurAIWidgetPalette.emerald)
    }
    .padding(14)
  }

  private var medium: some View {
    HStack(spacing: 14) {
      ZStack {
        Circle()
          .stroke(NurAIWidgetPalette.gold.opacity(0.24), lineWidth: 4)
        Circle()
          .trim(from: 0, to: entry.snapshot.tasbeehProgress)
          .stroke(
            AngularGradient(
              colors: [NurAIWidgetPalette.emerald, NurAIWidgetPalette.emeraldMuted, NurAIWidgetPalette.gold],
              center: .center
            ),
            style: StrokeStyle(lineWidth: 7, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
        VStack(spacing: 1) {
          Text("\(entry.snapshot.tasbeehValue)")
            .font(.system(size: 28, weight: .bold, design: .serif))
            .foregroundStyle(NurAIWidgetPalette.text)
            .minimumScaleFactor(0.62)
          Text("dhikr")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(NurAIWidgetPalette.muted)
        }
      }
      .frame(width: 94, height: 94)

      VStack(alignment: .leading, spacing: 9) {
        PillLabel(icon: "sparkles", text: "Tasbeeh")
        Text(entry.snapshot.tasbeehDhikr)
          .font(.system(size: 23, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(2)
          .minimumScaleFactor(0.68)
        Text("\(entry.snapshot.tasbeehRemainingToTarget) to your next target · \(entry.snapshot.tasbeehDailyTotal) today")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(2)
        ProgressBar(progress: entry.snapshot.tasbeehProgress, tint: NurAIWidgetPalette.emerald)
      }
      Spacer(minLength: 0)
    }
    .padding(16)
  }

  private var accessoryCircular: some View {
    ZStack {
      AccessoryWidgetBackground()
      Gauge(value: entry.snapshot.tasbeehProgress) {
        Image(systemName: "circle.dotted")
      } currentValueLabel: {
        Text("\(entry.snapshot.tasbeehValue)")
          .minimumScaleFactor(0.55)
      }
      .gaugeStyle(.accessoryCircularCapacity)
      .tint(NurAIWidgetPalette.emerald)
    }
  }

  private var accessoryRectangular: some View {
    HStack(spacing: 7) {
      Image(systemName: "circle.dotted")
      VStack(alignment: .leading, spacing: 1) {
        Text("\(entry.snapshot.tasbeehValue) · \(entry.snapshot.tasbeehDhikr)")
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(1)
        Text("\(entry.snapshot.tasbeehDailyTotal) today")
          .font(.system(size: 11, weight: .medium))
      }
    }
  }
}

private struct NurAIWeatherPrayerWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://prayer"))
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 10) {
      Image(systemName: weatherIcon)
        .font(.system(size: 24, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.emerald)
      Text(weatherTemp)
        .font(.system(size: 35, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
      Text(entry.snapshot.weatherCopy)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
        .lineLimit(3)
      Spacer(minLength: 0)
      Text("\(entry.snapshot.prayerName) \(entry.snapshot.prayerTime)")
        .font(.system(size: 11, weight: .bold))
        .foregroundStyle(NurAIWidgetPalette.gold)
        .lineLimit(1)
    }
    .padding(14)
  }

  private var medium: some View {
    HStack(spacing: 14) {
      VStack(alignment: .leading, spacing: 7) {
        PillLabel(icon: "cloud.moon.fill", text: "Prayer weather")
        Text(weatherTemp)
          .font(.system(size: 44, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
        Text(entry.snapshot.weather)
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      Spacer(minLength: 2)
      VStack(alignment: .leading, spacing: 10) {
        WidgetMetricRow(icon: "moon.stars.fill", title: entry.snapshot.prayerName, subtitle: entry.snapshot.prayerTime)
        Text(entry.snapshot.weatherCopy)
          .font(.system(size: 13, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(3)
        ProgressBar(progress: entry.snapshot.goalProgress, tint: NurAIWidgetPalette.emerald)
      }
    }
    .padding(16)
  }

  private var weatherTemp: String {
    guard let temp = entry.snapshot.weatherTemperatureC else { return "--°" }
    return "\(Int(temp))°"
  }

  private var weatherIcon: String {
    let text = entry.snapshot.weather.lowercased()
    if text.contains("rain") { return "cloud.rain.fill" }
    if text.contains("wind") { return "wind" }
    if text.contains("sun") || text.contains("clear") { return "sun.max.fill" }
    if text.contains("cloud") { return "cloud.fill" }
    return "cloud.moon.fill"
  }
}

private struct NurAITravelWidgetView: View {
  let entry: NurAIWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        small
      case .accessoryCircular:
        accessoryCircular
      case .accessoryRectangular:
        accessoryRectangular
      default:
        medium
      }
    }
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://travel"))
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        ZStack {
          RoundedRectangle(cornerRadius: 13)
            .fill(NurAIWidgetPalette.emerald.opacity(0.12))
          Image(systemName: "paperplane.fill")
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(NurAIWidgetPalette.emerald)
        }
        .frame(width: 34, height: 34)
        Spacer()
        Text("\(Int(entry.snapshot.travelProgress * 100))%")
          .font(.system(size: 12, weight: .bold, design: .rounded))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      Spacer(minLength: 0)
      Text(entry.snapshot.travelEnabled ? "Travel Mode" : "Travel Plan")
        .font(.system(size: 17, weight: .bold, design: .serif))
        .foregroundStyle(NurAIWidgetPalette.text)
        .lineLimit(1)
      Text(entry.snapshot.travelDestination)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.gold)
        .lineLimit(2)
      Text(entry.snapshot.travelPrayerPlan)
        .font(.system(size: 11, weight: .medium))
        .foregroundStyle(NurAIWidgetPalette.muted)
        .lineLimit(2)
      ProgressBar(progress: entry.snapshot.travelProgress, tint: NurAIWidgetPalette.emerald)
    }
    .padding(14)
  }

  private var medium: some View {
    HStack(spacing: 14) {
      ZStack {
        Circle()
          .fill(NurAIWidgetPalette.surface)
        Circle()
          .stroke(NurAIWidgetPalette.gold.opacity(0.24), lineWidth: 4)
        Circle()
          .trim(from: 0, to: max(entry.snapshot.travelProgress, 0.08))
          .stroke(
            AngularGradient(
              colors: [NurAIWidgetPalette.emerald, NurAIWidgetPalette.emeraldMuted, NurAIWidgetPalette.gold],
              center: .center
            ),
            style: StrokeStyle(lineWidth: 7, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
        Image(systemName: entry.snapshot.travelEnabled ? "paperplane.fill" : "map.fill")
          .font(.system(size: 30, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.emerald)
      }
      .frame(width: 92, height: 92)

      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 7) {
          PillLabel(icon: entry.snapshot.travelEnabled ? "dot.radiowaves.left.and.right" : "sparkles", text: entry.snapshot.travelEnabled ? "Travel active" : "Travel Mode")
          Spacer(minLength: 0)
        }
        Text(entry.snapshot.travelDestination)
          .font(.system(size: 24, weight: .bold, design: .serif))
          .foregroundStyle(NurAIWidgetPalette.text)
          .lineLimit(2)
          .minimumScaleFactor(0.68)
        Text(entry.snapshot.travelPrayerPlan)
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(2)
        HStack(spacing: 8) {
          Label(entry.snapshot.travelFlight, systemImage: "airplane")
          Spacer(minLength: 0)
          Text("\(Int(entry.snapshot.travelProgress * 100))%")
            .font(.system(size: 12, weight: .bold, design: .rounded))
        }
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(NurAIWidgetPalette.gold)
        ProgressBar(progress: entry.snapshot.travelProgress, tint: NurAIWidgetPalette.emerald)
      }
    }
    .padding(16)
  }

  private var accessoryCircular: some View {
    ZStack {
      AccessoryWidgetBackground()
      Gauge(value: max(entry.snapshot.travelProgress, 0.08)) {
        Image(systemName: "paperplane.fill")
      } currentValueLabel: {
        Text("\(Int(entry.snapshot.travelProgress * 100))")
          .minimumScaleFactor(0.55)
      }
      .gaugeStyle(.accessoryCircularCapacity)
      .tint(NurAIWidgetPalette.emerald)
    }
  }

  private var accessoryRectangular: some View {
    HStack(spacing: 7) {
      Image(systemName: "paperplane.fill")
      VStack(alignment: .leading, spacing: 1) {
        Text(entry.snapshot.travelDestination)
          .font(.system(size: 13, weight: .semibold))
          .lineLimit(1)
        Text(entry.snapshot.travelPrayerPlan)
          .font(.system(size: 11, weight: .medium))
          .lineLimit(1)
      }
    }
  }
}

#if canImport(ActivityKit)
@available(iOSApplicationExtension 16.1, *)
private extension NurAIPrayerActivityAttributes.ContentState {
  var safePrayerName: String { prayerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Next prayer" : prayerName }
  var safePrayerTime: String { prayerTimeLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "--:--" : prayerTimeLabel }
  var safeLocation: String { locationLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "NurAI" : locationLabel }
  var safeHijri: String { hijriDateLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Daily Deen" : hijriDateLabel }
  var safeQibla: String { qiblaLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Qibla" : qiblaLabel }
  var safeWeatherInsight: String {
    weatherInsight.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      ? "Open NurAI for live prayer guidance."
      : weatherInsight
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct LiveActivityCountdownText: View {
  let date: Date?
  var compact = false

  var body: some View {
    if let date {
      Text(date, style: .timer)
        .monospacedDigit()
        .font(.system(size: compact ? 13 : 26, weight: .bold, design: .rounded))
        .foregroundStyle(NurAIWidgetPalette.gold)
        .minimumScaleFactor(0.72)
        .lineLimit(1)
    } else {
      Text("--:--")
        .monospacedDigit()
        .font(.system(size: compact ? 13 : 26, weight: .bold, design: .rounded))
        .foregroundStyle(NurAIWidgetPalette.gold)
    }
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct NurAIPrayerLiveActivityLockScreenView: View {
  let context: ActivityViewContext<NurAIPrayerActivityAttributes>

  var body: some View {
    HStack(spacing: 14) {
      ZStack {
        Circle()
          .stroke(NurAIWidgetPalette.gold.opacity(0.28), lineWidth: 3)
        Circle()
          .trim(from: 0.08, to: 0.84)
          .stroke(
            AngularGradient(
              colors: [
                NurAIWidgetPalette.gold,
                NurAIWidgetPalette.emerald,
                NurAIWidgetPalette.emeraldMuted,
                NurAIWidgetPalette.gold,
              ],
              center: .center
            ),
            style: StrokeStyle(lineWidth: 5, lineCap: .round)
          )
          .rotationEffect(.degrees(-90))
        Image(systemName: "moon.stars.fill")
          .font(.system(size: 22, weight: .semibold))
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      .frame(width: 66, height: 66)

      VStack(alignment: .leading, spacing: 5) {
        HStack(spacing: 7) {
          Text(context.state.safePrayerName)
            .font(.system(size: 20, weight: .bold, design: .rounded))
            .foregroundStyle(NurAIWidgetPalette.text)
            .lineLimit(1)
          Text(context.state.safePrayerTime)
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .foregroundStyle(NurAIWidgetPalette.muted)
            .lineLimit(1)
        }

        LiveActivityCountdownText(date: context.state.nextPrayerTime)

        HStack(spacing: 8) {
          Label(context.state.safeLocation, systemImage: "location.fill")
          Label(context.state.safeQibla, systemImage: "safari.fill")
        }
        .font(.system(size: 12, weight: .semibold, design: .rounded))
        .foregroundStyle(NurAIWidgetPalette.emerald)
        .lineLimit(1)

        Text(context.state.safeWeatherInsight)
          .font(.system(size: 12, weight: .medium, design: .rounded))
          .foregroundStyle(NurAIWidgetPalette.muted)
          .lineLimit(1)
      }

      Spacer(minLength: 0)
    }
    .padding(16)
    .nuraiWidgetBackground()
    .widgetURL(URL(string: "nurai://prayer"))
  }
}

@available(iOSApplicationExtension 16.1, *)
struct NurAIPrayerLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: NurAIPrayerActivityAttributes.self) { context in
      NurAIPrayerLiveActivityLockScreenView(context: context)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 3) {
            Label(context.state.safeLocation, systemImage: "location.fill")
              .font(.caption2.weight(.semibold))
              .foregroundStyle(NurAIWidgetPalette.emerald)
              .lineLimit(1)
            Text(context.state.safeHijri)
              .font(.caption2)
              .foregroundStyle(NurAIWidgetPalette.muted)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 3) {
            Label(context.state.safeQibla, systemImage: "safari.fill")
              .font(.caption2.weight(.semibold))
              .foregroundStyle(NurAIWidgetPalette.gold)
              .lineLimit(1)
            Text(context.state.safePrayerTime)
              .font(.caption2.weight(.bold))
              .foregroundStyle(NurAIWidgetPalette.text)
          }
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 2) {
            Text(context.state.safePrayerName)
              .font(.system(size: 18, weight: .bold, design: .rounded))
              .foregroundStyle(NurAIWidgetPalette.text)
              .lineLimit(1)
            LiveActivityCountdownText(date: context.state.nextPrayerTime, compact: true)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.safeWeatherInsight)
            .font(.caption2.weight(.medium))
            .foregroundStyle(NurAIWidgetPalette.muted)
            .lineLimit(1)
        }
      } compactLeading: {
        Image(systemName: "moon.stars.fill")
          .foregroundStyle(NurAIWidgetPalette.gold)
      } compactTrailing: {
        LiveActivityCountdownText(date: context.state.nextPrayerTime, compact: true)
      } minimal: {
        Image(systemName: "moon.fill")
          .foregroundStyle(NurAIWidgetPalette.gold)
      }
      .widgetURL(URL(string: "nurai://prayer"))
      .keylineTint(NurAIWidgetPalette.gold)
    }
    .configurationDisplayName("NurAI Live Prayer")
    .description("A live Lock Screen and Dynamic Island countdown for the next prayer.")
  }
}
#endif

@main
struct NurAIWidgetsBundle: WidgetBundle {
  var body: some Widget {
    NurAIPrayerWidget()
    NurAIStreakGardenWidget()
    NurAIQuranWidget()
    NurAIDailyPulseWidget()
    NurAITasbeehWidget()
    NurAIWeatherPrayerWidget()
    NurAITravelWidget()
    if #available(iOSApplicationExtension 16.1, *) {
      NurAIPrayerLiveActivity()
    }
  }
}

struct NurAIPrayerWidget: Widget {
  let kind = "NurAIPrayerWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAIPrayerWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Prayer")
    .description("Live next-prayer countdown, Qibla hint, weather, and daily progress.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryInline, .accessoryCircular, .accessoryRectangular])
  }
}

struct NurAIStreakGardenWidget: Widget {
  let kind = "NurAIStreakGardenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAIStreakGardenWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Streak Garden")
    .description("See your Deen garden, weekly glow dots, and next daily action.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryCircular, .accessoryRectangular])
  }
}

struct NurAIQuranWidget: Widget {
  let kind = "NurAIQuranWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAIQuranWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Quran")
    .description("Jump back into Quran reading from your Home Screen or Lock Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}

struct NurAIDailyPulseWidget: Widget {
  let kind = "NurAIDailyPulseWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAIDailyPulseWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Daily Pulse")
    .description("Your most important daily Deen action and progress at a glance.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct NurAIWeatherPrayerWidget: Widget {
  let kind = "NurAIWeatherPrayerWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAIWeatherPrayerWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Prayer Weather")
    .description("Prayer-aware weather insight for walking to the masjid or planning your day.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct NurAITasbeehWidget: Widget {
  let kind = "NurAITasbeehWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAITasbeehWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Tasbeeh")
    .description("Continue your dhikr count, target, and daily total from the Home Screen or Lock Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}

struct NurAITravelWidget: Widget {
  let kind = "NurAITravelWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: NurAIWidgetProvider()) { entry in
      NurAITravelWidgetView(entry: entry)
    }
    .configurationDisplayName("NurAI Travel")
    .description("Keep your prayer-first journey, flight, and travel readiness on the Home Screen or Lock Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
  }
}
