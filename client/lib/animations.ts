import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
} from "react-native-reanimated";

export const fadeSlideUp = FadeInUp.duration(200).springify().damping(18);

export const fadeSlideDown = FadeInDown.duration(200).springify().damping(18);

export const fadeIn = FadeIn.duration(200);

export const staggerDelay = (index: number, base: number = 50) => base * index;

export const createStaggeredFadeIn = (index: number) =>
  FadeInUp.duration(250).delay(staggerDelay(index)).springify().damping(18);

export const modalSlideIn = SlideInDown.duration(300).springify().damping(18);

export const pressScale = { pressed: 0.97, default: 1 };
