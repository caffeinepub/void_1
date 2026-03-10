/**
 * Messages — Full-featured DM + Groups list for VOID.
 * Replaces DMList.tsx as the active component on the /dms route.
 *
 * Key features:
 * - Cosmic Handle as big bold gold title, VOID ID as tiny gray subtitle
 * - Unread badges per chat + total badge exported for Navigation
 * - Tap handle/avatar → chat, tap Info icon → profile card
 * - React.memo + useCallback for performance
 * - CosmicHandleModal: blocking full-screen modal until handle is claimed
 */

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
  Sparkles,
  Users,
  X,
} from "lucide-react";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ChannelType } from "../backend";
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
  useSetCosmicHandle,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import {
  type KnownUser,
  getCachedHandle,
  registerKnownUser,
  searchKnownUsers,
} from "../lib/userRegistry";

// ─── Unread count helpers (exported for Navigation.tsx) ───────────────────────

/** Read unread count for a specific chat from localStorage */
export function getUnreadCount(chatId: string): number {
  try {
    return Number(localStorage.getItem(`void_unread_${chatId}`) ?? 0);
  } catch {
    return 0;
  }
}

/** Get total unread count from localStorage */
export function getStoredTotalUnread(): number {
  try {
    return Number(localStorage.getItem("void_total_unread") ?? 0);
  } catch {
    return 0;
  }
}

/** Increment unread count for a specific chat */
export function incrementUnread(chatId: string): void {
  try {
    const current = getUnreadCount(chatId);
    const next = current + 1;
    localStorage.setItem(`void_unread_${chatId}`, String(next));
    // Update total
    const total = getStoredTotalUnread();
    localStorage.setItem("void_total_unread", String(total + 1));
  } catch {
    // fail silently
  }
}

