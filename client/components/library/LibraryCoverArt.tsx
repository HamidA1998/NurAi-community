import React from "react";
import {
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import { LIBRARY_COVER_IMAGES } from "@/data/libraryCoverImages";
import {
  type Book,
  type BookCoverAccent,
  type BookCoverMotif,
} from "@/types/library";
import { AppIcon, type AppIconName } from "@/components/icons";

type CoverSize = "thumbnail" | "feature" | "hero";
type FeatherName = AppIconName;

type CoverPalette = {
  colors: [string, string, string];
  accent: string;
  accentSoft: string;
  border: string;
  text: string;
  muted: string;
};

const COVER_PALETTES: Record<BookCoverAccent, CoverPalette> = {
  emerald: {
    colors: ["#042F2E", "#064E3B", "#07111F"],
    accent: "#34D399",
    accentSoft: "rgba(52, 211, 153, 0.16)",
    border: "rgba(52, 211, 153, 0.38)",
    text: "#F8FAFC",
    muted: "rgba(248, 250, 252, 0.68)",
  },
  gold: {
    colors: ["#422006", "#4A3514", "#07111F"],
    accent: "#F5C76B",
    accentSoft: "rgba(245, 199, 107, 0.17)",
    border: "rgba(245, 199, 107, 0.42)",
    text: "#FFF7E6",
    muted: "rgba(255, 247, 230, 0.7)",
  },
  blue: {
    colors: ["#0B2447", "#15375E", "#07111F"],
    accent: "#7DD3FC",
    accentSoft: "rgba(125, 211, 252, 0.15)",
    border: "rgba(125, 211, 252, 0.34)",
    text: "#EFF6FF",
    muted: "rgba(239, 246, 255, 0.68)",
  },
  rose: {
    colors: ["#4C0519", "#4C1325", "#07111F"],
    accent: "#FDA4AF",
    accentSoft: "rgba(253, 164, 175, 0.16)",
    border: "rgba(253, 164, 175, 0.34)",
    text: "#FFF1F2",
    muted: "rgba(255, 241, 242, 0.68)",
  },
  purple: {
    colors: ["#2E1065", "#2E175A", "#07111F"],
    accent: "#C4B5FD",
    accentSoft: "rgba(196, 181, 253, 0.16)",
    border: "rgba(196, 181, 253, 0.34)",
    text: "#FAF5FF",
    muted: "rgba(250, 245, 255, 0.68)",
  },
  slate: {
    colors: ["#111827", "#1E293B", "#07111F"],
    accent: "#CBD5E1",
    accentSoft: "rgba(203, 213, 225, 0.14)",
    border: "rgba(203, 213, 225, 0.28)",
    text: "#F8FAFC",
    muted: "rgba(248, 250, 252, 0.62)",
  },
};

const MOTIF_ICONS: Record<BookCoverMotif, FeatherName> = {
  quran: "book-open",
  fatihah: "bookmark",
  arabic: "type",
  roots: "git-branch",
  salah: "clock",
  purification: "droplet",
  morning: "sunrise",
  habits: "repeat",
  dua: "message-circle",
  dhikr: "refresh-cw",
  marriage: "heart",
  parenting: "home",
  adab: "smile",
  anger: "zap",
  wealth: "briefcase",
  business: "trending-up",
  revert: "compass",
  dawah: "send",
  ramadan: "moon",
  "laylatul-qadr": "star",
  hifz: "layers",
  akhirah: "sunset",
  purpose: "target",
  attention: "eye-off",
  modesty: "shield",
  sabr: "anchor",
  tawbah: "refresh-ccw",
  identity: "user-check",
  women: "users",
  charity: "gift",
  zakat: "dollar-sign",
  hajj: "map",
  seerah: "feather",
  hadith: "file-text",
  fiqh: "search",
  children: "user-plus",
  community: "users",
  student: "edit-3",
  focus: "award",
};

export function LibraryCoverArt({
  book,
  size = "thumbnail",
  progressPercentage,
  style,
}: {
  book: Book;
  size?: CoverSize;
  progressPercentage?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = COVER_PALETTES[book.coverDesign.accent];
  const isHero = size === "hero";
  const isThumbnail = size === "thumbnail";
  const iconName = MOTIF_ICONS[book.coverDesign.motif];
  const progress = Math.max(0, Math.min(progressPercentage ?? 0, 100));
  const coverImage = LIBRARY_COVER_IMAGES[book.id];

  if (coverImage) {
    return (
      <ImageBackground
        source={coverImage}
        resizeMode="cover"
        imageStyle={[styles.coverImage, imageRadiusStyles[size]]}
        style={[
          styles.cover,
          styles.imageCover,
          sizeStyles[size],
          { borderColor: palette.border },
          style,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.imageShade,
            {
              borderColor: palette.border,
              backgroundColor: isThumbnail
                ? "rgba(3, 7, 18, 0.04)"
                : "rgba(3, 7, 18, 0.02)",
            },
          ]}
        />
        {progress > 0 ? (
          <View
            style={[
              styles.imageProgressDock,
              isThumbnail ? styles.thumbnailImageProgressDock : null,
            ]}
          >
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: "rgba(255, 255, 255, 0.16)" },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: palette.accent },
                ]}
              />
            </View>
          </View>
        ) : null}
      </ImageBackground>
    );
  }

  return (
    <LinearGradient
      colors={palette.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.cover,
        sizeStyles[size],
        { borderColor: palette.border },
        style,
      ]}
    >
      <View style={[styles.topRule, { backgroundColor: palette.accent }]} />
      <View
        style={[
          styles.cornerLine,
          styles.cornerTop,
          { borderColor: palette.border },
        ]}
      />
      <View
        style={[
          styles.cornerLine,
          styles.cornerBottom,
          { borderColor: palette.border },
        ]}
      />

      <View style={styles.coverHeader}>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={[
            styles.eyebrow,
            isThumbnail ? styles.thumbnailEyebrow : null,
            { color: palette.accent },
          ]}
        >
          {book.coverDesign.eyebrow.toUpperCase()}
        </ThemedText>
        <View
          style={[
            styles.seal,
            isThumbnail ? styles.thumbnailSeal : null,
            {
              borderColor: palette.border,
              backgroundColor: palette.accentSoft,
            },
          ]}
        >
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={[
              styles.sealText,
              isThumbnail ? styles.thumbnailSealText : null,
              { color: palette.accent },
            ]}
          >
            {book.coverDesign.seal}
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.motifFrame,
          isHero ? styles.heroMotifFrame : null,
          isThumbnail ? styles.thumbnailMotifFrame : null,
          { borderColor: palette.border, backgroundColor: palette.accentSoft },
        ]}
      >
        <View style={[styles.diamond, { borderColor: palette.border }]} />
        <AppIcon
          name={iconName}
          size={isHero ? 34 : isThumbnail ? 18 : 22}
          color={palette.accent}
        />
      </View>

      {!isThumbnail ? (
        <View style={styles.titleBlock}>
          <ThemedText
            type={isHero ? "hero" : "h4"}
            numberOfLines={isHero ? 3 : 2}
            adjustsFontSizeToFit
            minimumFontScale={0.76}
            style={[
              styles.title,
              isHero ? styles.heroTitle : null,
              { color: palette.text },
            ]}
          >
            {book.title}
          </ThemedText>
          <ThemedText
            type={isHero ? "small" : "caption"}
            numberOfLines={isHero ? 2 : 1}
            style={[styles.subtitle, { color: palette.muted }]}
          >
            {book.subtitle}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.coverFooter}>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={[
            styles.edition,
            isThumbnail ? styles.thumbnailEdition : null,
            { color: palette.muted },
          ]}
        >
          {book.coverDesign.edition.toUpperCase()}
        </ThemedText>
        {progress > 0 ? (
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: palette.accentSoft },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: palette.accent },
              ]}
            />
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const sizeStyles = StyleSheet.create({
  thumbnail: {
    width: 72,
    height: 90,
    padding: 8,
    borderRadius: BorderRadius.lg,
  },
  feature: {
    width: 96,
    height: 132,
    padding: Spacing.sm,
    borderRadius: 22,
  },
  hero: {
    width: "100%",
    minHeight: 306,
    padding: Spacing.xl,
    borderRadius: BorderRadius["2xl"],
  },
});

