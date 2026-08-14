import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";
import { NuraiType } from "./tokens";

// A premium single-series trend chart for the Health / progress surfaces.
// Design-viz rules: one hue (the accent), a soft area fill, a thin 2px line, a
// recessive baseline, and an emphasized endpoint dot — no rainbow, no busy grid.
// Renders crisply at any width (viewBox scales), degrades gracefully on empty
// or flat data.

const VIEW_W = 300;

function buildPaths(data: number[], height: number) {
  const n = data.length;
  const padX = 6;
  const padY = 10;
  const w = VIEW_W - padX * 2;
  const h = height - padY * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const points = data.map((v, i) => {
    const x = n === 1 ? VIEW_W / 2 : padX + (i / (n - 1)) * w;
    const y = padY + (1 - (v - min) / span) * h;
    return { x, y };
  });

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const baseline = height - padY;
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${baseline} L${points[0].x.toFixed(1)},${baseline} Z`;

  return { line, area, points, baseline };
}

export function NuraiTrendChart({
  data,
  labels,
  height = 96,
  accent,
  unit,
  goal,
  emptyLabel = "No data yet — sync to fill this trend.",
}: {
  data: number[];
  labels?: string[];
  height?: number;
  accent?: string;
  unit?: string;
  goal?: number;
  emptyLabel?: string;
}) {
  const { theme } = useTheme();
  const color = accent ?? theme.primary;
  const clean = data.filter((v) => Number.isFinite(v));
  const hasData = clean.length > 0 && Math.max(...clean) > 0;

  const geo = useMemo(
    () => (hasData ? buildPaths(clean, height) : null),
    [clean, height, hasData],
  );

  if (!geo) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text
          style={[
            NuraiType.caption,
            { color: theme.textMuted, textAlign: "center" },
          ]}
        >
          {emptyLabel}
        </Text>
      </View>
    );
  }

  const gid = `trend-${color.replace(/[^a-z0-9]/gi, "")}`;
  const last = geo.points[geo.points.length - 1];
  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const span = max - min || 1;
  const goalY =
    goal != null
      ? 10 +
        (1 - (Math.min(Math.max(goal, min), max) - min) / span) * (height - 20)
      : null;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_W} ${height}`}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* recessive baseline */}
        <Line
          x1={6}
          y1={geo.baseline}
          x2={VIEW_W - 6}
          y2={geo.baseline}
          stroke={theme.borderSubtle}
          strokeWidth={1}
        />

        {/* optional goal line */}
        {goalY != null ? (
          <Line
            x1={6}
            y1={goalY}
            x2={VIEW_W - 6}
            y2={goalY}
            stroke={theme.scholar}
            strokeOpacity={0.5}
            strokeWidth={1}
            strokeDasharray="3 4"
          />
        ) : null}

        {/* area + line */}
        <Path d={geo.area} fill={`url(#${gid})`} />
        <Path
          d={geo.line}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* emphasized endpoint */}
        <Circle
          cx={last.x}
          cy={last.y}
          r={5.5}
          fill={color}
          fillOpacity={0.18}
        />
        <Circle cx={last.x} cy={last.y} r={3} fill={color} />

        {/* peak value label */}
        <SvgText
          x={VIEW_W - 6}
          y={14}
          fill={theme.textMuted}
          fontSize={10}
          textAnchor="end"
        >
          {unit ? `${Math.round(max)} ${unit}` : `${Math.round(max)}`}
        </SvgText>
      </Svg>

      {labels && labels.length > 0 ? (
        <View style={styles.labels}>
          {labels.map((l, i) => (
            <Text
              key={`${l}-${i}`}
              style={[
                NuraiType.caption,
                styles.label,
                { color: theme.textMuted },
              ]}
            >
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: 4,
  },
  label: { fontSize: 10 },
});
