import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { buildZipArchive } from "./pkpassZip";
import {
  loadWalletPassCredentials,
  signManifest,
  walletPassSigningConfigured,
} from "./pkpassSigning";

export { walletPassSigningConfigured };

export type PrayerCompanionPassInput = {
  prayerLabel: string;
  prayerTimeIso: string;
  locationLabel: string;
  serialNumber: string;
};

// Wallet requires dedicated pass-icon assets at these exact pixel sizes —
// separate from the app's own icon/splash assets. Configurable so the
// images can be swapped without a code change once real artwork exists.
const PASS_ASSET_DIR =
  process.env.APPLE_PASS_ASSET_DIR || join(process.cwd(), "assets/wallet-pass");
const REQUIRED_IMAGES = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "logo.png",
  "logo@2x.png",
  "logo@3x.png",
];

function buildPassJson(
  input: PrayerCompanionPassInput,
  credentials: { passTypeIdentifier: string; teamIdentifier: string },
  serialNumber: string,
) {
  return {
    formatVersion: 1,
    passTypeIdentifier: credentials.passTypeIdentifier,
    teamIdentifier: credentials.teamIdentifier,
    serialNumber,
    organizationName: "NurAI",
    description: `Next prayer: ${input.prayerLabel}`,
    logoText: "NurAI",
    backgroundColor: "rgb(11,17,20)",
    foregroundColor: "rgb(243,240,232)",
    labelColor: "rgb(184,194,189)",
    relevantDate: input.prayerTimeIso,
    generic: {
      primaryFields: [
        {
          key: "prayer",
          label: "NEXT PRAYER",
          value: input.prayerLabel,
        },
      ],
      secondaryFields: [
        {
          key: "time",
          label: "TIME",
          value: input.prayerTimeIso,
          dateStyle: "PKDateStyleShort",
          timeStyle: "PKDateStyleShort",
          isRelative: true,
        },
      ],
      auxiliaryFields: [
        {
          key: "location",
          label: "LOCATION",
          value: input.locationLabel,
        },
      ],
      backFields: [
        {
          key: "disclaimer",
          label: "About this pass",
          value:
            "Calculated on-device from your saved location and calculation method. Confirm against a local masjid if travelling.",
        },
      ],
    },
  };
}

async function loadPassImages(): Promise<Record<string, Buffer> | null> {
  try {
    const entries = await Promise.all(
      REQUIRED_IMAGES.map(async (name) => {
        const data = await readFile(join(PASS_ASSET_DIR, name));
        return [name, data] as const;
      }),
    );
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function sha1Hex(data: Buffer): string {
  return createHash("sha1").update(data).digest("hex");
}

/**
 * Builds a signed .pkpass for the next-prayer companion pass. Returns null
 * when signing credentials or pass image assets aren't configured — callers
 * should treat that as "feature not available yet", not an error, mirroring
 * the rest of the app's provider-unconfigured pattern.
 */
export async function buildPrayerCompanionPkpass(
  input: PrayerCompanionPassInput,
): Promise<Buffer | null> {
  const credentials = loadWalletPassCredentials();
  if (!credentials) return null;

  const images = await loadPassImages();
  if (!images) return null;

  const passJson = buildPassJson(input, credentials, input.serialNumber);
  const passJsonBuffer = Buffer.from(JSON.stringify(passJson), "utf8");

  const bundleFiles: Record<string, Buffer> = {
    "pass.json": passJsonBuffer,
    ...images,
  };

  const manifest: Record<string, string> = {};
  for (const [name, data] of Object.entries(bundleFiles)) {
    manifest[name] = sha1Hex(data);
  }
  const manifestBuffer = Buffer.from(JSON.stringify(manifest), "utf8");

  const signature = await signManifest(manifestBuffer, credentials);

  return buildZipArchive({
    ...bundleFiles,
    "manifest.json": manifestBuffer,
    signature,
  });
}
