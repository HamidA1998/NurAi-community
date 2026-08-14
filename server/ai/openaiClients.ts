import OpenAI from "openai";
import { getAIConfig } from "./config";

let cloudClient: OpenAI | null = null;
let localClient: OpenAI | null = null;
const localPoolClients = new Map<string, OpenAI>();
let cloudFingerprint = "";
let localFingerprint = "";

export function getCloudOpenAIClient(): OpenAI {
  const config = getAIConfig();
  const nextFingerprint = `${config.cloudApiKey || ""}|${config.cloudBaseUrl || ""}`;
  if (!cloudClient || cloudFingerprint !== nextFingerprint) {
    cloudClient = new OpenAI({
      apiKey: config.cloudApiKey,
      baseURL: config.cloudBaseUrl,
    });
    cloudFingerprint = nextFingerprint;
  }
  return cloudClient;
}

export function getLocalOpenAICompatibleClient(options?: {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
}): OpenAI {
  const config = getAIConfig();
  const apiKey = options?.apiKey || config.localApiKey;
  const baseUrl = options?.baseUrl || config.localBaseUrl;
  const timeout = options?.timeoutMs || config.localTimeoutMs;
  const nextFingerprint = `${apiKey}|${baseUrl}|${timeout}`;

  if (options) {
    const pooledClient = localPoolClients.get(nextFingerprint);
    if (pooledClient) return pooledClient;
    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout,
    });
    localPoolClients.set(nextFingerprint, client);
    return client;
  }

  if (!localClient || localFingerprint !== nextFingerprint) {
    localClient = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout,
    });
    localFingerprint = nextFingerprint;
  }
  return localClient;
}
