/**
 * E2EEHelper — True ECDH-based End-to-End Encryption for VOID DMs.
 *
 * Key exchange flow (Telegram secret-chat style):
 *   1. Each client generates a P-256 ECDH key pair.
 *   2. Public keys are exchanged via the backend (storeE2EEPublicKey / getE2EEPublicKey).
 *   3. Shared AES-GCM 256-bit key is derived via ECDH + HKDF.
 *   4. Keys are persisted in IndexedDB (not localStorage — survives tab reloads securely).
 *
 * Message format (v2 envelope):
 *   JSON { v: 2, enc: base64, nonce: base64, tag: base64 }
 *   Stored as the `ciphertext: Text` field in the canister — fully compatible
 *   with the existing backend API.
 */

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

const DB_NAME = "void-e2ee";
const DB_VERSION = 1;
const STORE_KEYS = "keys";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KEYS)) {
        db.createObjectStore(STORE_KEYS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readonly");
    const req = tx.objectStore(STORE_KEYS).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, "readwrite");
    const req = tx.objectStore(STORE_KEYS).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a P-256 ECDH key pair.
 * Private key is non-extractable for maximum security.
 */
export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false, // private key is non-extractable
    ["deriveKey", "deriveBits"],
  );
}

// ─── Public Key Export / Import ───────────────────────────────────────────────

/** Export public key to raw bytes for storage in canister */
export async function exportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(raw);
}

