import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface CosmicNFT {
    id: bigint;
    postText: string;
    creator: Principal;
    resonanceCount: bigint;
    lineage: Array<string>;
    rareTrait?: string;
    metadataJson: string;
    creatorVoidId: string;
    mintedAt: bigint;
    wisdomScore: bigint;
    category: NFTCategory;
    priceVoid: bigint;
    isForSale: boolean;
}
export interface GroupInfo {
    id: string;
    members: Array<string>;
    name: string;
    createdAt: bigint;
    createdBy: string;
}
export type ChannelType = {
    __kind__: "dm";
    dm: string;
} | {
    __kind__: "darkRoom";
    darkRoom: null;
} | {
    __kind__: "group";
    group: string;
} | {
    __kind__: "lightRoom";
    lightRoom: null;
};
export interface Message {
    id: string;
    upvotes: bigint;
    senderVoidId: string;
    ciphertext: string;
    keywords: Array<string>;
    messageType: MessageType;
    timestamp: bigint;
    blobId?: string;
    replyTo?: string;
}
export interface ValueOffering {
    id: string;
    title: string;
    createdAt: bigint;
    description: string;
    creatorVoidId: string;
    isActive: boolean;
    offeringType: OfferingType;
    priceVoid: bigint;
}
export interface UserProfile {
    voidId: string;
    e2eePublicKey?: Uint8Array;
    cosmicHandle?: string;
}
export enum MessageType {
    file = "file",
    text = "text",
    image = "image"
}
export enum NFTCategory {
    guidedBreathwork = "guidedBreathwork",
    sageReflection = "sageReflection",
    deepShadow = "deepShadow",
    lightWisdom = "lightWisdom"
}
export enum OfferingType {
    art = "art",
    wisdom = "wisdom",
    breathwork = "breathwork",
    oneOnOne = "oneOnOne"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addGroupMember(groupId: string, memberVoidId: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    buyNFT(nftId: bigint, buyerVoidId: string): Promise<void>;
    createDM(voidId1: string, voidId2: string): Promise<string>;
    createGroup(name: string, creatorVoidId: string): Promise<string>;
    createValueOffering(title: string, description: string, priceVoid: bigint, offeringType: OfferingType, creatorVoidId: string): Promise<string>;
    deactivateOffering(offeringId: string, callerVoidId: string): Promise<void>;
    generateInviteToken(voidId: string): Promise<string>;
    getAllGroups(): Promise<Array<GroupInfo>>;
    getAllUserProfiles(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCosmicHandle(voidId: string): Promise<string | null>;
    getDailyReflection(): Promise<string | null>;
    getE2EEPublicKey(voidId: string): Promise<Uint8Array | null>;
    getGroupInfo(groupId: string): Promise<GroupInfo | null>;
    getGroupsForVoidId(voidId: string): Promise<Array<GroupInfo>>;
    getMarketplaceListings(category: NFTCategory | null): Promise<Array<CosmicNFT>>;
    getMessages(channel: string, count: bigint): Promise<Array<Message>>;
    getMessagesByKeyword(channel: string, keyword: string, count: bigint): Promise<Array<Message>>;
    getMintablePost(wisdomScore: bigint): Promise<boolean>;
    getNFT(nftId: bigint): Promise<CosmicNFT | null>;
    getNFTsByCreator(creatorVoidId: string): Promise<Array<CosmicNFT>>;
    getOfferingsByCreator(creatorVoidId: string): Promise<Array<ValueOffering>>;
    getPinnedMessage(channel: string): Promise<Message | null>;
    getRoyaltiesEarned(voidId: string): Promise<bigint>;
    getUserNFTs(voidId: string): Promise<Array<CosmicNFT>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getValueOfferings(): Promise<Array<ValueOffering>>;
    getWisdomScore(voidId: string): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    listChannels(): Promise<Array<ChannelType>>;
    listNFTForSale(nftId: bigint, priceVoid: bigint): Promise<void>;
    loadOlderMessages(channel: string, start: bigint, count: bigint): Promise<Array<Message>>;
    mintNFT(postText: string, wisdomScore: bigint, metadataJson: string, category: NFTCategory, creatorVoidId: string, rareTrait: string | null): Promise<bigint>;
    pinMessage(channel: string, messageId: string): Promise<void>;
    postMessage(channel: string, ciphertext: string, senderVoidId: string, messageType: MessageType, replyTo: string | null, blobId: string | null): Promise<void>;
    postMessageWithKeywords(channel: string, ciphertext: string, senderVoidId: string, messageType: MessageType, replyTo: string | null, blobId: string | null, keywords: Array<string>): Promise<void>;
    removeGroupMember(groupId: string, memberVoidId: string): Promise<void>;
    resolveInviteToken(token: string): Promise<string | null>;
    resonateNFT(nftId: bigint, resonatorVoidId: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCosmicHandle(voidId: string, handle: string): Promise<void>;
    setDailyReflection(text: string): Promise<void>;
    storeE2EEPublicKey(publicKey: Uint8Array): Promise<void>;
    upvoteMessage(channel: string, messageId: string): Promise<void>;
}