/** Mark a chat as read (clear its unread count) */
export function markChatReadLocal(chatId: string): void {
  try {
    const prev = getUnreadCount(chatId);
    localStorage.setItem(`void_unread_${chatId}`, "0");
    // Decrease total by the amount we're clearing
    const total = getStoredTotalUnread();
    const newTotal = Math.max(0, total - prev);
    localStorage.setItem("void_total_unread", String(newTotal));
  } catch {
    // fail silently
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDMPartner(channelId: string, myVoidId: string): string {
  // Channel format: DM-@void_shadow_A:canister_@void_shadow_B:canister
  // Split on _@ to correctly extract both full voidIds (voidIds contain underscores)
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

/** Derive a handle suggestion from a voidId */
function suggestHandle(voidId: string): string {
  // Extract short ID part: @void_shadow_abc12345:canister → abc12345
  const match = voidId.match(/@void_shadow_([a-zA-Z0-9]+):canister/);
  if (match?.[1]) {
    return `cosmic_${match[1].toLowerCase()}`;
  }
  // Fallback: use a random-ish cosmic name
  return `cosmic_void_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Search tab types ─────────────────────────────────────────────────────────
type SearchTab = "voidId" | "handle";
type ListTab = "dms" | "groups";

// ─── Small avatar for search results ─────────────────────────────────────────
const UserSearchAvatar = memo(function UserSearchAvatar({
  voidId,
}: { voidId: string }) {
  let customUrl: string | undefined;
  try {
    customUrl = localStorage.getItem(`void_avatar_${voidId}`) ?? undefined;
  } catch {
    customUrl = undefined;
  }
  return <VoidAvatar voidId={voidId} size="sm" customAvatarUrl={customUrl} />;
});

// ─── CosmicHandleModal ────────────────────────────────────────────────────────
interface CosmicHandleModalProps {
  voidId: string;
}

const CosmicHandleModal = memo(function CosmicHandleModal({
  voidId,
}: CosmicHandleModalProps) {
  const [handle, setHandle] = useState(() => suggestHandle(voidId));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: setCosmicHandle, isPending: claiming } =
    useSetCosmicHandle();

  // Block escape key — modal is non-dismissable
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClaim = useCallback(async () => {
    const trimmed = handle.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter a cosmic handle.");
      return;
    }
    if (trimmed.length < 3) {
      setError("Handle must be at least 3 characters.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Handle must be 32 characters or fewer.");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError("Only lowercase letters, numbers, and underscores are allowed.");
      return;
    }
    setError(null);
    try {
      await setCosmicHandle({ voidId, handle: trimmed });
      // useSetCosmicHandle already invalidates ["currentUserProfile"] on success
      // so the modal will unmount automatically when userProfile.cosmicHandle is set
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("taken") ||
        msg.toLowerCase().includes("exists")
      ) {
        setError("This cosmic name is already taken");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }, [handle, voidId, setCosmicHandle]);

  return (
    <div
      data-ocid="cosmic_handle.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.97)" }}
      // Non-dismissable: no onClick on backdrop
    >
      {/* Ambient star glow behind card */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, #FFD700 0%, #7B2FBE 40%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative bg-void-deep border border-void-gold/20 rounded-sm p-8 w-full max-w-md mx-4 shadow-[0_0_60px_rgba(255,215,0,0.08)]">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "radial-gradient(circle, rgba(255,215,0,0.15) 0%, rgba(123,47,190,0.1) 100%)",
              border: "1px solid rgba(255,215,0,0.25)",
              boxShadow: "0 0 24px rgba(255,215,0,0.15)",
            }}
          >
            <Sparkles size={26} className="text-void-gold" />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-center font-bold text-2xl mb-2 tracking-wide"
          style={{ color: "#FFD700" }}
        >
          Choose your Cosmic Handle
        </h2>

        {/* Subtitle */}
        <p className="text-center text-white/45 text-sm mb-7 leading-relaxed">
          This will be your permanent unique name in VOID
        </p>

        {/* Input */}
        <div className="relative mb-3">
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold pointer-events-none"
            style={{ color: "rgba(255,215,0,0.6)", fontSize: "14px" }}
          >
            @
          </span>
          <input
            ref={inputRef}
            id="cosmic-handle-input"
            type="text"
            data-ocid="cosmic_handle.input"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !claiming) handleClaim();
            }}
            placeholder="your_cosmic_name"
            maxLength={32}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={claiming}
            className="w-full bg-void-black/60 border text-white placeholder:text-white/20 pl-8 pr-4 py-3.5 text-sm focus:outline-none transition-colors disabled:opacity-60"
            style={{
              borderColor: error
                ? "rgba(239,68,68,0.6)"
                : "rgba(255,215,0,0.25)",
              fontSize: "14px",
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <p
            data-ocid="cosmic_handle.error_state"
            className="text-red-400 text-xs mb-4 flex items-center gap-1.5 leading-relaxed"
          >
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            {error}
          </p>
        )}
        {!error && (
          <p className="text-white/25 text-xs mb-4 leading-relaxed">
            Lowercase letters, numbers, underscores only. 3–32 characters.
          </p>
        )}

        {/* Claim button */}
        <button
          type="button"
          data-ocid="cosmic_handle.submit_button"
          onClick={handleClaim}
          disabled={claiming || !handle.trim()}
          className="void-btn-primary w-full py-3.5 text-sm tracking-widest uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{
            boxShadow: claiming ? "none" : "0 0 16px rgba(255,215,0,0.2)",
          }}
        >
          {claiming ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Claiming…
            </span>
          ) : (
            "Claim Handle"
          )}
        </button>

        {/* Non-dismissable notice */}
        <p className="text-center text-white/20 text-[10px] mt-5 tracking-wide">
          You must claim a handle before entering the void
        </p>
      </div>
    </div>
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
    <>
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
            <div className="flex items-center justify-between gap-2">
              <div className="text-void-gold/70 text-xs font-mono truncate flex-1">
                {voidId}
              </div>
              <button
                type="button"
                onClick={copyMyId}
                aria-label="Copy my VOID ID"
                className="shrink-0 flex items-center gap-1 text-xs text-void-gold/50 hover:text-void-gold transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-5 border border-void-gold/15 rounded-sm overflow-hidden">
            <button
              type="button"
              data-ocid="messages.dm.voidid.tab"
              onClick={() => {
                setTab("voidId");
                setValidationError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs tracking-wider uppercase transition-colors ${
                tab === "voidId"
                  ? "bg-void-gold/10 text-void-gold border-r border-void-gold/15"
                  : "text-white/30 hover:text-white/60 border-r border-void-gold/10"
              }`}
            >
              <AtSign size={12} />
              VOID ID
            </button>
            <button
              type="button"
              data-ocid="messages.dm.handle.tab"
              onClick={() => {
                setTab("handle");
                setValidationError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs tracking-wider uppercase transition-colors ${
                tab === "handle"
                  ? "bg-void-gold/10 text-void-gold"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <Search size={12} />
              By Handle
            </button>
          </div>

          {tab === "voidId" && (
            <div>
              <label
                htmlFor="dm-voidid-input"
                className="block text-white/40 text-xs mb-2"
              >
                Enter VOID ID or short code
              </label>
              <input
                id="dm-voidid-input"
                type="text"
                data-ocid="messages.dm.input"
                value={voidIdInput}
                onChange={(e) => {
                  setVoidIdInput(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVoidIdSubmit();
                }}
                placeholder="@void_shadow_xxxxxxxx:canister"
                className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm font-mono focus:outline-none focus:border-void-gold/50 mb-2 transition-colors"
                style={{ fontSize: "14px" }}
              />
              {validationError && (
                <p
                  data-ocid="messages.dm.error_state"
                  className="text-red-400/80 text-xs mb-3 leading-relaxed"
                >
                  {validationError}
                </p>
              )}
              <button
                type="button"
                data-ocid="messages.dm.submit_button"
                onClick={handleVoidIdSubmit}
                disabled={!voidIdInput.trim() || creating}
                className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50 mt-1"
              >
                {creating ? "Opening channel..." : "View Profile & Message"}
              </button>
            </div>
          )}

          {tab === "handle" && (
            <div>
              <label
                htmlFor="dm-handle-input"
                className="block text-white/40 text-xs mb-2"
              >
                Search cosmic handle
              </label>
              <input
                id="dm-handle-input"
                type="text"
                data-ocid="messages.dm.search_input"
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="Search @CosmicHandle..."
                className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 mb-2 transition-colors"
                style={{ fontSize: "14px" }}
              />
              {handleInput.trim() && searchResults.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">
                  No travelers found. They must appear in a shared room first.
                </p>
              )}
              {searchResults.length > 0 && (
                <div className="border border-void-gold/10 max-h-48 overflow-y-auto">
                  {searchResults.map((user, idx) => (
                    <button
                      key={user.voidId}
                      type="button"
                      data-ocid={`messages.dm.item.${idx + 1}`}
                      onClick={() => setPreviewVoidId(user.voidId)}
                      disabled={creating}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-void-gold/5 border-b border-white/5 last:border-0 text-left transition-colors disabled:opacity-50"
                    >
                      <UserSearchAvatar voidId={user.voidId} />
                      <div className="flex-1 min-w-0">
                        {user.cosmicHandle ? (
                          <>
                            <div className="text-void-gold font-bold text-sm truncate">
                              @{user.cosmicHandle.replace(/^@/, "")}
                            </div>
                            <div className="text-white/30 text-xs font-mono truncate">
                              {user.voidId}
                            </div>
                          </>
                        ) : (
                          <div className="text-white/60 text-xs font-mono truncate">
                            {user.voidId}
                          </div>
                        )}
                      </div>
                      <Info size={12} className="text-void-gold/30 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {!handleInput.trim() && (
                <p className="text-white/25 text-xs text-center py-4 leading-relaxed">
                  Travelers you've shared rooms with will appear here.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {previewVoidId && (
        <UserProfileCard
          voidId={previewVoidId}
          onClose={() => setPreviewVoidId(null)}
          onStartDM={() => {
            setPreviewVoidId(null);
            onCreate(previewVoidId);
          }}
        />
      )}
    </>
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
  const { mutateAsync: createGroup, isPending: creating } = useCreateGroup();
  const { mutateAsync: addMember } = useAddGroupMember();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [membersInput, setMembersInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    const name = groupName.trim();
    if (!name) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    try {
      const groupId = await createGroup({ name, creatorVoidId: voidId });
      if (membersInput.trim()) {
        const memberIds = membersInput
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        await Promise.all(
          memberIds.map((memberId) => {
            let id = memberId;
            if (/^[a-zA-Z0-9]{6,16}$/.test(id))
              id = `@void_shadow_${id}:canister`;
            return addMember({ groupId, memberVoidId: id }).catch(() => {
              console.warn(`Could not add member ${id}`);
            });
          }),
        );
      }
      toast.success(`Group "${name}" created`);
      onClose();
      navigate({
        to: "/groups/$groupId",
        params: { groupId: encodeURIComponent(groupId) },
      });
    } catch (err) {
      console.error("createGroup error", err);
      toast.error("Could not create group. Try again.");
    }
  }, [
    groupName,
    membersInput,
    voidId,
    createGroup,
    addMember,
    navigate,
    onClose,
  ]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div
        data-ocid="messages.group.modal"
        className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4 rounded-sm overflow-y-auto max-h-[85vh]"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-void-gold/60" />
            <h2 className="text-white font-semibold tracking-wider">
              New Group
            </h2>
          </div>
          <button
            type="button"
            data-ocid="messages.group.close_button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="group-name-input"
            className="block text-white/40 text-xs mb-2 tracking-wider uppercase"
          >
            Group Name <span className="text-void-gold/60">*</span>
          </label>
          <input
            id="group-name-input"
            type="text"
            data-ocid="messages.group.input"
            value={groupName}
            onChange={(e) => {
              setGroupName(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="e.g. Wisdom Seekers"
            maxLength={60}
            className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors"
            style={{ fontSize: "14px" }}
          />
          {error && (
            <p
              data-ocid="messages.group.error_state"
              className="text-red-400/80 text-xs mt-1.5"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mb-5">
          <label
            htmlFor="group-members-input"
            className="block text-white/40 text-xs mb-2 tracking-wider uppercase"
          >
            Add Members{" "}
            <span className="text-white/20 normal-case">(optional)</span>
          </label>
          <textarea
            id="group-members-input"
            data-ocid="messages.group.textarea"
            value={membersInput}
            onChange={(e) => setMembersInput(e.target.value)}
            placeholder="VOID IDs separated by commas&#10;e.g. abc12345, def67890"
            rows={3}
            className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-xs font-mono focus:outline-none focus:border-void-gold/50 resize-none transition-colors"
          />
        </div>

        <button
          type="button"
          data-ocid="messages.group.submit_button"
          onClick={handleCreate}
          disabled={!groupName.trim() || creating}
          className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
});

// ─── DMPartnerName — Cosmic Handle as title, VOID ID as subtitle ──────────────
const DMPartnerName = memo(function DMPartnerName({
  voidId,
}: { voidId: string }) {
  const cachedHandle = getCachedHandle(voidId);
  const { data: fetchedHandle } = useGetCosmicHandle(voidId);

  useEffect(() => {
    if (fetchedHandle) registerKnownUser(voidId, fetchedHandle);
  }, [fetchedHandle, voidId]);

  const handle = fetchedHandle ?? cachedHandle;
  const shortId = voidId.replace("@void_shadow_", "").replace(":canister", "");

  return (
    <div>
      {/* Cosmic Handle — big bold gold title */}
      <div className="text-void-gold font-bold text-base leading-tight truncate">
        {handle ? `@${handle.replace(/^@/, "")}` : `void_${shortId}`}
      </div>
      {/* VOID ID — tiny gray mono subtitle */}
      {handle && (
        <div className="text-white/25 text-[10px] font-mono truncate mt-0.5 tracking-tight">
          @void_{shortId}
        </div>
      )}
    </div>
  );
});

// ─── DMListItem — single DM row ───────────────────────────────────────────────
interface DMListItemProps {
  channelId: string;
  partner: string;
  isMe: boolean;
  myCustomAvatar?: string;
  unreadCount: number;
  index: number;
  onNavigate: (channelId: string) => void;
  onViewProfile: (voidId: string) => void;
}

const DMListItem = memo(function DMListItem({
  channelId,
  partner,
  isMe,
  myCustomAvatar,
  unreadCount,
  index,
  onNavigate,
  onViewProfile,
}: DMListItemProps) {
  return (
    <div
      data-ocid={`messages.chat.item.${index}`}
      className="flex items-center border-b border-white/5 hover:bg-void-gold/5 transition-colors"
    >
      <button
        type="button"
        onClick={() => onNavigate(channelId)}
        className="flex-1 flex items-center gap-3 px-4 py-4 text-left min-w-0"
      >
        <div className="shrink-0">
          <VoidAvatar
            voidId={partner}
            size="md"
            customAvatarUrl={isMe ? myCustomAvatar : undefined}
          />
        </div>
        <div className="flex-1 min-w-0">
          <DMPartnerName voidId={partner} />
        </div>
        {unreadCount > 0 && (
          <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-red-500 text-white leading-none ml-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {!isMe && (
        <button
          type="button"
          data-ocid={`messages.chat.info.${index}`}
          onClick={() => onViewProfile(partner)}
          aria-label="View profile"
          className="shrink-0 mr-3 p-2.5 text-white/20 hover:text-void-gold/60 transition-colors"
          title="View profile"
        >
          <Info size={14} />
        </button>
      )}
    </div>
  );
});

// ─── Messages page ────────────────────────────────────────────────────────────

export default function Messages() {
  const navigate = useNavigate();
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
  // Local unread counts: chatId → count
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

  const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0);

  return (
    <div className="void-bg flex flex-col h-full">
      {/* Blocking Cosmic Handle modal — must be set before using the app */}
      {needsHandle && voidId && <CosmicHandleModal voidId={voidId} />}

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-void-gold/15 flex items-center justify-between shrink-0 bg-void-black/60">
        <div>
          <h1 className="text-void-gold font-bold tracking-wider text-lg flex items-center gap-2">
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

      {/* Search bar — opens New DM modal */}
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs tracking-wider uppercase transition-colors relative ${
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
              className="flex justify-center py-8"
            >
              <div className="text-white/30 text-sm animate-pulse">
                Loading channels...
              </div>
            </div>
          )}
          {!isLoading && dmChannels.length === 0 && (
            <div
              data-ocid="messages.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center px-6"
            >
              <MessageSquare size={40} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-2">
                No private channels yet.
              </p>
              <p className="text-white/20 text-xs">
                Start a conversation with another VOID ID.
              </p>
              <button
                type="button"
                data-ocid="messages.start.primary_button"
                onClick={() => setShowNewDM(true)}
                className="mt-6 void-btn-primary px-6 py-2.5 text-xs tracking-widest uppercase"
              >
                <Plus size={13} className="inline mr-1.5" />
                New Message
              </button>
            </div>
          )}
          {dmChannels.map((dm, idx) => {
            const channelId = getChannelId(dm);
            const partner = voidId
              ? getDMPartner(channelId, voidId)
              : channelId;
            const isMe = partner === voidId;
            const unread = unreadMap[channelId] ?? 0;
            return (
              <DMListItem
                key={channelId}
                channelId={channelId}
                partner={partner}
                isMe={isMe}
                myCustomAvatar={myCustomAvatar ?? undefined}
                unreadCount={unread}
                index={idx + 1}
                onNavigate={handleNavigateToChat}
                onViewProfile={handleViewProfile}
              />
            );
          })}
          {profileCardVoidId && (
            <UserProfileCard
              voidId={profileCardVoidId}
              onClose={() => setProfileCardVoidId(null)}
            />
          )}
        </div>
      )}

      {/* ── Groups tab ── */}
      {activeTab === "groups" && (
        <div className="flex-1 overflow-y-auto">
          {groupsLoading && (
            <div
              data-ocid="messages.groups.loading_state"
              className="flex justify-center py-8"
            >
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
              <Users size={40} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-2">No groups yet.</p>
              <p className="text-white/20 text-xs">
                Create one to start a group conversation.
              </p>
              <button
                type="button"
                data-ocid="messages.groups.start.primary_button"
                onClick={() => setShowNewGroup(true)}
                className="mt-6 void-btn-primary px-6 py-2.5 text-xs tracking-widest uppercase"
              >
                <Plus size={13} className="inline mr-1.5" />
                New Group
              </button>
            </div>
          )}
          {groups.map((group, idx) => (
            <button
              key={group.id}
              type="button"
              data-ocid={`messages.group.item.${idx + 1}`}
              onClick={() =>
                navigate({
                  to: "/groups/$groupId",
                  params: { groupId: encodeURIComponent(group.id) },
                })
              }
              className="w-full flex items-center gap-4 px-6 py-4 border-b border-white/5 hover:bg-void-gold/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-void-deep border border-void-gold/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,215,0,0.15)]">
                <Users size={16} className="text-void-gold/60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm truncate">
                  {group.name}
                </div>
                <div className="text-white/40 text-xs mt-0.5">
                  {group.members.length}{" "}
                  {group.members.length === 1 ? "member" : "members"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
