const crypto = require("node:crypto");

function commandSignature(command) {
  let rest = String(command || "")
    .trim()
    .replace(/\s+/g, " ");
  const envAssignments = [];

  while (rest) {
    const match = rest.match(
      /^([A-Z][A-Z0-9_]*)=(?:"[^"]*"|'[^']*'|[^\s]+)\s*/,
    );
    if (!match) break;
    envAssignments.push(`${match[1]}=...`);
    rest = rest.slice(match[0].length).trimStart();
  }

  return [...envAssignments, rest].filter(Boolean).join(" ");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function containsSecretLikeText(value) {
  const text = JSON.stringify(value || "");
  return [
    /sk-[A-Za-z0-9_-]{12,}/,
    /rpa_[A-Za-z0-9_-]{12,}/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /"private_key"\s*:/i,
    /RUNPOD_SECRET/i,
    /NURAI_DEPLOYED_AI_SMOKE_SECRET=(?!\.\.\.)[^\s"]+/i,
  ].some((pattern) => pattern.test(text));
}

module.exports = {
  commandSignature,
  containsSecretLikeText,
  sha256,
  stableJson,
};
