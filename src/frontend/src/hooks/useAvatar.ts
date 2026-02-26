import { useMemo } from 'react';
import { getCachedAvatar } from '../lib/avatarGenerator';

export function useAvatar(voidId: string): string {
  return useMemo(() => {
    if (!voidId) return '';
    return getCachedAvatar(voidId);
  }, [voidId]);
}
