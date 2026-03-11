import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CosmicNFT,
  GroupInfo,
  Message,
  MessageType,
  NFTCategory,
  OfferingType,
  UserProfile,
  ValueOffering,
} from "../backend";
import { useActor } from "./useActor";

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useSetCosmicHandle() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voidId,
      handle,
    }: { voidId: string; handle: string }) => {
      if (!actor) throw new Error("Actor not available");

      // New users have no profile yet — setCosmicHandle will throw
      // "VOID ID not registered" unless saveCallerUserProfile is called first
      // to register the voidId in the canister's voidIdToPrincipal map.
      const existing = await actor.getCallerUserProfile().catch(() => null);
      if (!existing) {
        await actor.saveCallerUserProfile({ voidId });
      }

      await actor.setCosmicHandle(voidId, handle);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      // Also invalidate the cosmicHandle cache so the UI refreshes everywhere
      queryClient.invalidateQueries({
        queryKey: ["cosmicHandle", variables.voidId],
      });
      queryClient.invalidateQueries({ queryKey: ["cosmicHandle"] });
    },
  });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export function useGetMessages(channel: string, enabled = true) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Message[]>({
    queryKey: ["messages", channel],
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
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      await actor.postMessage(
        channel,
        ciphertext,
        senderVoidId,
        messageType,
        replyTo ?? null,
        blobId ?? null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.channel],
      });
    },
  });
}

// ─── DMs ─────────────────────────────────────────────────────────────────────

export function useGetSortedDMs() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery({
    queryKey: ["sortedDMs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listChannels();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5000,
  });
}

export function useCreateDM() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      voidId1,
      voidId2,
    }: { voidId1: string; voidId2: string }) => {
      if (!actor) throw new Error("Actor not available");

      // Ensure caller's voidId is registered in the backend before creating a DM.
      // Without this, the backend rejects the call with "You must own at least one of the VOID IDs".
      try {
        const profile = await actor.getCallerUserProfile().catch(() => null);
        if (!profile) {
          await actor.saveCallerUserProfile({ voidId: voidId1 });
        }
      } catch {
        // If registration fails, still attempt createDM (might already be registered)
      }

      return actor.createDM(voidId1, voidId2);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sortedDMs"] });
    },
  });
}

export function useGetCosmicHandle(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ["cosmicHandle", voidId],
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
      if (!actor) throw new Error("Actor not available");
      await actor.postMessageWithKeywords(
        channel,
        ciphertext,
        senderVoidId,
        messageType,
        replyTo ?? null,
        blobId ?? null,
        keywords,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.channel],
      });
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
      if (!actor) throw new Error("Actor not available");
      await actor.upvoteMessage(channel, messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.channel],
      });
    },
  });
}

/** Get a user's total Wisdom Score (sum of upvotes received) */
export function useGetWisdomScore(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ["wisdomScore", voidId],
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
      if (!actor) throw new Error("Actor not available");
      return actor.generateInviteToken(voidId);
    },
  });
}

/** Resolve an invite token to a voidId (or null if invalid) */
export function useResolveInviteToken(token: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ["inviteToken", token],
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
    queryKey: ["dailyReflection"],
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
      if (!actor) throw new Error("Actor not available");
      await actor.setDailyReflection(text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyReflection"] });
    },
  });
}

/** Get all user profiles (admin only) */
export function useGetAllUserProfiles() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").UserProfile[]>({
    queryKey: ["allUserProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      // getAllUserProfiles is not in the current backend interface; return empty array
      return [];
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

/** Check if the currently authenticated caller is an admin */
export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
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
    mutationFn: async ({
      channel,
      messageId,
    }: { channel: string; messageId: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.pinMessage(channel, messageId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pinnedMessage", variables.channel],
      });
    },
  });
}

/** Get the pinned message for a channel */
export function useGetPinnedMessage(channel: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<import("../backend").Message | null>({
    queryKey: ["pinnedMessage", channel],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPinnedMessage(channel);
    },
    enabled: !!actor && !actorFetching && !!channel,
    staleTime: 30_000,
  });
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export function useGetGroupsForVoidId(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<GroupInfo[]>({
    queryKey: ["groupsForVoidId", voidId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGroupsForVoidId(voidId);
    },
    enabled: !!actor && !actorFetching && !!voidId,
    refetchInterval: 5000,
  });
}

export function useCreateGroup() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      creatorVoidId,
    }: { name: string; creatorVoidId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createGroup(name, creatorVoidId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groupsForVoidId", variables.creatorVoidId],
      });
    },
  });
}

export function useAddGroupMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      memberVoidId,
    }: { groupId: string; memberVoidId: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addGroupMember(groupId, memberVoidId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["groupInfo", variables.groupId],
      });
    },
  });
}

