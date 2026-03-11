/**
 * Messages — Full-featured DM + Groups list for VOID.
 *
 * Key features:
 * - AuthModal: blocking full-screen modal until Cosmic Handle is claimed
 * - Cosmic Handle as big bold gold title, VOID ID as tiny gray subtitle
 * - Unread badges per chat + total badge exported for Navigation
 * - Tap handle/avatar → chat, tap Info icon → profile card
 * - React.memo + useCallback for performance
 */

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AtSign,
  Check,
  Copy,
  Info,
  MessageSquare,
  Plus,
  Search,
  Share2,
  Users,
  X,
} from "lucide-react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChannelType } from "../backend";
import AuthModal from "../components/AuthModal";
import InviteModal from "../components/InviteModal";
import UserProfileCard from "../components/UserProfileCard";
import VoidAvatar from "../components/VoidAvatar";
import { useCustomAvatar } from "../hooks/useCustomAvatar";
import {
  useAddGroupMember,
  useCreateDM,
  useCreateGroup,
  useGetCallerUserProfile,
  useGetCosmicHandle,
  useGetGroupsForVoidId,
  useGetSortedDMs,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import {
  type KnownUser,
  getCachedHandle,
  registerKnownUser,
  searchKnownUsers,
} from "../lib/userRegistry";

// ─── Unread count helpers (exported for Navigation.tsx) ───────────────────────

export function getUnreadCount(chatId: string): number {
  try {
    return Number(localStorage.getItem(`void_unread_${chatId}`) ?? 0);
  } catch {
    return 0;
  }
}

export function getStoredTotalUnread(): number {
  try {
    return Number(localStorage.getItem("void_total_unread") ?? 0);
  } catch {
    return 0;
  }
}

export function incrementUnread(chatId: string): void {
  try {
    const current = getUnreadCount(chatId);
    const next = current + 1;
    localStorage.setItem(`void_unread_${chatId}`, String(next));
    const total = getStoredTotalUnread();
    localStorage.setItem("void_total_unread", String(total + 1));
  } catch {
    // fail silently
  }
}

export function markChatReadLocal(chatId: string): void {
  try {
    const prev = getUnreadCount(chatId);
    localStorage.setItem(`void_unread_${chatId}`, "0");
    const total = getStoredTotalUnread();
    const newTotal = Math.max(0, total - prev);
    localStorage.setItem("void_total_unread", String(newTotal));
  } catch {
    // fail silently
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the DM partner's voidId from the channel ID.
 * Channel format: DM-@void_shadow_A:canister_@void_shadow_B:canister
 * Both IDs start with "@void_shadow_", so we split on "_@void_shadow_" after the first ID.
 */
function getDMPartner(channelId: string, myVoidId: string): string {
  const body = channelId.startsWith("DM-") ? channelId.slice(3) : channelId;
  const separator = "_@void_shadow_";
  const sepIdx = body.indexOf(separator);
  if (sepIdx !== -1) {
    const id1 = body.slice(0, sepIdx);
    const id2 = `@void_shadow_${body.slice(sepIdx + separator.length)}`;
    return id1 === myVoidId ? id2 : id1;
  }
  return channelId;
}

function getChannelId(channel: ChannelType): string {
  if (channel.__kind__ === "dm") return channel.dm;
  return channel.__kind__;
}

function isValidVoidId(id: string): boolean {
  return /^@void_shadow_[a-zA-Z0-9]+:canister$/.test(id.trim());
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ListTab = "dms" | "groups";
type SearchTab = "voidId" | "handle";

// ─── DMPartnerName ────────────────────────────────────────────────────────────
/**
 * Shows @CosmicHandle as big bold gold title and VOID ID as tiny gray subtitle.
 * This is the critical fix: always fetch the handle and display it prominently.
 */
const DMPartnerName = memo(function DMPartnerName({
  voidId,
}: { voidId: string }) {
  const cachedHandle = getCachedHandle(voidId);
  const { data: fetchedHandle } = useGetCosmicHandle(voidId);

  useEffect(() => {
    if (fetchedHandle) registerKnownUser(voidId, fetchedHandle);
  }, [fetchedHandle, voidId]);

  const handle = fetchedHandle ?? cachedHandle ?? null;
  const shortId = voidId.replace("@void_shadow_", "").replace(":canister", "");

  return (
    <div className="min-w-0">
      <div
        className="font-bold text-base leading-tight truncate"
        style={{ color: "rgba(255,215,0,0.95)" }}
      >
        {handle
          ? `@${handle.replace(/^@/, "")}`
          : `void_${shortId.slice(0, 8)}`}
      </div>
      {handle && (
        <div className="text-white/25 text-[10px] font-mono truncate mt-0.5">
          @void_{shortId}
        </div>
      )}
    </div>
  );
});

// ─── DMListItem ───────────────────────────────────────────────────────────────
interface DMListItemProps {
  channelId: string;
  myVoidId: string;
  unreadCount: number;
  index: number;
  onNavigate: (channelId: string) => void;
  onViewProfile: (voidId: string) => void;
}

const DMListItem = memo(function DMListItem({
  channelId,
  myVoidId,
  unreadCount,
  index,
  onNavigate,
  onViewProfile,
}: DMListItemProps) {
  const partnerVoidId = getDMPartner(channelId, myVoidId);
  const { avatarUrl: partnerAvatar } = useCustomAvatar(partnerVoidId);

  return (
    <button
      type="button"
      data-ocid={`messages.dm.item.${index}`}
      className="flex items-center gap-3 w-full px-4 py-3.5 border-b border-white/5 cursor-pointer text-left transition-colors hover:bg-void-gold/5 active:bg-void-gold/10"
      onClick={() => onNavigate(channelId)}
      aria-label={`Chat with ${partnerVoidId}`}
    >
      {/* Avatar */}
      <div className="shrink-0 relative">
        <VoidAvatar
          voidId={partnerVoidId}
          size="md"
          customAvatarUrl={partnerAvatar ?? undefined}
        />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-red-500 text-white"
            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {/* Name section */}
      <div className="flex-1 min-w-0">
        <DMPartnerName voidId={partnerVoidId} />
      </div>

      {/* Info icon */}
      <button
        type="button"
        data-ocid={`messages.dm.profile.button.${index}`}
        onClick={(e) => {
          e.stopPropagation();
          onViewProfile(partnerVoidId);
        }}
        className="shrink-0 text-white/20 hover:text-white/50 transition-colors p-1"
        aria-label="View profile"
      >
        <Info size={15} />
      </button>
    </button>
  );
});

// ─── NewDMModal ───────────────────────────────────────────────────────────────
interface NewDMModalProps {
  voidId: string;
  onClose: () => void;
  onCreate: (targetVoidId: string) => Promise<void>;
  creating: boolean;
}

const NewDMModal = memo(function NewDMModal({
  voidId,
  onClose,
  onCreate,
  creating,
}: NewDMModalProps) {
  const [tab, setTab] = useState<SearchTab>("voidId");
  const [voidIdInput, setVoidIdInput] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<KnownUser[]>([]);
  const [copied, setCopied] = useState(false);
  const [previewVoidId, setPreviewVoidId] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "handle") return;
    if (!handleInput.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchResults(searchKnownUsers(handleInput));
  }, [handleInput, tab]);

  const handleVoidIdSubmit = useCallback(() => {
    let trimmed = voidIdInput.trim();
    if (/^[a-zA-Z0-9]{6,16}$/.test(trimmed)) {
      trimmed = `@void_shadow_${trimmed}:canister`;
    }
    if (!isValidVoidId(trimmed)) {
      setValidationError(
        "Invalid VOID ID. Enter full ID like @void_shadow_abc12345:canister or just the short code.",
      );
      return;
    }
    setValidationError(null);
    setPreviewVoidId(trimmed);
  }, [voidIdInput]);

  const copyMyId = useCallback(() => {
    navigator.clipboard
      .writeText(voidId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Could not copy to clipboard"));
  }, [voidId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div
        data-ocid="messages.dm.modal"
        className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4 rounded-sm overflow-y-auto max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold tracking-wider">
            New Message
          </h2>
          <button
            type="button"
            data-ocid="messages.dm.close_button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* My VOID ID */}
        <div className="mb-5 p-3 bg-void-black/40 border border-void-gold/10">
          <div className="text-white/30 text-xs mb-1">Your VOID ID</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-white/60 text-xs font-mono truncate">
              {voidId}
            </div>
            <button
              type="button"
              onClick={copyMyId}
              className="shrink-0 text-white/30 hover:text-void-gold transition-colors p-1"
              title="Copy VOID ID"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Search tabs */}
        <div className="flex mb-4 border-b border-white/10">
          <button
            type="button"
            data-ocid="messages.dm.voidid.tab"
            onClick={() => setTab("voidId")}
            className={`flex-1 py-2 text-xs tracking-wider uppercase transition-colors ${
              tab === "voidId"
                ? "text-void-gold border-b-2 border-void-gold"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            VOID ID
          </button>
          <button
            type="button"
            data-ocid="messages.dm.handle.tab"
            onClick={() => setTab("handle")}
            className={`flex-1 py-2 text-xs tracking-wider uppercase transition-colors ${
              tab === "handle"
                ? "text-void-gold border-b-2 border-void-gold"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            Cosmic Handle
          </button>
        </div>

        {/* VOID ID tab */}
        {tab === "voidId" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                data-ocid="messages.dm.voidid.input"
                value={voidIdInput}
                onChange={(e) => {
                  setVoidIdInput(e.target.value);
                  setValidationError(null);
                  setPreviewVoidId(null);
                }}
                placeholder="@void_shadow_...or short code"
                className="flex-1 bg-void-black/50 border border-void-gold/15 text-white placeholder:text-white/20 px-3 py-2 text-xs focus:outline-none focus:border-void-gold/40 transition-colors"
                style={{ fontSize: "14px" }}
                onKeyDown={(e) => e.key === "Enter" && handleVoidIdSubmit()}
              />
              <button
                type="button"
                onClick={handleVoidIdSubmit}
                className="shrink-0 px-4 py-2 border border-void-gold/25 text-void-gold text-xs tracking-wider hover:bg-void-gold/10 transition-colors"
              >
                <Search size={14} />
              </button>
            </div>

            {validationError && (
              <p className="text-red-400/80 text-xs">{validationError}</p>
            )}

            {previewVoidId && (
              <div className="border border-void-gold/15 p-3 flex items-center gap-3">
                <VoidAvatar voidId={previewVoidId} size="sm" />
                <div className="flex-1 min-w-0">
                  <DMPartnerName voidId={previewVoidId} />
                </div>
                <button
                  type="button"
                  data-ocid="messages.dm.start_button"
                  onClick={() => onCreate(previewVoidId)}
                  disabled={creating}
                  className="shrink-0 px-3 py-1.5 bg-void-gold/15 border border-void-gold/30 text-void-gold text-xs hover:bg-void-gold/25 transition-colors disabled:opacity-40"
                >
                  {creating ? "Opening..." : "Message"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Handle search tab */}
        {tab === "handle" && (
          <div className="space-y-3">
            <div className="relative">
              <AtSign
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
              />
              <input
                type="text"
                data-ocid="messages.dm.handle.input"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="NebulaSage"
                className="w-full bg-void-black/50 border border-void-gold/15 text-white placeholder:text-white/20 pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-void-gold/40 transition-colors"
                style={{ fontSize: "14px" }}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="border border-void-gold/10 divide-y divide-white/5 max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.voidId}
                    type="button"
                    className="flex items-center gap-3 w-full p-3 text-left hover:bg-void-gold/5 cursor-pointer transition-colors"
                    onClick={() => onCreate(user.voidId)}
                  >
                    <VoidAvatar voidId={user.voidId} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-sm truncate"
                        style={{ color: "rgba(255,215,0,0.9)" }}
                      >
                        @{user.cosmicHandle}
                      </div>
                      <div className="text-white/30 text-[10px] font-mono truncate">
                        {user.voidId
                          .replace("@void_shadow_", "")
                          .replace(":canister", "")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {handleInput.trim() && searchResults.length === 0 && (
              <p className="text-white/30 text-xs text-center py-4">
                No known users found. Try searching by VOID ID instead.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─── NewGroupModal ────────────────────────────────────────────────────────────
interface NewGroupModalProps {
  voidId: string;
  onClose: () => void;
}

const NewGroupModal = memo(function NewGroupModal({
  voidId,
  onClose,
}: NewGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: createGroup, isPending: creating } = useCreateGroup();
  const { mutateAsync: addMember } = useAddGroupMember();
  const navigate = useNavigate();

  const addMemberToList = useCallback(() => {
    let trimmed = memberInput.trim();
    if (/^[a-zA-Z0-9]{6,16}$/.test(trimmed)) {
      trimmed = `@void_shadow_${trimmed}:canister`;
    }
    if (!isValidVoidId(trimmed)) {
      setError("Invalid VOID ID.");
      return;
    }
    if (trimmed === voidId) {
      setError("You are automatically included as the creator.");
      return;
    }
    if (members.includes(trimmed)) {
      setError("Already added.");
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setMemberInput("");
    setError(null);
  }, [memberInput, members, voidId]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name.");
      return;
    }
    setError(null);
    try {
      const groupId = await createGroup({
        creatorVoidId: voidId,
        name: groupName.trim(),
      });
      if (!groupId) {
        setError("Failed to create group. Try again.");
        return;
      }
      // Add members
      await Promise.all(
        members.map((m) =>
          addMember({ groupId, memberVoidId: m }).catch(() => {}),
        ),
      );
      onClose();
      navigate({
        to: "/groups/$groupId",
        params: { groupId: encodeURIComponent(groupId) },
      });
    } catch (err) {
      console.error("createGroup error", err);
      setError("Could not create group. Try again.");
    }
  }, [groupName, voidId, members, createGroup, addMember, onClose, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div
        data-ocid="messages.group.modal"
        className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4 rounded-sm overflow-y-auto max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold tracking-wider">New Group</h2>
          <button
            type="button"
            data-ocid="messages.group.close_button"
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Group name */}
          <div>
            <label
              htmlFor="group-name-input"
              className="text-white/40 text-xs mb-1.5 block"
            >
              Group Name
            </label>
            <input
              type="text"
              id="group-name-input"
              data-ocid="messages.group.name.input"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="The Wisdom Circle"
              maxLength={40}
              className="w-full bg-void-black/50 border border-void-gold/15 text-white placeholder:text-white/20 px-3 py-2 text-sm focus:outline-none focus:border-void-gold/40 transition-colors"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Add members */}
          <div>
            <label
              htmlFor="group-member-input"
              className="text-white/40 text-xs mb-1.5 block"
            >
              Add Members
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="group-member-input"
                data-ocid="messages.group.member.input"
                value={memberInput}
                onChange={(e) => {
                  setMemberInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && addMemberToList()}
                placeholder="VOID ID or short code"
                className="flex-1 bg-void-black/50 border border-void-gold/15 text-white placeholder:text-white/20 px-3 py-2 text-xs focus:outline-none focus:border-void-gold/40 transition-colors"
                style={{ fontSize: "14px" }}
              />
              <button
                type="button"
                onClick={addMemberToList}
                className="px-3 border border-void-gold/25 text-void-gold hover:bg-void-gold/10 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Member list */}
          {members.length > 0 && (
            <div className="space-y-1.5">
              {members.map((m) => (
                <div
                  key={m}
                  className="flex items-center gap-2 px-3 py-2 bg-void-black/30 border border-void-gold/10"
                >
                  <VoidAvatar voidId={m} size="sm" />
                  <span className="flex-1 text-white/60 text-xs font-mono truncate">
                    {m.replace("@void_shadow_", "").replace(":canister", "")}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((prev) => prev.filter((x) => x !== m))
                    }
                    className="text-white/20 hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-red-400/80 text-xs">{error}</p>}

          <button
            type="button"
            data-ocid="messages.group.submit_button"
            onClick={handleCreate}
            disabled={creating || !groupName.trim()}
            className="w-full py-3 border border-void-gold/25 text-void-gold text-xs tracking-widest uppercase hover:bg-void-gold/10 transition-colors disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Messages page ────────────────────────────────────────────────────────────

export default function Messages() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dms = [], isLoading } = useGetSortedDMs();
  const { mutateAsync: createDM, isPending: creating } = useCreateDM();
  const { data: userProfile } = useGetCallerUserProfile();
  const voidId = useVoidId();
  const { avatarUrl: myCustomAvatar } = useCustomAvatar(voidId ?? null);
  const [activeTab, setActiveTab] = useState<ListTab>("dms");
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileCardVoidId, setProfileCardVoidId] = useState<string | null>(
    null,
  );
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsForVoidId(
    voidId ?? "",
  );

  const dmChannels = dms.filter((d) => d.__kind__ === "dm");

  // Determine if user needs to set a cosmic handle
  const needsHandle =
    !!userProfile &&
    (!userProfile.cosmicHandle || userProfile.cosmicHandle.trim() === "");

  // Load unread counts from localStorage on mount and periodically
  // biome-ignore lint/correctness/useExhaustiveDependencies: dmChannels is unstable; length is sufficient
  useEffect(() => {
    const load = () => {
      const map: Record<string, number> = {};
      for (const dm of dmChannels) {
        const id = getChannelId(dm);
        map[id] = getUnreadCount(id);
      }
      setUnreadMap(map);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [dmChannels.length]);

  const handleNavigateToChat = useCallback(
    (channelId: string) => {
      navigate({
        to: "/dms/$channelId",
        params: { channelId: encodeURIComponent(channelId) },
      });
    },
    [navigate],
  );

  const handleViewProfile = useCallback((vId: string) => {
    setProfileCardVoidId(vId);
  }, []);

  const handleCreateDM = useCallback(
    async (targetVoidId: string) => {
      if (!voidId) return;
      if (targetVoidId === voidId) {
        toast.error("You cannot open a channel with yourself.");
        return;
      }
      try {
        const channelId = await createDM({
          voidId1: voidId,
          voidId2: targetVoidId,
        });
        if (!channelId) {
          toast.error("Failed to create channel. Try again.");
          return;
        }
        setShowNewDM(false);
        navigate({
          to: "/dms/$channelId",
          params: { channelId: encodeURIComponent(channelId) },
        });
      } catch (err) {
        console.error("createDM error", err);
        toast.error("Could not open channel. Check the VOID ID and try again.");
      }
    },
    [voidId, createDM, navigate],
  );

  const handleAuthSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
  }, [queryClient]);

  const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

  return (
    <div className="void-bg flex flex-col h-full">
      {/* Blocking AuthModal — must claim handle before using app */}
      {needsHandle && voidId && (
        <AuthModal voidId={voidId} onSuccess={handleAuthSuccess} />
      )}

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-void-gold/15 flex items-center justify-between shrink-0 bg-void-black/60">
        <div>
          <h1
            className="font-bold tracking-wider text-lg flex items-center gap-2"
            style={{ color: "rgba(255,215,0,0.95)" }}
          >
            Messages
            <span
              className="w-2 h-2 rounded-full bg-green-500 inline-block"
              style={{ boxShadow: "0 0 6px rgba(34,197,94,0.8)" }}
            />
          </h1>
          <p className="text-white/30 text-xs mt-0.5">
            Private · End-to-End Encrypted
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="messages.invite.open_modal_button"
            onClick={() => setInviteOpen(true)}
            className="void-btn-icon"
            title="Invite friends"
          >
            <Share2 size={16} />
          </button>
          {activeTab === "dms" && (
            <button
              type="button"
              data-ocid="messages.dm.open_modal_button"
              onClick={() => setShowNewDM(true)}
              className="void-btn-icon"
              title="New direct message"
            >
              <Plus size={18} />
            </button>
          )}
          {activeTab === "groups" && (
            <button
              type="button"
              data-ocid="messages.group.open_modal_button"
              onClick={() => setShowNewGroup(true)}
              className="void-btn-icon"
              title="New group"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2 border-b border-void-gold/10 bg-void-black/40">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
          />
          <input
            type="text"
            data-ocid="messages.search_input"
            placeholder="Search by Cosmic Handle or VOID ID"
            className="w-full bg-void-black/50 border border-void-gold/15 text-white placeholder:text-white/20 pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-void-gold/40 transition-colors"
            style={{ fontSize: "14px" }}
            readOnly
            onClick={() => setShowNewDM(true)}
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-white/10">
        <button
          type="button"
          data-ocid="messages.dms.tab"
          onClick={() => setActiveTab("dms")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs tracking-wider uppercase transition-colors ${
            activeTab === "dms"
              ? "text-void-gold border-b-2 border-void-gold bg-void-gold/5"
              : "text-white/30 hover:text-white/60"
          }`}
        >
          <MessageSquare size={13} />
          Direct Messages
          {totalUnread > 0 && (
            <span className="min-w-[18px] h-4 px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-red-500 text-white leading-none">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
        <button
          type="button"
          data-ocid="messages.groups.tab"
          onClick={() => setActiveTab("groups")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs tracking-wider uppercase transition-colors ${
            activeTab === "groups"
              ? "text-void-gold border-b-2 border-void-gold bg-void-gold/5"
              : "text-white/30 hover:text-white/60"
          }`}
        >
          <Users size={13} />
          Groups
        </button>
      </div>

      {/* Modals */}
      {showNewDM && voidId && (
        <NewDMModal
          voidId={voidId}
          onClose={() => setShowNewDM(false)}
          onCreate={handleCreateDM}
          creating={creating}
        />
      )}
      {showNewGroup && voidId && (
        <NewGroupModal voidId={voidId} onClose={() => setShowNewGroup(false)} />
      )}
      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        voidId={voidId ?? ""}
      />

      {/* ── Direct Messages tab ── */}
      {activeTab === "dms" && (
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div
              data-ocid="messages.loading_state"
              className="flex justify-center py-16"
            >
              <div className="text-white/30 text-sm animate-pulse">
                Loading channels...
              </div>
            </div>
          )}

          {!isLoading && dmChannels.length === 0 && (
            <div
              data-ocid="messages.dm.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center px-6"
            >
              <div className="text-4xl mb-4">💬</div>
              <p className="text-white/40 text-sm mb-1">No messages yet</p>
              <p className="text-white/20 text-xs">
                Tap + to start a private conversation
              </p>
            </div>
          )}

          {!isLoading &&
            dmChannels.map((dm, idx) => {
              const channelId = getChannelId(dm);
              return (
                <DMListItem
                  key={channelId}
                  channelId={channelId}
                  myVoidId={voidId ?? ""}
                  unreadCount={unreadMap[channelId] ?? 0}
                  index={idx + 1}
                  onNavigate={handleNavigateToChat}
                  onViewProfile={handleViewProfile}
                />
              );
            })}
        </div>
      )}

      {/* ── Groups tab ── */}
      {activeTab === "groups" && (
        <div className="flex-1 overflow-y-auto">
          {groupsLoading && (
            <div className="flex justify-center py-16">
              <div className="text-white/30 text-sm animate-pulse">
                Loading groups...
              </div>
            </div>
          )}

          {!groupsLoading && groups.length === 0 && (
            <div
              data-ocid="messages.groups.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center px-6"
            >
              <div className="text-4xl mb-4">👥</div>
              <p className="text-white/40 text-sm mb-1">No groups yet</p>
              <p className="text-white/20 text-xs">Tap + to create a group</p>
            </div>
          )}

          {!groupsLoading &&
            groups.map((group, idx) => (
              <button
                type="button"
                key={group.id}
                data-ocid={`messages.group.item.${idx + 1}`}
                className="flex items-center gap-3 w-full px-4 py-3.5 border-b border-white/5 text-left cursor-pointer hover:bg-void-gold/5 transition-colors"
                onClick={() =>
                  navigate({
                    to: "/groups/$groupId",
                    params: { groupId: encodeURIComponent(group.id) },
                  })
                }
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(123,47,190,0.2)",
                    border: "1px solid rgba(123,47,190,0.35)",
                  }}
                >
                  <Users size={16} style={{ color: "rgba(180,120,255,0.8)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-base truncate"
                    style={{ color: "rgba(255,215,0,0.9)" }}
                  >
                    {group.name}
                  </div>
                  <div className="text-white/25 text-[10px] font-mono truncate mt-0.5">
                    {group.members.length} members
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Profile card overlay */}
      {profileCardVoidId && (
        <UserProfileCard
          voidId={profileCardVoidId}
          onClose={() => setProfileCardVoidId(null)}
          onStartDM={() => setProfileCardVoidId(null)}
        />
      )}

      {/* My profile header avatar (optional touch) */}
      {voidId && myCustomAvatar && (
        <div style={{ display: "none" }}>
          <VoidAvatar voidId={voidId} customAvatarUrl={myCustomAvatar} />
        </div>
      )}
    </div>
  );
}