const imageRadiusStyles = StyleSheet.create({
  thumbnail: {
    borderRadius: BorderRadius.lg,
  },
  feature: {
    borderRadius: 22,
  },
  hero: {
    borderRadius: BorderRadius["2xl"],
  },
});

const styles = StyleSheet.create({
  cover: {
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  imageCover: {
    backgroundColor: "#07111F",
  },
  coverImage: {
    overflow: "hidden",
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
  imageProgressDock: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
  },
  thumbnailImageProgressDock: {
    left: 8,
    right: 8,
    bottom: 7,
  },
  topRule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.78,
  },
  cornerLine: {
    position: "absolute",
    width: 52,
    height: 52,
    borderWidth: 1,
    opacity: 0.35,
    transform: [{ rotate: "45deg" }],
  },
  cornerTop: {
    top: -26,
    right: -22,
  },
  cornerBottom: {
    bottom: -28,
    left: -24,
  },
  coverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  eyebrow: {
    flex: 1,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  thumbnailEyebrow: {
    fontSize: 6,
    letterSpacing: 0.6,
  },
  seal: {
    minWidth: 34,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  thumbnailSeal: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  sealText: {
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 8,
    letterSpacing: 0.7,
  },
  thumbnailSealText: {
    fontSize: 6,
    letterSpacing: 0.2,
  },
  motifFrame: {
    width: 50,
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xs,
  },
  heroMotifFrame: {
    width: 78,
    height: 78,
    borderRadius: 26,
    marginTop: Spacing.lg,
  },
  thumbnailMotifFrame: {
    width: 38,
    height: 38,
    borderRadius: 14,
    marginVertical: 2,
  },
  diamond: {
    position: "absolute",
    width: "68%",
    height: "68%",
    borderWidth: 1,
    opacity: 0.42,
    transform: [{ rotate: "45deg" }],
  },
  titleBlock: {
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  title: {
    textAlign: "center",
    fontFamily: "LibreBaskerville_700Bold",
    lineHeight: 23,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 44,
    maxWidth: 330,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 18,
  },
  coverFooter: {
    gap: 6,
  },
  edition: {
    textAlign: "center",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 8,
    letterSpacing: 1,
  },
  thumbnailEdition: {
    fontSize: 5,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
});
