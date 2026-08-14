import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiRequest } from "@/lib/query-client";
import type {
  ScholarAskResponse,
  ScholarJurisdiction,
  ScholarMadhhab,
  ScholarQuestionInput,
} from "@shared/scholar";

const REQUEST_TIMEOUT = 45000;

async function loadMadhhab(): Promise<ScholarMadhhab> {
  try {
    const globalMadhab = await AsyncStorage.getItem("nurai_global_madhab");
    if (globalMadhab) return globalMadhab as ScholarMadhhab;
    const whMadhab = await AsyncStorage.getItem("womens_health_madhab");
    if (whMadhab) return whMadhab as ScholarMadhhab;
  } catch {}
  return "general";
}

async function loadRevertStatus(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem("nurai_revert_status");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.isRevert);
  } catch {
    return false;
  }
}

export async function askScholarAgent(
  input: Pick<ScholarQuestionInput, "question"> &
    Partial<Omit<ScholarQuestionInput, "question">> & {
      userTier?: "free" | "premium" | "scholar";
    },
): Promise<ScholarAskResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const [storedMadhhab, storedRevert] = await Promise.all([
      loadMadhhab(),
      loadRevertStatus(),
    ]);
    const payload = {
      question: input.question,
      madhhab: input.madhhab ?? storedMadhhab,
      jurisdiction:
        (input.jurisdiction as ScholarJurisdiction | undefined) ?? "GLOBAL",
      userLevel: input.userLevel ?? "beginner",
      isRevert: input.isRevert ?? storedRevert,
      userTier: input.userTier,
    };
    const res = await apiRequest("POST", "/api/scholar/ask", payload, {
      signal: controller.signal,
    });
    return (await res.json()) as ScholarAskResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getScholarFilters(): Promise<{
  madhhabs: ScholarMadhhab[];
  jurisdictions: ScholarJurisdiction[];
}> {
  const res = await apiRequest("GET", "/api/scholar/filters");
  return await res.json();
}
