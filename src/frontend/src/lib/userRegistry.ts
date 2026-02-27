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
export function registerKnownUser(voidId: string, cosmicHandle?: string): void {
  if (!voidId) return;
  try {
    const users = getAllKnownUsers();
    const existing = users.find((u) => u.voidId === voidId);
    if (existing) {
      // Update handle if provided and not already set
      if (cosmicHandle && !existing.cosmicHandle) {
        existing.cosmicHandle = cosmicHandle;
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
