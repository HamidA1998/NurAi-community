import AsyncStorage from "@react-native-async-storage/async-storage";

export const HOME_AI_CONTEXT_MESSAGES_KEY = "nurai_home_ai_context_messages_v1";
export const HOME_AI_CONTEXT_LAST_PRESENTED_KEY =
  "nurai_home_ai_context_last_presented_v1";

export type SavedHomeAIContextMessage = {
  id: string;
  category: string;
  headline: string;
  message: string;
  contextLabel: string;
  personalisationSource: string;
  askPrompt: string;
  savedAt: string;
};

function cleanText(value: unknown, maximum: number): string {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maximum)
    : "";
}

function normalizeSavedMessage(
  value: unknown,
): SavedHomeAIContextMessage | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SavedHomeAIContextMessage>;
  const id = cleanText(candidate.id, 120);
  const message = cleanText(candidate.message, 600);
  if (!id || !message) return null;
  return {
    id,
    category: cleanText(candidate.category, 80) || "daily_plan",
    headline: cleanText(candidate.headline, 180),
    message,
    contextLabel: cleanText(candidate.contextLabel, 80) || "Saved guidance",
    personalisationSource:
      cleanText(candidate.personalisationSource, 80) || "v3_on_device",
    askPrompt: cleanText(candidate.askPrompt, 1_200),
    savedAt: cleanText(candidate.savedAt, 40) || new Date(0).toISOString(),
  };
}

export async function loadSavedHomeAIContextMessages(): Promise<
  SavedHomeAIContextMessage[]
> {
  try {
    const raw = await AsyncStorage.getItem(HOME_AI_CONTEXT_MESSAGES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSavedMessage)
      .filter((item): item is SavedHomeAIContextMessage => Boolean(item))
      .slice(0, 40);
  } catch {
    return [];
  }
}

export async function isHomeAIContextMessageSaved(
  id: string,
): Promise<boolean> {
  const messages = await loadSavedHomeAIContextMessages();
  return messages.some((message) => message.id === id);
}

export async function saveHomeAIContextMessage(
  message: Omit<SavedHomeAIContextMessage, "savedAt"> & { savedAt?: string },
): Promise<SavedHomeAIContextMessage[]> {
  const normalized = normalizeSavedMessage({
    ...message,
    savedAt: message.savedAt || new Date().toISOString(),
  });
  if (!normalized) return loadSavedHomeAIContextMessages();
  const current = await loadSavedHomeAIContextMessages();
  const next = [
    normalized,
    ...current.filter((item) => item.id !== normalized.id),
  ].slice(0, 40);
  await AsyncStorage.setItem(
    HOME_AI_CONTEXT_MESSAGES_KEY,
    JSON.stringify(next),
  );
  return next;
}

export async function removeSavedHomeAIContextMessage(
  id: string,
): Promise<SavedHomeAIContextMessage[]> {
  const current = await loadSavedHomeAIContextMessages();
  const next = current.filter((item) => item.id !== id);
  await AsyncStorage.setItem(
    HOME_AI_CONTEXT_MESSAGES_KEY,
    JSON.stringify(next),
  );
  return next;
}

export async function loadLastPresentedHomeAIContextMessageId(): Promise<
  string | null
> {
  try {
    const value = await AsyncStorage.getItem(
      HOME_AI_CONTEXT_LAST_PRESENTED_KEY,
    );
    return cleanText(value, 120) || null;
  } catch {
    return null;
  }
}

export async function markHomeAIContextMessagePresented(
  id: string,
): Promise<void> {
  const cleanId = cleanText(id, 120);
  if (!cleanId) return;
  await AsyncStorage.setItem(HOME_AI_CONTEXT_LAST_PRESENTED_KEY, cleanId);
}
