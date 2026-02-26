/**
 * useCustomAvatar.ts
 * Reads/writes a custom avatar (base64 image) per VOID ID from localStorage.
 * Key: void_avatar_{voidId}
 */
import { useState, useCallback } from 'react';

export function useCustomAvatar(voidId: string | null) {
  const storageKey = voidId ? `void_avatar_${voidId}` : null;

  const [avatarUrl, setAvatarUrlState] = useState<string | null>(() => {
    if (!storageKey) return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });

  const setAvatar = useCallback(
    (base64: string) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, base64);
        setAvatarUrlState(base64);
      } catch {
        // localStorage quota exceeded — fail silently
      }
    },
    [storageKey]
  );

  const clearAvatar = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      setAvatarUrlState(null);
    } catch {
      // fail silently
    }
  }, [storageKey]);

  return { avatarUrl, setAvatar, clearAvatar };
}
