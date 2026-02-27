/**
 * VOID E2EE — Client-side encryption using Web Crypto API (AES-GCM)
 * Keys are stored in localStorage. The canister only ever sees ciphertext.
 */

const KEY_STORAGE_KEY = "void_e2ee_key";

// ─── Key Management ───────────────────────────────────────────────────────────

/** Generate a new AES-GCM 256-bit key */
async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Export a CryptoKey to base64 string for storage */
async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Import a base64 string back to CryptoKey */
async function importKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/** Load or generate the user's symmetric key from localStorage */
export async function loadOrCreateKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (stored) {
    try {
      return await importKey(stored);
    } catch {
      // Corrupted key — regenerate
    }
  }
  const key = await generateKey();
  const exported = await exportKey(key);
  localStorage.setItem(KEY_STORAGE_KEY, exported);
  return key;
}

/** Get the stored public key fingerprint (first 8 chars of base64 key) for display */
export function getKeyFingerprint(): string {
  const stored = localStorage.getItem(KEY_STORAGE_KEY);
  if (!stored) return "none";
  return `${stored.slice(0, 8)}...`;
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-GCM.
 * Returns a base64 string: base64(iv + ciphertext)
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64 ciphertext string produced by encryptMessage.
 * Returns plaintext or null on failure.
 */
export async function decryptMessage(
  ciphertext: string,
  key: CryptoKey,
): Promise<string | null> {
  try {
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

/** Encrypt binary file data, returns base64 string */
export async function encryptBytes(
  bytes: Uint8Array,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  // Create a guaranteed plain ArrayBuffer copy to satisfy SubtleCrypto's BufferSource type
  const plainArrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(plainArrayBuffer).set(bytes);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plainArrayBuffer,
  );
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt binary file data from base64 string */
export async function decryptBytes(
  ciphertext: string,
  key: CryptoKey,
): Promise<Uint8Array | null> {
  try {
    const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    return new Uint8Array(plainBuf);
  } catch {
    return null;
  }
}
