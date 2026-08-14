import { useWindowDimensions } from "react-native";

export type LayoutSize = "phone" | "tablet" | "desktop";

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  const layout: LayoutSize =
    width >= 1024 ? "desktop" : width >= 600 ? "tablet" : "phone";

  const columns = layout === "desktop" ? 3 : layout === "tablet" ? 2 : 1;

  const gridColumns = layout === "desktop" ? 6 : layout === "tablet" ? 5 : 4;

  const contentMaxWidth =
    layout === "desktop" ? 960 : layout === "tablet" ? 720 : undefined;

  return {
    layout,
    columns,
    gridColumns,
    contentMaxWidth,
    width,
    isPhone: layout === "phone",
    isTablet: layout === "tablet",
    isDesktop: layout === "desktop",
  };
}
