import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { type UserProfile, type Message, MessageType } from '../backend';

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useSetCosmicHandle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ voidId, handle }: { voidId: string; handle: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setCosmicHandle(voidId, handle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function useGetMessages(channel: string, enabled = true) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Message[]>({
    queryKey: ['messages', channel],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMessages(channel, BigInt(50));
    },
    enabled: !!actor && !actorFetching && enabled,
    refetchInterval: 2500, // 2.5s polling
    staleTime: 0,
  });
}

export function useLoadOlderMessages() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      channel,
      start,
      count,
    }: {
      channel: string;
      start: number;
      count: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.loadOlderMessages(channel, BigInt(start), BigInt(count));
    },
  });
}

export function usePostMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel,
      ciphertext,
      senderVoidId,
      messageType,
      replyTo,
      blobId,
    }: {
      channel: string;
      ciphertext: string;
      senderVoidId: string;
      messageType: MessageType;
      replyTo?: string;
      blobId?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.postMessage(
        channel,
        ciphertext,
        senderVoidId,
        messageType,
        replyTo ?? null,
        blobId ?? null
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channel] });
    },
  });
}

// ─── DMs ─────────────────────────────────────────────────────────────────────

export function useGetSortedDMs() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ['sortedDMs'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSortedDMs();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
  });
}

export function useCreateDM() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ voidId1, voidId2 }: { voidId1: string; voidId2: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createDM(voidId1, voidId2);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sortedDMs'] });
    },
  });
}

export function useGetCosmicHandle(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['cosmicHandle', voidId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCosmicHandle(voidId);
    },
    enabled: !!actor && !actorFetching && !!voidId,
    staleTime: 60_000,
  });
}

// ─── Keywords & Upvotes ───────────────────────────────────────────────────────

/** Post a message with keyword tags to a channel */
export function usePostMessageWithKeywords() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel,
      ciphertext,
      senderVoidId,
      messageType,
      replyTo,
      blobId,
      keywords,
    }: {
      channel: string;
      ciphertext: string;
      senderVoidId: string;
      messageType: MessageType;
      replyTo?: string;
      blobId?: string;
      keywords: string[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.postMessageWithKeywords(
        channel,
        ciphertext,
        senderVoidId,
        messageType,
        replyTo ?? null,
        blobId ?? null,
        keywords
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channel] });
    },
  });
}

/** Upvote a message in a channel */
export function useUpvoteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channel,
      messageId,
    }: {
      channel: string;
      messageId: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.upvoteMessage(channel, messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.channel] });
    },
  });
}

/** Get a user's total Wisdom Score (sum of upvotes received) */
export function useGetWisdomScore(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['wisdomScore', voidId],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getWisdomScore(voidId);
    },
    enabled: !!actor && !actorFetching && !!voidId,
    staleTime: 30_000,
  });
}

/** Generate an invite token for a VOID ID */
export function useGenerateInviteToken() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (voidId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.generateInviteToken(voidId);
    },
  });
}

/** Resolve an invite token to a voidId (or null if invalid) */
export function useResolveInviteToken(token: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['inviteToken', token],
    queryFn: async () => {
      if (!actor) return null;
      return actor.resolveInviteToken(token);
    },
    enabled: !!actor && !actorFetching && !!token && token.length > 0,
    staleTime: 60_000,
  });
}

// ─── Creator Portal ───────────────────────────────────────────────────────────

/** Get the current daily reflection text (public, unauthenticated access) */
export function useGetDailyReflection() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['dailyReflection'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getDailyReflection();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

/** Set the daily reflection text (admin only) */
export function useSetDailyReflection() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setDailyReflection(text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyReflection'] });
    },
  });
}

/** Get all user profiles (admin only) */
export function useGetAllUserProfiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import('../backend').UserProfile[]>({
    queryKey: ['allUserProfiles'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserProfiles();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

/** Check if the currently authenticated caller is an admin */
export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

/** Pin a message in a channel as a Void Transmission (admin only) */
export function usePinMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channel, messageId }: { channel: string; messageId: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.pinMessage(channel, messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pinnedMessage', variables.channel] });
    },
  });
}

/** Get the pinned message for a channel */
export function useGetPinnedMessage(channel: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import('../backend').Message | null>({
    queryKey: ['pinnedMessage', channel],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPinnedMessage(channel);
    },
    enabled: !!actor && !actorFetching && !!channel,
    staleTime: 30_000,
  });
}
