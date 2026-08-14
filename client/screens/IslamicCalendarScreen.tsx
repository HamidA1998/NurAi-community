import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, CategoryColors, Spacing } from "@/constants/theme";
import { useNurAI } from "@/context/NurAIContext";
import {
  CrescentMark,
  GoldDivider,
} from "@/components/premium/svg/PremiumSvgs";
import {
  ISLAMIC_CALENDAR_EVENTS,
  ISLAMIC_MONTHS,
  type IslamicCalendarEvent,
} from "@/data/islamicCalendarEvents";
import { getHijriDate } from "@/services/nuraiHijriEngine";
import { AppIcon, type AppIconName } from "@/components/icons";

const DAY_MS = 86400000;

type CalendarEventOccurrence = IslamicCalendarEvent & {
  daysUntil: number;
  gregorianDate: Date;
  gregorianDateLabel: string;
  hijriDateLabel: string;
  statusLabel: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function approximateDaysUntil(event: IslamicCalendarEvent, today: Date) {
  const hijri = getHijriDate(today);
  let days = (event.month - hijri.month) * 30 + (event.day - hijri.day);
  if (days < 0) days += 354;
  return Math.max(0, days);
}

function findNextGregorianDate(event: IslamicCalendarEvent, today: Date) {
  const start = startOfDay(today);
  for (let offset = 0; offset <= 390; offset += 1) {
    const candidate = addDays(start, offset);
    const hijri = getHijriDate(candidate);
    if (hijri.month === event.month && hijri.day === event.day) {
      return candidate;
    }
  }
  return addDays(start, approximateDaysUntil(event, today));
}

function formatGregorianDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDaysUntil(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `In ${weeks} weeks`;
  const months = Math.round(days / 29.5);
  return `In ${months} months`;
}

function eventTypeLabel(type: IslamicCalendarEvent["type"]) {
  if (type === "major") return "Major";
  if (type === "recommended") return "Sunnah";
  if (type === "learning") return "Learn";
  return "Awareness";
}

function reliabilityLabel(
  reliability: IslamicCalendarEvent["dateReliability"],
) {
  if (reliability === "moon-sighting") return "Moon-sighting date";
  if (reliability === "observed") return "Observed calendar date";
  return "Approximate date";
}

function buildEventOccurrences(today: Date): CalendarEventOccurrence[] {
  const start = startOfDay(today);
  return ISLAMIC_CALENDAR_EVENTS.map((event) => {
    const gregorianDate = findNextGregorianDate(event, start);
    const daysUntil = Math.max(
      0,
      Math.round(
        (startOfDay(gregorianDate).getTime() - start.getTime()) / DAY_MS,
      ),
    );
    return {
      ...event,
      daysUntil,
      gregorianDate,
      gregorianDateLabel: formatGregorianDate(gregorianDate),
      hijriDateLabel: `${event.day} ${ISLAMIC_MONTHS[event.month - 1]}`,
      statusLabel: formatDaysUntil(daysUntil),
    };
  }).sort((a, b) => a.daysUntil - b.daysUntil);
}

export default function IslamicCalendarScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { getCalendarInsightFn } = useNurAI();
  const [showInsight, setShowInsight] = useState(true);
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEventOccurrence | null>(null);

  const today = useMemo(() => new Date(), []);
  const hijri = getHijriDate(today);
  const eventOccurrences = useMemo(() => buildEventOccurrences(today), [today]);
  useEffect(() => {
    const initialEventId = route.params?.initialEventId;
    if (!initialEventId) return;
    const event = eventOccurrences.find((item) => item.id === initialEventId);
    if (event) setSelectedEvent(event);
  }, [eventOccurrences, route.params?.initialEventId]);
  const nextEvent = eventOccurrences[0];
  const nextMajorEvent =
    eventOccurrences.find((event) => event.type === "major") || nextEvent;
  const monthProgress = Math.min(
    100,
    Math.max(3, Math.round((hijri.day / 30) * 100)),
  );

  const calendarInsight = getCalendarInsightFn(
    hijri.month,
    hijri.day,
    nextEvent?.name,
  );

  const getEventColor = (event: IslamicCalendarEvent) => {
    const c = CategoryColors[event.colorKey] || CategoryColors.emerald;
    return isDark ? c.dark : c;
  };

  const openEvent = (event: CalendarEventOccurrence) => {
    setSelectedEvent(event);
  };

  const closeEvent = () => {
    setSelectedEvent(null);
  };

  const openPrimaryAction = () => {
    if (!selectedEvent?.primaryActionScreen) return;
    const screen = selectedEvent.primaryActionScreen;
    closeEvent();
    navigation.navigate(screen);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            {
              backgroundColor: theme.surfaceGlass,
              borderColor: theme.borderSubtle,
            },
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppIcon name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitle}>
          <ThemedText type="h4">Islamic Calendar</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Smart Hijri events and reminders
          </ThemedText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing["3xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <LinearGradient
            colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dateCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <ThemedText type="caption" style={styles.heroKicker}>
                  TODAY IN HIJRI
                </ThemedText>
                <ThemedText
                  type="h1"
                  style={styles.hijriMonth}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {Math.round(hijri.day)} {hijri.monthName}
                </ThemedText>
                <ThemedText type="body" style={styles.hijriYear}>
                  {hijri.year} AH
                </ThemedText>
              </View>
              <View style={styles.dayOrb}>
                <CrescentMark
                  size={18}
                  color={theme.scholar}
                  style={styles.dayOrbCrescent}
                />
                <ThemedText
                  type="h1"
                  style={styles.hijriDay}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {Math.round(hijri.day)}
                </ThemedText>
              </View>
            </View>

            <GoldDivider
              color={theme.scholar}
              opacity={0.45}
              style={styles.heroDivider}
            />

            <View style={styles.gregorianBadge}>
              <AppIcon name="calendar" size={13} color={theme.onGradientHigh} />
              <ThemedText type="small" style={styles.gregorianText}>
                {today.toLocaleDateString("en-GB", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </ThemedText>
            </View>

            <View style={styles.monthProgressWrap}>
              <View style={styles.monthProgressHeader}>
                <ThemedText type="caption" style={styles.monthProgressLabel}>
                  Month progress
                </ThemedText>
                <ThemedText type="caption" style={styles.monthProgressLabel}>
                  Approx. {monthProgress}%
                </ThemedText>
              </View>
              <View style={styles.monthTrack}>
                <View
                  style={[
                    styles.monthFill,
                    {
                      width: `${monthProgress}%`,
                      backgroundColor: theme.onGradientHigh,
                    },
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.noticeRow}>
          <AppIcon name="info" size={14} color={theme.scholar} />
          <ThemedText
            type="caption"
            style={[styles.noticeText, { color: theme.textMuted }]}
          >
            Hijri dates are approximate and can vary by local moon sighting.
          </ThemedText>
        </View>

        {showInsight ? (
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={{ marginBottom: Spacing.md }}
          >
            <LinearGradient
              colors={
                isDark
                  ? [theme.gradientStart, theme.gradientMid]
                  : [theme.gradientLightBg, theme.gradientLightBg2]
              }
              style={styles.nuraiCard}
            >
              <View style={styles.nuraiHeader}>
                <View style={styles.nuraiHeaderCopy}>
                  <View
                    style={[
                      styles.nuraiDot,
                      { backgroundColor: theme.primaryText },
                    ]}
                  />
                  <ThemedText
                    style={[styles.nuraiLabel, { color: theme.primaryText }]}
                  >
                    NurAI Insight
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => setShowInsight(false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss calendar insight"
                >
                  <AppIcon name="x" size={14} color={theme.primaryText} />
                </Pressable>
              </View>
              <View style={styles.nuraiBody}>
                <AppIcon
                  name={calendarInsight.icon as AppIconName}
                  size={18}
                  color={theme.primaryText}
                />
                <View style={styles.nuraiCopy}>
                  <ThemedText
                    style={[styles.nuraiTitle, { color: theme.primaryText }]}
                  >
                    {calendarInsight.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.nuraiText, { color: theme.primaryText }]}
                  >
                    {calendarInsight.body}
                  </ThemedText>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        ) : null}

        {nextEvent ? (
          <Animated.View entering={FadeInDown.delay(150).duration(350)}>
            <Pressable
              onPress={() => openEvent(nextEvent)}
              style={({ pressed }) => [
                styles.nextEventCard,
                {
                  backgroundColor: theme.surfaceGlass,
                  borderColor: theme.primaryBorder,
                },
                pressed ? { opacity: 0.88 } : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open details for ${nextEvent.name}`}
              testID="calendar-next-event"
            >
              <View style={styles.nextEventTop}>
                <View
                  style={[
                    styles.nextEventIcon,
                    { backgroundColor: getEventColor(nextEvent).bg },
                  ]}
                >
                  <AppIcon
                    name={nextEvent.icon}
                    size={20}
                    color={getEventColor(nextEvent).text}
                  />
                </View>
                <View style={styles.nextEventCopy}>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    NEXT ISLAMIC MOMENT
                  </ThemedText>
                  <ThemedText type="h3">{nextEvent.name}</ThemedText>
                </View>
                <AppIcon
                  name="chevron-right"
                  size={20}
                  color={theme.textMuted}
                />
              </View>
              <View style={styles.nextMetaRow}>
                <View style={styles.nextMetaPill}>
                  <ThemedText
                    type="caption"
                    style={[styles.nextMetaText, { color: theme.primaryText }]}
                  >
                    {nextEvent.statusLabel}
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {nextEvent.hijriDateLabel} - {nextEvent.gregorianDateLabel}
                </ThemedText>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}

        {nextMajorEvent ? (
          <Animated.View entering={FadeInDown.delay(190).duration(350)}>
            <View
              style={[
                styles.smartPlannerCard,
                {
                  backgroundColor: theme.scholarSoft,
                  borderColor: theme.borderSubtle,
                },
              ]}
            >
              <AppIcon name="target" size={18} color={theme.scholar} />
              <View style={styles.smartPlannerCopy}>
                <ThemedText type="small" style={styles.smartPlannerTitle}>
                  Smart preparation
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {nextMajorEvent.name} is{" "}
                  {nextMajorEvent.statusLabel.toLowerCase()}. Tap the event for
                  actions, source notes, and date confidence.
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <ThemedText type="h4">Upcoming Events</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textMuted }}>
            Tap for detail
          </ThemedText>
        </View>

        {eventOccurrences.map((event, index) => {
          const color = getEventColor(event);
          return (
            <Animated.View
              key={event.id}
              entering={FadeInDown.delay(230 + index * 35).duration(300)}
            >
              <Pressable
                onPress={() => openEvent(event)}
                style={({ pressed }) => [
                  styles.eventCard,
                  {
                    backgroundColor: theme.surfaceGlass,
                    borderColor:
                      event.daysUntil === 0
                        ? theme.primaryBorder
                        : theme.borderSubtle,
                  },
                  pressed
                    ? { opacity: 0.86, transform: [{ scale: 0.99 }] }
                    : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${event.name} details`}
                testID={`calendar-event-${event.id}`}
              >
                <View style={[styles.eventIcon, { backgroundColor: color.bg }]}>
                  <AppIcon name={event.icon} size={18} color={color.text} />
                </View>
                <View style={styles.eventInfo}>
                  <View style={styles.eventNameRow}>
                    <ThemedText type="small" style={styles.eventName}>
                      {event.name}
                    </ThemedText>
                    <View
                      style={[
                        styles.eventTypePill,
                        { backgroundColor: color.bg },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={[styles.eventTypeText, { color: color.text }]}
                      >
                        {eventTypeLabel(event.type)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText type="caption" style={{ color: theme.textMuted }}>
                    {event.hijriDateLabel} - {event.gregorianDateLabel}
                  </ThemedText>
                </View>
                <View style={styles.eventStatusWrap}>
                  <ThemedText
                    type="caption"
                    style={[styles.eventStatus, { color: theme.primaryText }]}
                  >
                    {event.statusLabel}
                  </ThemedText>
                  <AppIcon
                    name="chevron-right"
                    size={16}
                    color={theme.textMuted}
                  />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeEvent}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeEvent}
            accessibilityRole="button"
            accessibilityLabel="Close event details"
          />
          {selectedEvent ? (
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.borderSubtle,
                  paddingBottom: insets.bottom + Spacing.lg,
                },
              ]}
            >
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: theme.handleBar },
                ]}
              />
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <View
                    style={[
                      styles.sheetIcon,
                      { backgroundColor: getEventColor(selectedEvent).bg },
                    ]}
                  >
                    <AppIcon
                      name={selectedEvent.icon}
                      size={24}
                      color={getEventColor(selectedEvent).text}
                    />
                  </View>
                  <View style={styles.sheetTitleWrap}>
                    <ThemedText type="h2">{selectedEvent.name}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      {selectedEvent.hijriDateLabel} -{" "}
                      {selectedEvent.gregorianDateLabel}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={closeEvent}
                    hitSlop={8}
                    style={[
                      styles.closeButton,
                      {
                        backgroundColor: theme.surfaceGlass,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Close event details"
                  >
                    <AppIcon name="x" size={18} color={theme.icon} />
                  </Pressable>
                </View>

                <View style={styles.sheetMetaGrid}>
                  <View
                    style={[
                      styles.sheetMetaCard,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      When
                    </ThemedText>
                    <ThemedText type="small" style={styles.sheetMetaValue}>
                      {selectedEvent.statusLabel}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.sheetMetaCard,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textMuted }}
                    >
                      Confidence
                    </ThemedText>
                    <ThemedText type="small" style={styles.sheetMetaValue}>
                      {reliabilityLabel(selectedEvent.dateReliability)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.sheetSection}>
                  <ThemedText type="h4">What This Is</ThemedText>
                  <ThemedText
                    type="body"
                    style={[styles.sheetBody, { color: theme.textSecondary }]}
                  >
                    {selectedEvent.summary}
                  </ThemedText>
                </View>

                <View style={styles.sheetSection}>
                  <ThemedText type="h4">Why It Matters</ThemedText>
                  <ThemedText
                    type="body"
                    style={[styles.sheetBody, { color: theme.textSecondary }]}
                  >
                    {selectedEvent.whyItMatters}
                  </ThemedText>
                </View>

                <View style={styles.sheetSection}>
                  <ThemedText type="h4">Suggested Actions</ThemedText>
                  <View style={styles.actionList}>
                    {selectedEvent.suggestedActions.map((action) => (
                      <View key={action} style={styles.actionItem}>
                        <AppIcon
                          name="check-circle"
                          size={16}
                          color={theme.primary}
                        />
                        <ThemedText
                          type="small"
                          style={[
                            styles.actionText,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {action}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedEvent.caution ? (
                  <View
                    style={[
                      styles.cautionBox,
                      {
                        backgroundColor: theme.scholarSoft,
                        borderColor: theme.borderSubtle,
                      },
                    ]}
                  >
                    <AppIcon
                      name="alert-circle"
                      size={17}
                      color={theme.scholar}
                    />
                    <ThemedText
                      type="caption"
                      style={[
                        styles.cautionText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {selectedEvent.caution}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.sheetSection}>
                  <ThemedText type="h4">Source Notes</ThemedText>
                  <View style={styles.sourceList}>
                    {selectedEvent.sourceNotes.map((note) => (
                      <View key={note} style={styles.sourceItem}>
                        <View
                          style={[
                            styles.sourceDot,
                            { backgroundColor: theme.scholar },
                          ]}
                        />
                        <ThemedText
                          type="caption"
                          style={[
                            styles.sourceText,
                            { color: theme.textMuted },
                          ]}
                        >
                          {note}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedEvent.primaryActionLabel &&
                selectedEvent.primaryActionScreen ? (
                  <Pressable
                    onPress={openPrimaryAction}
                    style={({ pressed }) => [
                      styles.primaryAction,
                      { backgroundColor: theme.primary },
                      pressed ? { opacity: 0.9 } : null,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={selectedEvent.primaryActionLabel}
                    testID="calendar-event-primary-action"
                  >
                    <ThemedText
                      type="small"
                      style={[
                        styles.primaryActionText,
                        { color: theme.primaryForeground },
                      ]}
                    >
                      {selectedEvent.primaryActionLabel}
                    </ThemedText>
                    <AppIcon
                      name="arrow-right"
                      size={16}
                      color={theme.primaryForeground}
                    />
                  </Pressable>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  dateCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.lg,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroKicker: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "PlusJakartaSans_700Bold",
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  hijriMonth: {
    color: "#FFFFFF",
    lineHeight: 42,
  },
  hijriYear: {
    color: "rgba(255,255,255,0.82)",
    marginTop: 4,
  },
  dayOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    position: "relative",
  },
  dayOrbCrescent: {
    position: "absolute",
    top: 11,
    right: 13,
  },
  heroDivider: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  hijriDay: {
    color: "#FFFFFF",
    fontSize: 48,
    lineHeight: 54,
  },
  gregorianBadge: {
    marginTop: Spacing.lg,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  gregorianText: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  monthProgressWrap: {
    marginTop: Spacing.lg,
  },
  monthProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  monthProgressLabel: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  monthTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  monthFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  noticeText: {
    flex: 1,
    minWidth: 0,
  },
  nuraiCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  nuraiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  nuraiHeaderCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  nuraiDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  nuraiLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  nuraiBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  nuraiCopy: {
    flex: 1,
    minWidth: 0,
  },
  nuraiTitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 4,
  },
  nuraiText: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
  nextEventCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  nextEventTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  nextEventIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  nextEventCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  nextMetaPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  nextMetaText: {
    fontFamily: "PlusJakartaSans_700Bold",
  },
  smartPlannerCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  smartPlannerCopy: {
    flex: 1,
    minWidth: 0,
  },
  smartPlannerTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    marginBottom: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eventNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  eventName: {
    flexShrink: 1,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  eventTypePill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
  },
  eventTypeText: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  eventStatusWrap: {
    alignItems: "flex-end",
    gap: 3,
  },
  eventStatus: {
    fontFamily: "PlusJakartaSans_700Bold",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sheetIcon: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetMetaGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sheetMetaCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  sheetMetaValue: {
    fontFamily: "PlusJakartaSans_700Bold",
  },
  sheetSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sheetBody: {
    lineHeight: 22,
  },
  actionList: {
    gap: Spacing.sm,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    lineHeight: 19,
  },
  cautionBox: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cautionText: {
    flex: 1,
    minWidth: 0,
    lineHeight: 18,
  },
  sourceList: {
    gap: Spacing.sm,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  sourceDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
  },
  sourceText: {
    flex: 1,
    minWidth: 0,
    lineHeight: 18,
  },
  primaryAction: {
    minHeight: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  primaryActionText: {
    fontFamily: "PlusJakartaSans_700Bold",
  },
});
