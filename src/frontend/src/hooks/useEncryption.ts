/**
 * useEncryption — manages the E2EE lifecycle for VOID.
 * Loads or creates the user's AES-GCM key on mount.
 */
import { useCallback, useEffect, useState } from "react";
import {
  decryptBytes,
  decryptMessage,
  encryptBytes,
  encryptMessage,
  loadOrCreateKey,
} from "../lib/crypto";

export function useEncryption() {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadOrCreateKey().then((k) => {
      setKey(k);
      setIsReady(true);
    });
  }, []);

  const encryptForSend = useCallback(
    async (plaintext: string): Promise<string> => {
      if (!key) throw new Error("Encryption key not ready");
      return encryptMessage(plaintext, key);
    },
    [key],
  );

  const decryptReceived = useCallback(
    async (ciphertext: string): Promise<string | null> => {
      if (!key) return null;
      return decryptMessage(ciphertext, key);
    },
    [key],
  );

  const encryptFile = useCallback(
    async (bytes: Uint8Array): Promise<string> => {
      if (!key) throw new Error("Encryption key not ready");
      return encryptBytes(bytes, key);
    },
    [key],
  );

  const decryptFile = useCallback(
    async (ciphertext: string): Promise<Uint8Array | null> => {
      if (!key) return null;
      return decryptBytes(ciphertext, key);
    },
    [key],
  );

  return { isReady, encryptForSend, decryptReceived, encryptFile, decryptFile };
}
