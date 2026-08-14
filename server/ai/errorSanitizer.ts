const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\brpa_[A-Za-z0-9]{12,}\b/g,
  /\bAIza[A-Za-z0-9_-]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]+\b/gi,
];

export function sanitizeAIErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "AI provider error";

  let message = raw
    .replace(/api\.runpod\.ai\/v2\/[^/\s"']+/gi, "api.runpod.ai/v2/[redacted]")
    .replace(/https?:\/\/[^\s"')]+/gi, "[redacted-url]");

  for (const pattern of SECRET_PATTERNS) {
    message = message.replace(pattern, "[redacted-secret]");
  }

  message = message.replace(/\s+/g, " ").trim();
  return message.length > 220
    ? `${message.slice(0, 217).trim()}...`
    : message || "AI provider error";
}
