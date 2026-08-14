import { ScrollView, ScrollViewProps } from "react-native";

type Props = ScrollViewProps;

/**
 * ScrollView wrapper for input screens.
 * Native keyboard avoidance is handled at screen/modal level.
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  return (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
