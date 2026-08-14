import * as ImagePicker from "expo-image-picker";

export type FoodScanIngredient = {
  name: string;
  estimatedAmount?: string;
  caloriesKcal?: number;
  confidence: "low" | "medium" | "high";
};

export type FoodScanResult = {
  dishName: string;
  cuisineGuess?: string;
  caloriesKcal: {
    min: number;
    max: number;
    midpoint: number;
  };
  macros?: {
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    fibreG?: number;
  };
  ingredients: FoodScanIngredient[];
  halalNotes: string[];
  healthNotes: string[];
  confidence: "low" | "medium" | "high";
  uncertaintyNotes: string[];
  safetyNote: string;
};

type FoodImageSource = "camera" | "library";

async function pickFoodImage(source: FoodImageSource) {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === "camera"
        ? "Camera permission is needed to scan a meal."
        : "Photo permission is needed to choose a meal image.",
    );
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          base64: true,
          exif: false,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.72,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          base64: true,
          exif: false,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.72,
        });

  if (result.canceled || !result.assets?.[0]?.base64) return null;
  return result.assets[0];
}

export async function scanMealFromImageSource(
  source: FoodImageSource,
  userNote?: string,
): Promise<FoodScanResult | null> {
  const image = await pickFoodImage(source);
  if (!image) return null;
  void userNote;

  throw new Error(
    "Meal photo intelligence is disabled while NurAI intelligence is rebuilt.",
  );
}

export const scanMealWithCamera = (userNote?: string) =>
  scanMealFromImageSource("camera", userNote);

export const scanMealFromLibrary = (userNote?: string) =>
  scanMealFromImageSource("library", userNote);
