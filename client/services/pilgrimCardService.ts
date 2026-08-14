import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "nurai_pilgrim_card_v1";

export type PilgrimCard = {
  hotelName: string;
  hotelAddress: string;
  groupLeaderName: string;
  groupLeaderPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  meetingPoint: string;
  medicalNotes: string;
  updatedAt?: string;
};

export const EMPTY_PILGRIM_CARD: PilgrimCard = {
  hotelName: "",
  hotelAddress: "",
  groupLeaderName: "",
  groupLeaderPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  meetingPoint: "",
  medicalNotes: "",
};

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function hasPilgrimCardDetails(card: PilgrimCard) {
  return [
    card.hotelName,
    card.hotelAddress,
    card.groupLeaderName,
    card.groupLeaderPhone,
    card.emergencyContactName,
    card.emergencyContactPhone,
    card.meetingPoint,
    card.medicalNotes,
  ].some((value) => value.trim().length > 0);
}

export function sanitizePilgrimCard(value: unknown): PilgrimCard {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...EMPTY_PILGRIM_CARD };
  }

  const object = value as Partial<Record<keyof PilgrimCard, unknown>>;
  return {
    hotelName: normalize(object.hotelName),
    hotelAddress: normalize(object.hotelAddress),
    groupLeaderName: normalize(object.groupLeaderName),
    groupLeaderPhone: normalize(object.groupLeaderPhone),
    emergencyContactName: normalize(object.emergencyContactName),
    emergencyContactPhone: normalize(object.emergencyContactPhone),
    meetingPoint: normalize(object.meetingPoint),
    medicalNotes: normalize(object.medicalNotes),
    updatedAt: normalize(object.updatedAt) || undefined,
  };
}

export function formatPilgrimCardForShare(card: PilgrimCard) {
  const sanitized = sanitizePilgrimCard(card);
  const rows = [
    ["Hotel", sanitized.hotelName],
    ["Address", sanitized.hotelAddress],
    ["Group leader", sanitized.groupLeaderName],
    ["Group phone", sanitized.groupLeaderPhone],
    ["Emergency contact", sanitized.emergencyContactName],
    ["Emergency phone", sanitized.emergencyContactPhone],
    ["Meeting point", sanitized.meetingPoint],
    ["Medication/access notes", sanitized.medicalNotes],
  ].filter(([, value]) => value.trim().length > 0);

  if (rows.length === 0) return "";

  return [
    "NurAI offline pilgrim card",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Use official documents, local emergency services, clinicians, and Saudi official services for urgent or personal decisions.",
  ].join("\n");
}

async function getItem(key: string) {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function removeItem(key: string) {
  if (Platform.OS === "web") return AsyncStorage.removeItem(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    await AsyncStorage.removeItem(key);
  }
}

export async function loadPilgrimCard() {
  const raw = await getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_PILGRIM_CARD };
  try {
    return sanitizePilgrimCard(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PILGRIM_CARD };
  }
}

export async function savePilgrimCard(card: PilgrimCard) {
  const sanitized = sanitizePilgrimCard({
    ...card,
    updatedAt: new Date().toISOString(),
  });
  if (!hasPilgrimCardDetails(sanitized)) {
    await removeItem(STORAGE_KEY);
    return { ...EMPTY_PILGRIM_CARD };
  }
  await setItem(STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export async function clearPilgrimCard() {
  await removeItem(STORAGE_KEY);
  return { ...EMPTY_PILGRIM_CARD };
}
