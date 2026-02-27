import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export interface UserProfile {
    voidId: string;
    cosmicHandle?: string;
}
export enum MessageType {
    file = "file",
    text = "text",
    image = "image"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addGroupMember(groupId: string, memberVoidId: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    associateBlobWithMessage(blobId: string, messageId: string, channel: string): Promise<void>;
    createDM(voidId1: string, voidId2: string): Promise<string>;
    createGroup(name: string, creatorVoidId: string): Promise<string>;
    generateInviteToken(voidId: string): Promise<string>;
    getAllGroups(): Promise<Array<GroupInfo>>;
    getAllUserProfiles(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCosmicHandle(voidId: string): Promise<string | null>;
    getDailyReflection(): Promise<string | null>;
    getGroupInfo(groupId: string): Promise<GroupInfo | null>;
    getGroupsForVoidId(voidId: string): Promise<Array<GroupInfo>>;
    getMessages(channel: string, count: bigint): Promise<Array<Message>>;
    getMessagesByKeyword(channel: string, keyword: string, count: bigint): Promise<Array<Message>>;
    getPinnedMessage(channel: string): Promise<Message | null>;
    getSortedDMs(): Promise<Array<ChannelType>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWisdomScore(voidId: string): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    listChannels(): Promise<Array<ChannelType>>;
    loadOlderMessages(channel: string, start: bigint, count: bigint): Promise<Array<Message>>;
    pinMessage(channel: string, messageId: string): Promise<void>;
    postMessage(channel: string, ciphertext: string, senderVoidId: string, messageType: MessageType, replyTo: string | null, blobId: string | null): Promise<void>;
    postMessageWithKeywords(channel: string, ciphertext: string, senderVoidId: string, messageType: MessageType, replyTo: string | null, blobId: string | null, keywords: Array<string>): Promise<void>;
    resolveInviteToken(token: string): Promise<string | null>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCosmicHandle(voidId: string, handle: string): Promise<void>;
    setDailyReflection(text: string): Promise<void>;
    upvoteMessage(channel: string, messageId: string): Promise<void>;
}
