// Promoted from the existing hand-drawn set (client/components/premium/svg/PremiumSvgs.tsx).
// Re-exported under the icon system's canonical names rather than duplicated —
// same path data, same restrained 2.4-stroke line language, gold accent dot
// now opt-in via `accented` instead of always-on (see ICON_SYSTEM_AUDIT.md).
export {
  QuranIconSvg as QuranIcon,
  PrayerIconSvg as PrayerIcon,
  QiblaIconSvg as QiblaIcon,
  ArabicIconSvg as ArabicLearningIcon,
  AIIconSvg as NurAIIcon,
  HifzIconSvg as HifzIcon,
  TasbeehIconSvg as TasbeehIcon,
  DuaIconSvg as DuaIcon,
  HadithIconSvg as HadithIcon,
  FamilyIconSvg as FamilyIcon,
  CommunityIconSvg as CommunityIcon,
  FinanceIconSvg as IslamicFinanceIcon,
  ScholarCrownSvg as ScholarIcon,
  PremiumLockSvg as PremiumIcon,
  AchievementBadgeSvg as AchievementIcon,
  StreakGardenSvg as StreakGardenIcon,
  EmptyMosqueSvg as MosqueArtwork,
  CrescentMark,
} from "@/components/premium/svg/PremiumSvgs";

// New — filled the gaps the audit found (see ICON_SYSTEM_AUDIT.md Category 2).
export {
  NamesOfAllahIcon,
  MosqueIcon,
  KaabaIcon,
  MoonIcon,
  WomenSpaceIcon,
  MenSpaceIcon,
  HealthIcon,
  CharityIcon,
  ReflectionIcon,
  ProgressIcon,
  HomeMarkIcon,
  ExploreMarkIcon,
  MoreMarkIcon,
  type CustomIconProps,
} from "./NurAiCustomIcons";
