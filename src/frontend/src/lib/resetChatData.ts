/**
 * resetChatData.ts
 *
 * Utility to wipe all local VOID chat data from localStorage, IndexedDB,
 * and (if the caller is founder) from the backend canister.
 *
 * Usage:
 *   import { resetAllChatData } from "../lib/resetChatData";
 *   await resetAllChatData(voidId);
 */

import { toast } from "sonner";

// ─── IndexedDB database names used by VOID ─────────────────────────────────

const VOID_IDB_NAMES = [
  "void-e2ee", // E2EE shared keys (from E2EEHelper.ts)
  "VOIDChats", // legacy name (PrivateChatCanister integration)
  "VoidChats", // alternate casing
  "void_chats", // snake_case variant
  "void-chats", // kebab variant
  "void-keys", // possible older key store
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Delete an IndexedDB database by name. Resolves silently if it doesn't exist. */
function deleteIDB(name: string): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve(); // DB may not exist — ignore
    req.onblocked = () => resolve(); // unblock and continue
  });
}

/** Returns true if founder mode is active for the given voidId. */
function isFounder(voidId: string | null | undefined): boolean {
  if (!voidId) return false;
  return localStorage.getItem(`void_founder_mode_${voidId}`) === "true";
}

type MaybeCanister = Record<string, unknown> | undefined;

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * resetAllChatData
 *
 * @param voidId  The caller's VOID ID (used for the founder check).
 *                Optional — omit for a local-only wipe.
 *
 * Steps:
 *   1. Clear all localStorage keys starting with "void_" or "chat_".
 *   2. Delete all known VOID-related IndexedDB databases.
 *   3. (Founder only) Call the canister's resetAllChatData() if available.
 *   4. Show a confirmation toast.
 */
export async function resetAllChatData(voidId?: string | null): Promise<void> {
  // 1. Clear localStorage keys matching void_* or chat_*
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("void_") || key.startsWith("chat_"))) {
        keysToRemove.push(key);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Blocked storage — fail silently
  }

  // 2. Delete all known IndexedDB databases in parallel
  await Promise.all(VOID_IDB_NAMES.map(deleteIDB));

  // 3. Founder-only: attempt canister reset if the actor exposes the method
  if (voidId && isFounder(voidId)) {
    try {
      // PrivateChatCanister.mo exposes resetAllChatData(), guarded by
      // founder principal. We check presence at runtime to avoid TS errors
      // since it lives outside the main backendInterface.
      const w = window as unknown as Record<string, unknown>;
      const canister = w.__privateChatActor as MaybeCanister;
      if (canister && typeof canister.resetAllChatData === "function") {
        await (canister.resetAllChatData as () => Promise<unknown>)();
      }
    } catch {
      // Non-fatal — local data is already cleared
    }
  }

  // 4. Confirm
  toast.success("All chat data cleared. Refresh page to start fresh.");
}
