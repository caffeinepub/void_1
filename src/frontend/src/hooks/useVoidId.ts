/**
 * useVoidId — generates a deterministic anonymous Matrix-style VOID ID
 * from the Internet Identity principal.
 * Format: @void_shadow_<8-char-hash>:canister
 */
import { useMemo } from "react";
import { useInternetIdentity } from "./useInternetIdentity";

function hashPrincipal(principal: string): string {
  // Simple deterministic hash using charCode arithmetic
  let hash = 0;
  for (let i = 0; i < principal.length; i++) {
    const char = principal.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string, padded to 8 chars
  const hex = Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
  return hex;
}

export function useVoidId(): string | null {
  const { identity } = useInternetIdentity();

  return useMemo(() => {
    if (!identity) return null;
    const principal = identity.getPrincipal().toString();
    const hash = hashPrincipal(principal);
    return `@void_shadow_${hash}:canister`;
  }, [identity]);
}

export function generateVoidIdFromPrincipal(principal: string): string {
  function hashStr(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
  }
  return `@void_shadow_${hashStr(principal)}:canister`;
}
