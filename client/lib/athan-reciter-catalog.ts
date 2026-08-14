import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";

export type AthanVoicePlan = "free" | "premium" | "scholar";

export type AthanVoice = {
  id: string;
  name: string;
  description: string;
  durationSeconds: number;
  minimumPlan: AthanVoicePlan;
  soundName: string;
  assetModule: number;
  creator: string;
  licenceLabel: string;
  licenceUrl: string;
  sourceUrl: string;
};

export const ATHAN_VOICE_STORAGE_KEY = "athan_voice_id_v1";

export const ATHAN_VOICES: readonly AthanVoice[] = [
  {
    id: "nurai-classic",
    name: "NurAI Classic",
    description: "A warm, unhurried call with a spacious finish.",
    durationSeconds: 154,
    minimumPlan: "free",
    soundName: "athan-classic-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-classic-full.caf"),
    creator: "Adam-synagda",
    licenceLabel: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg",
  },
  {
    id: "clear-call",
    name: "Clear Call",
    description: "A concise, close and beautifully articulated Athan.",
    durationSeconds: 87,
    minimumPlan: "free",
    soundName: "athan-clear-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-clear-full.caf"),
    creator: "Aaqib Azeez / Atcovi",
    licenceLabel: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3",
  },
  {
    id: "open-call",
    name: "Open Call",
    description: "A direct community-recorded call with a clear, open cadence.",
    durationSeconds: 65,
    minimumPlan: "premium",
    soundName: "athan-open-call-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-open-call-full.caf"),
    creator: "Isaacayodele32",
    licenceLabel: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Call_to_prayer.ogg",
  },
  {
    id: "marylebone-call",
    name: "Marylebone Call",
    description:
      "A clear, close mosque call captured at London’s Marylebone Mosque.",
    durationSeconds: 136,
    minimumPlan: "premium",
    soundName: "athan-marylebone-call-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-marylebone-call-full.caf"),
    creator: "Emanuele_Correani",
    licenceLabel: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: "https://freesound.org/people/Emanuele_Correani/sounds/459704/",
  },
  {
    id: "traditional-call",
    name: "Traditional Call",
    description: "A measured traditional voice with a gentle cadence.",
    durationSeconds: 183,
    minimumPlan: "premium",
    soundName: "athan-traditional-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-traditional-full.caf"),
    creator: "Andrewler",
    licenceLabel: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Azan.ogg",
  },
  {
    id: "heritage-call",
    name: "Heritage Call",
    description: "A resonant, extended call for a slower listening moment.",
    durationSeconds: 210,
    minimumPlan: "scholar",
    soundName: "athan-heritage-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-heritage-full.caf"),
    creator: "Mahfoudou",
    licenceLabel: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Islamic_call_to_worship.oga",
  },
  {
    id: "casablanca-call",
    name: "Casablanca Call",
    description: "A spacious mosque recording with a clear Moroccan cadence.",
    durationSeconds: 176,
    minimumPlan: "premium",
    soundName: "athan-casablanca-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-casablanca-full.caf"),
    creator: "Fraguando",
    licenceLabel: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Llamada_a_oraci%C3%B3n_Mezquita_Hassan_II.wav",
  },
  {
    id: "levantine-heritage",
    name: "Levantine Heritage",
    description: "A historic, expressive call with a long and measured form.",
    durationSeconds: 158,
    minimumPlan: "scholar",
    soundName: "athan-levantine-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-levantine-full.caf"),
    creator: "Sabah Fakhri",
    licenceLabel: "Public domain",
    licenceUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Call_to_prayer_by_Sabah_Fakhry.mp3",
  },
  {
    id: "shalqar-mosque",
    name: "Shalqar Mosque",
    description:
      "A clear mosque call recorded in Shalqar, Kazakhstan, with natural room depth.",
    durationSeconds: 155,
    minimumPlan: "premium",
    soundName: "athan-shalqar-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-shalqar-full.caf"),
    creator: "Esetok · Matey Qoqanuly mosque",
    licenceLabel: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Adhan_in_Shalqar_mosque.webm",
  },
  {
    id: "mosque-archive",
    name: "Mosque Archive",
    description:
      "A full, resonant archival mosque call with a measured traditional pace.",
    durationSeconds: 187,
    minimumPlan: "scholar",
    soundName: "athan-mosque-archive-full.caf",
    assetModule: require("../../assets/audio/notifications/athan-mosque-archive-full.caf"),
    creator: "ejaz215",
    licenceLabel: "CC BY 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by/3.0/",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg",
  },
] as const;

const PLAN_RANK: Record<AthanVoicePlan, number> = {
  free: 0,
  premium: 1,
  scholar: 2,
};

export function canUseAthanVoice(
  voice: AthanVoice,
  currentPlan: AthanVoicePlan,
): boolean {
  return PLAN_RANK[currentPlan] >= PLAN_RANK[voice.minimumPlan];
}

export function athanVoiceById(id: string | null | undefined): AthanVoice {
  return ATHAN_VOICES.find((voice) => voice.id === id) ?? ATHAN_VOICES[0];
}

export async function getSavedAthanVoice(): Promise<AthanVoice> {
  try {
    return athanVoiceById(await AsyncStorage.getItem(ATHAN_VOICE_STORAGE_KEY));
  } catch {
    return ATHAN_VOICES[0];
  }
}

export async function saveAthanVoice(id: string): Promise<AthanVoice> {
  const voice = athanVoiceById(id);
  await AsyncStorage.setItem(ATHAN_VOICE_STORAGE_KEY, voice.id);
  return voice;
}

export async function getUsableAthanVoice(
  currentPlan: AthanVoicePlan,
): Promise<AthanVoice> {
  const selected = await getSavedAthanVoice();
  return canUseAthanVoice(selected, currentPlan) ? selected : ATHAN_VOICES[0];
}

export async function athanVoicePreviewUri(voice: AthanVoice): Promise<string> {
  const asset = Asset.fromModule(voice.assetModule);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  return asset.localUri ?? asset.uri;
}

export function formatAthanDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}
