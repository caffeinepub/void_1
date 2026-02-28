/**
 * useEncryption — manages the E2EE lifecycle for VOID.
 *
 * When a channelId is provided, uses a shared channel key derived from the
 * channel ID (deterministic) so all participants can read each other's messages.
 *
 * Falls back to a per-user key when no channelId is given (legacy support).
 */
import { useCallback, useEffect, useState } from "react";
import {
  decryptBytes,
  decryptMessage,
  encryptBytes,
  encryptMessage,
  getChannelKey,
  loadOrCreateKey,
} from "../lib/crypto";

export function useEncryption(channelId?: string) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(false);
    const loadKey = channelId ? getChannelKey(channelId) : loadOrCreateKey();

    loadKey
      .then((k) => {
        setKey(k);
        setIsReady(true);
      })
      .catch(() => {
        // Fallback to per-user key if channel key derivation fails
        loadOrCreateKey().then((k) => {
          setKey(k);
          setIsReady(true);
        });
      });
  }, [channelId]);

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
