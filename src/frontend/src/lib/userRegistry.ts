/**
 * userRegistry.ts
 * Local localStorage registry for known VOID users encountered in messages.
 * Used for cosmic handle search in DM creation modal.
 */

const REGISTRY_KEY = "void_known_users";

export interface KnownUser {
  voidId: string;
  cosmicHandle: string | null;
}

/** Read the full registry from localStorage */
export function getAllKnownUsers(): KnownUser[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as KnownUser[];
  } catch {
    return [];
  }
}

/** Add or update a user in the local registry */
export function registerKnownUser(
  voidId: string,
  cosmicHandle?: string | null,
): void {
  if (!voidId) return;
  try {
    const users = getAllKnownUsers();
    const existing = users.find((u) => u.voidId === voidId);
    if (existing) {
      // Always update handle if a fresh value is provided
      if (
        cosmicHandle !== undefined &&
        cosmicHandle !== existing.cosmicHandle
      ) {
        existing.cosmicHandle = cosmicHandle ?? null;
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(users));
      }
    } else {
      users.push({ voidId, cosmicHandle: cosmicHandle ?? null });
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(users));
    }
  } catch {
    // localStorage may be unavailable in some contexts — fail silently
  }
}

/** Get cached handle for a voidId from local registry */
export function getCachedHandle(voidId: string): string | null {
  try {
    const users = getAllKnownUsers();
    return users.find((u) => u.voidId === voidId)?.cosmicHandle ?? null;
  } catch {
    return null;
  }
}

/**
 * Search known users by partial match on voidId or cosmicHandle (case-insensitive).
 * Returns up to 10 results.
 */
export function searchKnownUsers(query: string): KnownUser[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return getAllKnownUsers()
    .filter(
      (u) =>
        u.voidId.toLowerCase().includes(q) ||
        u.cosmicHandle?.toLowerCase().includes(q),
    )
    .slice(0, 10);
}