export function useGetGroupInfo(groupId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<GroupInfo | null>({
    queryKey: ["groupInfo", groupId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getGroupInfo(groupId);
    },
    enabled: !!actor && !actorFetching && !!groupId,
    staleTime: 10_000,
  });
}

// ─── NFT Marketplace ─────────────────────────────────────────────────────────

export function useGetMarketplaceListings(category?: NFTCategory) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<CosmicNFT[]>({
    queryKey: ["marketplaceListings", category ?? "all"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMarketplaceListings(category ?? null);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15_000,
  });
}

export function useGetUserNFTs(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<CosmicNFT[]>({
    queryKey: ["userNFTs", voidId],
    queryFn: async () => {
      if (!actor || !voidId) return [];
      return actor.getUserNFTs(voidId);
    },
    enabled: !!actor && !actorFetching && !!voidId,
    staleTime: 30_000,
  });
}

export function useGetNFTsByCreator(creatorVoidId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<CosmicNFT[]>({
    queryKey: ["nftsByCreator", creatorVoidId],
    queryFn: async () => {
      if (!actor || !creatorVoidId) return [];
      return actor.getNFTsByCreator(creatorVoidId);
    },
    enabled: !!actor && !actorFetching && !!creatorVoidId,
    staleTime: 30_000,
  });
}

export function useGetMintablePost(wisdomScore: number) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["mintablePost", wisdomScore],
    queryFn: async () => {
      if (!actor) return false;
      return actor.getMintablePost(BigInt(wisdomScore));
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

export function useGetRoyaltiesEarned(voidId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["royaltiesEarned", voidId],
    queryFn: async () => {
      if (!actor || !voidId) return BigInt(0);
      return actor.getRoyaltiesEarned(voidId);
    },
    enabled: !!actor && !actorFetching && !!voidId,
    staleTime: 30_000,
  });
}

export function useMintNFT() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      postText,
      wisdomScore,
      metadataJson,
      category,
      creatorVoidId,
      rareTrait,
    }: {
      postText: string;
      wisdomScore: number;
      metadataJson: string;
      category: NFTCategory;
      creatorVoidId: string;
      rareTrait?: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.mintNFT(
        postText,
        BigInt(wisdomScore),
        metadataJson,
        category,
        creatorVoidId,
        rareTrait ?? null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["marketplaceListings"],
      });
      queryClient.invalidateQueries({
        queryKey: ["userNFTs", variables.creatorVoidId],
      });
      queryClient.invalidateQueries({
        queryKey: ["nftsByCreator", variables.creatorVoidId],
      });
    },
  });
}

export function useResonateNFT() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      resonatorVoidId,
    }: {
      nftId: bigint;
      resonatorVoidId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.resonateNFT(nftId, resonatorVoidId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplaceListings"] });
    },
  });
}

export function useBuyNFT() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      buyerVoidId,
    }: {
      nftId: bigint;
      buyerVoidId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.buyNFT(nftId, buyerVoidId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplaceListings"] });
      queryClient.invalidateQueries({ queryKey: ["userNFTs"] });
    },
  });
}

export function useListNFTForSale() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      nftId,
      priceVoid,
    }: {
      nftId: bigint;
      priceVoid: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.listNFTForSale(nftId, priceVoid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplaceListings"] });
      queryClient.invalidateQueries({ queryKey: ["userNFTs"] });
    },
  });
}

// ─── Value Offerings ──────────────────────────────────────────────────────────

export function useGetValueOfferings() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<ValueOffering[]>({
    queryKey: ["valueOfferings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getValueOfferings();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export function useGetOfferingsByCreator(creatorVoidId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<ValueOffering[]>({
    queryKey: ["offeringsByCreator", creatorVoidId],
    queryFn: async () => {
      if (!actor || !creatorVoidId) return [];
      return actor.getOfferingsByCreator(creatorVoidId);
    },
    enabled: !!actor && !actorFetching && !!creatorVoidId,
    staleTime: 30_000,
  });
}

export function useCreateValueOffering() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      priceVoid,
      offeringType,
      creatorVoidId,
    }: {
      title: string;
      description: string;
      priceVoid: number;
      offeringType: OfferingType;
      creatorVoidId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createValueOffering(
        title,
        description,
        BigInt(priceVoid),
        offeringType,
        creatorVoidId,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["valueOfferings"] });
      queryClient.invalidateQueries({
        queryKey: ["offeringsByCreator", variables.creatorVoidId],
      });
    },
  });
}

export function useDeactivateOffering() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      offeringId,
      callerVoidId,
    }: {
      offeringId: string;
      callerVoidId: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deactivateOffering(offeringId, callerVoidId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valueOfferings"] });
      queryClient.invalidateQueries({ queryKey: ["offeringsByCreator"] });
    },
  });
}
