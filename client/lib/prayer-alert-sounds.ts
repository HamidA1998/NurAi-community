export type PrayerAlertSoundMode = "none" | "default" | "athan" | "takbir";

export const PRAYER_ALERT_SOUND_FILES: Record<
  Exclude<PrayerAlertSoundMode, "none" | "default">,
  string
> = {
  athan: "athan-alert.wav",
  takbir: "takbir-alert.wav",
};

export const PRAYER_ALERT_SOUND_LABELS: Record<PrayerAlertSoundMode, string> = {
  none: "None",
  default: "Standard",
  athan: "Athan",
  takbir: "Takbir",
};

export function notificationSoundForMode(
  mode: PrayerAlertSoundMode | undefined,
  globalSoundEnabled: boolean | undefined,
): boolean | string | null {
  if (!globalSoundEnabled || !mode || mode === "none") return null;
  if (mode === "default") return true;
  return PRAYER_ALERT_SOUND_FILES[mode];
}
