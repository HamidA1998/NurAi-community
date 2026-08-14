import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

export type WalletPassPresentationResult = "added" | "cancelled";

type WalletPassNativeModule = {
  canAddPassesAsync(): Promise<boolean>;
  addPassAsync(fileUri: string): Promise<WalletPassPresentationResult>;
};

const native =
  requireOptionalNativeModule<WalletPassNativeModule>("WalletPass");

export async function canAddWalletPasses(): Promise<boolean> {
  if (Platform.OS !== "ios" || !native) return false;
  try {
    return await native.canAddPassesAsync();
  } catch {
    return false;
  }
}

export async function presentWalletPass(
  fileUri: string,
): Promise<WalletPassPresentationResult> {
  if (Platform.OS !== "ios" || !native) {
    throw new Error("Apple Wallet is not available on this device.");
  }
  return native.addPassAsync(fileUri);
}