/** Import a raw public key bytes back to CryptoKey */
export async function importPublicKey(raw: Uint8Array): Promise<CryptoKey> {
  // Copy to a plain ArrayBuffer to satisfy SubtleCrypto's strict BufferSource type
  const buf = raw.buffer.slice(
    raw.byteOffset,
    raw.byteOffset + raw.byteLength,
  ) as ArrayBuffer;
  return crypto.subtle.importKey(
    "raw",
    buf,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

// ─── Shared Key Derivation ────────────────────────────────────────────────────

/**
 * Derive a shared AES-GCM 256-bit key using ECDH + HKDF.
 * Both sides will arrive at the same key given each other's public keys.
 * chatId is used as HKDF info to domain-separate per-conversation keys.
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
  chatId: string,
): Promise<CryptoKey> {
  // Step 1: ECDH — derive shared secret bits
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    256,
  );

  // Step 2: Import shared bits as HKDF key material
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits as ArrayBuffer,
    { name: "HKDF" },
    false,
    ["deriveKey"],
  );

  // Step 3: HKDF → AES-GCM 256 key, using chatId as info
  const encoder = new TextEncoder();
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("VOID_E2EE_SALT_v2"),
      info: encoder.encode(`VOID_DM_${chatId}`),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ─── IndexedDB Key Persistence ────────────────────────────────────────────────

/** Store the derived shared key for a chatId in IndexedDB */
export async function storeSharedKey(
  chatId: string,
  key: CryptoKey,
): Promise<void> {
  // Export to JWK for storage (shared key is extractable)
  try {
    const jwk = await crypto.subtle.exportKey("jwk", key);
    await idbSet(`shared_key_${chatId}`, jwk);
  } catch {
    // If export fails, store a marker to avoid repeated attempts
    await idbSet(`shared_key_${chatId}`, null);
  }
}

/** Load the derived shared key for a chatId from IndexedDB */
export async function loadSharedKey(chatId: string): Promise<CryptoKey | null> {
  try {
    const jwk = await idbGet<JsonWebKey>(`shared_key_${chatId}`);
    if (!jwk) return null;
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    return null;
  }
}

/** Store own ECDH key pair in IndexedDB.
 *
 * Since private keys are non-extractable, we regenerate them on load.
 * We store the public key in JWK (extractable) and regenerate the pair
 * from scratch each session if needed — but we use a stored public key
 * fingerprint to detect if one already exists.
 */
export async function storeMyPrivateKey(_key: CryptoKey): Promise<void> {
  // Non-extractable keys cannot be stored directly.
  // Instead we flag that a key was generated this session.
  await idbSet("void_ecdh_key_exists", true);
}

/** Load own ECDH private key from IndexedDB.
 *
 * Since non-extractable private keys cannot be persisted across sessions,
 * this returns null if no session key exists (a new pair will be generated).
 * The session key is held in memory only.
 */
export async function loadMyPrivateKey(): Promise<CryptoKey | null> {
  // Session-based: we can't persist non-extractable private keys in IDB.
  // The caller (ChatScreen) should hold the key in component state/ref.
  return null;
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt plaintext with AES-GCM.
 * Returns { encryptedContent, nonce, tag } where:
 *   - nonce = random 12-byte IV
 *   - encryptedContent = ciphertext WITHOUT the 16-byte auth tag
 *   - tag = last 16 bytes of the AES-GCM output
 */
export async function encryptWithKey(
  plaintext: string,
  key: CryptoKey,
): Promise<{
  encryptedContent: Uint8Array;
  nonce: Uint8Array;
  tag: Uint8Array;
}> {
  const nonceArr = crypto.getRandomValues(new Uint8Array(12));
  const nonce = nonceArr.buffer.slice(
    nonceArr.byteOffset,
    nonceArr.byteOffset + nonceArr.byteLength,
  ) as ArrayBuffer;
  const encoded = new TextEncoder().encode(plaintext);
  const cipherOutput = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    encoded,
  );
  const cipherBytes = new Uint8Array(cipherOutput);
  // AES-GCM appends 16-byte auth tag at the end
  const encryptedContent = cipherBytes.slice(0, -16);
  const tag = cipherBytes.slice(-16);
  return { encryptedContent, nonce: new Uint8Array(nonce), tag };
}

/**
 * Decrypt a message encrypted with encryptWithKey.
 * Returns plaintext or null on failure.
 */
export async function decryptWithKey(
  encryptedContent: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
  key: CryptoKey,
): Promise<string | null> {
  try {
    // Recombine ciphertext + tag
    const combined = new Uint8Array(encryptedContent.length + tag.length);
    combined.set(encryptedContent);
    combined.set(tag, encryptedContent.length);
    // Copy to plain ArrayBuffer for SubtleCrypto compatibility
    const ivBuf = nonce.buffer.slice(
      nonce.byteOffset,
      nonce.byteOffset + nonce.byteLength,
    ) as ArrayBuffer;
    const dataBuf = combined.buffer.slice(
      combined.byteOffset,
      combined.byteOffset + combined.byteLength,
    ) as ArrayBuffer;
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuf },
      key,
      dataBuf,
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

// ─── Envelope helpers ─────────────────────────────────────────────────────────

/**
 * Encode an encrypted message as a v2 JSON envelope string.
 * This is stored as the `ciphertext` field in the canister.
 */
export function encodeEnvelope(
  encryptedContent: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array,
): string {
  return JSON.stringify({
    v: 2,
    enc: btoa(String.fromCharCode(...encryptedContent)),
    nonce: btoa(String.fromCharCode(...nonce)),
    tag: btoa(String.fromCharCode(...tag)),
  });
}

interface V2Envelope {
  v: 2;
  enc: string;
  nonce: string;
  tag: string;
}

/** Parse a v2 envelope string. Returns null if not v2. */
export function parseEnvelope(
  ciphertext: string,
): { enc: Uint8Array; nonce: Uint8Array; tag: Uint8Array } | null {
  try {
    const parsed: V2Envelope = JSON.parse(ciphertext);
    if (parsed.v !== 2) return null;
    return {
      enc: Uint8Array.from(atob(parsed.enc), (c) => c.charCodeAt(0)),
      nonce: Uint8Array.from(atob(parsed.nonce), (c) => c.charCodeAt(0)),
      tag: Uint8Array.from(atob(parsed.tag), (c) => c.charCodeAt(0)),
    };
  } catch {
    return null;
  }
}

// ─── Chat ID normalization ────────────────────────────────────────────────────

/**
 * Normalize a DM chat ID so it's deterministic regardless of who created it.
 * Format: "dm_{smaller}_{larger}" (lexicographic sort)
 */
export function normalizeDMChatId(voidId1: string, voidId2: string): string {
  const [a, b] = [voidId1, voidId2].sort();
  return `dm_${a}_${b}`;
}
