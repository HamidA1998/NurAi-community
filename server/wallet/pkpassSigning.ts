import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WalletPassCredentials = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signingCertPem: string;
  signingKeyPem: string;
  wwdrCertPem: string;
};

function normalizePem(value: string | undefined): string | null {
  if (!value) return null;
  // Railway/most host env-var UIs collapse real newlines in a pasted PEM
  // block into literal "\n" — restore them so OpenSSL can parse the file.
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

export function loadWalletPassCredentials(): WalletPassCredentials | null {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_IDENTIFIER?.trim();
  const teamIdentifier = process.env.APPLE_TEAM_IDENTIFIER?.trim();
  const signingCertPem = normalizePem(process.env.APPLE_PASS_SIGNING_CERT_PEM);
  const signingKeyPem = normalizePem(process.env.APPLE_PASS_SIGNING_KEY_PEM);
  const wwdrCertPem = normalizePem(process.env.APPLE_WWDR_CERT_PEM);

  if (
    !passTypeIdentifier ||
    !teamIdentifier ||
    !signingCertPem ||
    !signingKeyPem ||
    !wwdrCertPem
  ) {
    return null;
  }

  return {
    passTypeIdentifier,
    teamIdentifier,
    signingCertPem,
    signingKeyPem,
    wwdrCertPem,
  };
}

export function walletPassSigningConfigured(): boolean {
  return loadWalletPassCredentials() !== null;
}

/**
 * Produces the DER-encoded PKCS#7 detached signature Wallet requires as the
 * bundle's `signature` file, over the exact bytes of `manifest.json`. Shells
 * out to the system `openssl smime` command rather than a pure-JS PKCS#7
 * implementation — CMS/PKCS#7 signing has enough format subtlety that the
 * battle-tested system OpenSSL binary is the safer choice for output Wallet
 * will actually accept, at the cost of requiring `openssl` on the host
 * (present on effectively every Linux Node deploy image).
 */
export async function signManifest(
  manifestBytes: Buffer,
  credentials: WalletPassCredentials,
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "nurai-pkpass-"));
  try {
    const manifestPath = join(dir, "manifest.json");
    const certPath = join(dir, "signerCert.pem");
    const keyPath = join(dir, "signerKey.pem");
    const wwdrPath = join(dir, "wwdr.pem");
    const signaturePath = join(dir, "signature");

    await Promise.all([
      writeFile(manifestPath, manifestBytes),
      writeFile(certPath, credentials.signingCertPem),
      writeFile(keyPath, credentials.signingKeyPem),
      writeFile(wwdrPath, credentials.wwdrCertPem),
    ]);

    // Deliberately omit -nodetach: Wallet expects a detached PKCS#7
    // signature (the manifest content is NOT embedded in the `signature`
    // file — it's verified against the separate manifest.json already in
    // the bundle). -nodetach would embed the content and produce a
    // signature Wallet rejects.
    await execFileAsync("openssl", [
      "smime",
      "-binary",
      "-sign",
      "-certfile",
      wwdrPath,
      "-signer",
      certPath,
      "-inkey",
      keyPath,
      "-in",
      manifestPath,
      "-out",
      signaturePath,
      "-outform",
      "DER",
    ]);

    return await readFile(signaturePath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
