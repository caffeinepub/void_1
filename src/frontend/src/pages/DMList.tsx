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
import { useEffect, useState } from "react";
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
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import {
  type KnownUser,
  getCachedHandle,
  registerKnownUser,
  searchKnownUsers,
} from "../lib/userRegistry";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDMPartner(channelId: string, myVoidId: string): string {
  // Channel format: DM-voidId1_voidId2
  const withoutPrefix = channelId.replace("DM-", "");
  const parts = withoutPrefix.split("_");
  const partner = parts.find((p) => !myVoidId.includes(p));
  return partner ? `@void_shadow_${partner}:canister` : channelId;
}

function getChannelId(channel: ChannelType): string {
  if (channel.__kind__ === "dm") return channel.dm;
  return channel.__kind__;
}

/** Validate full VOID ID format: @void_shadow_xxxxxxxx:canister */
function isValidVoidId(id: string): boolean {
  return /^@void_shadow_[a-zA-Z0-9]+:canister$/.test(id.trim());
}

// ─── Search mode types ────────────────────────────────────────────────────────
type SearchTab = "voidId" | "handle";

// ─── NewDMModal component ─────────────────────────────────────────────────────
interface NewDMModalProps {
  voidId: string;
  onClose: () => void;
  onCreate: (targetVoidId: string) => Promise<void>;
  creating: boolean;
}

function NewDMModal({ voidId, onClose, onCreate, creating }: NewDMModalProps) {
  const [tab, setTab] = useState<SearchTab>("voidId");
  const [voidIdInput, setVoidIdInput] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<KnownUser[]>([]);
  const [copied, setCopied] = useState(false);
  // Profile preview for search results
  const [previewVoidId, setPreviewVoidId] = useState<string | null>(null);

  // Search by handle as user types
  useEffect(() => {
    if (tab !== "handle") return;
    if (!handleInput.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchResults(searchKnownUsers(handleInput));
  }, [handleInput, tab]);

  const handleVoidIdSubmit = async () => {
    let trimmed = voidIdInput.trim();
    // Auto-complete shorthand hex ID to full VOID ID format
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
    // Show profile preview first
    setPreviewVoidId(trimmed);
  };

  const handleSelectUser = (user: KnownUser) => {
    // Show profile preview before opening DM
    setPreviewVoidId(user.voidId);
  };

  const copyMyId = () => {
    navigator.clipboard
      .writeText(voidId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Could not copy to clipboard");
      });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
        <div className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4 rounded-sm overflow-y-auto max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold tracking-wider">
              New Message
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* My VOID ID + copy */}
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

          {/* Tab: By VOID ID */}
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
                value={voidIdInput}
                onChange={(e) => {
                  setVoidIdInput(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVoidIdSubmit();
                }}
                placeholder="@void_shadow_xxxxxxxx:canister or short code"
                className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm font-mono focus:outline-none focus:border-void-gold/50 mb-2 transition-colors"
              />
              {validationError && (
                <p className="text-red-400/80 text-xs mb-3 leading-relaxed">
                  {validationError}
                </p>
              )}
              <button
                type="button"
                onClick={handleVoidIdSubmit}
                disabled={!voidIdInput.trim() || creating}
                className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50 mt-1"
              >
                {creating ? "Opening channel..." : "View Profile & Message"}
              </button>
            </div>
          )}

          {/* Tab: By Cosmic Handle */}
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
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                placeholder="Search @CosmicHandle..."
                className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 mb-2 transition-colors"
              />

              {/* Results */}
              {handleInput.trim() && searchResults.length === 0 && (
                <p className="text-white/30 text-xs text-center py-4">
                  No travelers found with that handle. They must first appear in
                  a shared room.
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="border border-void-gold/10 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.voidId}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      disabled={creating}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-void-gold/5 border-b border-white/5 last:border-0 text-left transition-colors disabled:opacity-50"
                    >
                      <UserSearchAvatar voidId={user.voidId} />
                      <div className="flex-1 min-w-0">
                        {/* Handle as main title */}
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

      {/* Profile preview modal — shown when user clicks a search result */}
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
}

// ─── NewGroupModal component ──────────────────────────────────────────────────
interface NewGroupModalProps {
  voidId: string;
  onClose: () => void;
}

function NewGroupModal({ voidId, onClose }: NewGroupModalProps) {
  const { mutateAsync: createGroup, isPending: creating } = useCreateGroup();
  const { mutateAsync: addMember } = useAddGroupMember();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [membersInput, setMembersInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = groupName.trim();
    if (!name) {
      setError("Group name is required.");
      return;
    }
    setError(null);
    try {
      const groupId = await createGroup({ name, creatorVoidId: voidId });

      // Add extra members if provided
      if (membersInput.trim()) {
        const memberIds = membersInput
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);

        await Promise.all(
          memberIds.map((memberId) => {
            let id = memberId;
            // Auto-complete short hex code
            if (/^[a-zA-Z0-9]{6,16}$/.test(id)) {
              id = `@void_shadow_${id}:canister`;
            }
            return addMember({ groupId, memberVoidId: id }).catch(() => {
              // Non-fatal — log but don't block navigation
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4 rounded-sm overflow-y-auto max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-void-gold/60" />
            <h2 className="text-white font-semibold tracking-wider">
              New Group
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Group name */}
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
          />
          {error && <p className="text-red-400/80 text-xs mt-1.5">{error}</p>}
        </div>

        {/* Members */}
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
            value={membersInput}
            onChange={(e) => setMembersInput(e.target.value)}
            placeholder="VOID IDs separated by commas&#10;e.g. abc12345, def67890"
            rows={3}
            className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-xs font-mono focus:outline-none focus:border-void-gold/50 resize-none transition-colors"
          />
          <p className="text-white/20 text-xs mt-1">
            Short codes or full VOID IDs, comma-separated.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={!groupName.trim() || creating}
          className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
}

/** Shows the partner's cosmic handle (or short VOID ID) in the DM list */
function DMPartnerName({ voidId }: { voidId: string }) {
  const cachedHandle = getCachedHandle(voidId);
  const { data: fetchedHandle } = useGetCosmicHandle(voidId);

  useEffect(() => {
    if (fetchedHandle) registerKnownUser(voidId, fetchedHandle);
  }, [fetchedHandle, voidId]);

  const handle = fetchedHandle ?? cachedHandle;
  const shortId = voidId.replace("@void_shadow_", "").replace(":canister", "");

  return (
    <div>
      {/* Cosmic handle as main bold title */}
      <div className="text-void-gold font-bold text-sm truncate">
        {handle ? `@${handle.replace(/^@/, "")}` : `void_${shortId}`}
      </div>
      {/* VOID ID as small subtitle (only shown when handle exists) */}
      {handle && (
        <div className="text-white/30 text-xs font-mono truncate mt-0.5">
          @void_{shortId}
        </div>
      )}
    </div>
  );
}

/** Small avatar used inside the search results dropdown */
function UserSearchAvatar({ voidId }: { voidId: string }) {
  const storageKey = `void_avatar_${voidId}`;
  let customUrl: string | undefined;
  try {
    customUrl = localStorage.getItem(storageKey) ?? undefined;
  } catch {
    customUrl = undefined;
  }
  return <VoidAvatar voidId={voidId} size="sm" customAvatarUrl={customUrl} />;
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type ListTab = "dms" | "groups";

// ─── DMList page ──────────────────────────────────────────────────────────────

export default function DMList() {
  const navigate = useNavigate();
  const { data: dms = [], isLoading } = useGetSortedDMs();
  const { mutateAsync: createDM, isPending: creating } = useCreateDM();
  const { data: _userProfile } = useGetCallerUserProfile();
  const voidId = useVoidId();
  const { avatarUrl: myCustomAvatar } = useCustomAvatar(voidId ?? null);
  const [activeTab, setActiveTab] = useState<ListTab>("dms");
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  // Profile card state for DM list entries
  const [profileCardVoidId, setProfileCardVoidId] = useState<string | null>(
    null,
  );

  // Groups data
  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsForVoidId(
    voidId ?? "",
  );

  const handleCreateDM = async (targetVoidId: string) => {
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
  };

  const dmChannels = dms.filter((d) => d.__kind__ === "dm");

  return (
    <div className="void-bg flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-white font-bold tracking-wider text-lg">
            Messages
          </h1>
          <p className="text-white/30 text-xs">Private · E2EE</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="void-btn-icon"
            title="Invite friends"
          >
            <Share2 size={16} />
          </button>
          {activeTab === "dms" && (
            <button
              type="button"
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
              onClick={() => setShowNewGroup(true)}
              className="void-btn-icon"
              title="New group"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("dms")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs tracking-wider uppercase transition-colors ${
            activeTab === "dms"
              ? "text-void-gold border-b-2 border-void-gold bg-void-gold/5"
              : "text-white/30 hover:text-white/60"
          }`}
        >
          <MessageSquare size={13} />
          Direct Messages
        </button>
        <button
          type="button"
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

      {/* New DM modal */}
      {showNewDM && voidId && (
        <NewDMModal
          voidId={voidId}
          onClose={() => setShowNewDM(false)}
          onCreate={handleCreateDM}
          creating={creating}
        />
      )}

      {/* New Group modal */}
      {showNewGroup && voidId && (
        <NewGroupModal voidId={voidId} onClose={() => setShowNewGroup(false)} />
      )}

      {/* Invite Modal */}
      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        voidId={voidId ?? ""}
      />

      {/* ── Direct Messages tab ── */}
      {activeTab === "dms" && (
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="text-white/30 text-sm animate-pulse">
                Loading channels...
              </div>
            </div>
          )}

          {!isLoading && dmChannels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <MessageSquare size={40} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-2">
                No private channels yet.
              </p>
              <p className="text-white/20 text-xs">
                Start a conversation with another VOID ID.
              </p>
            </div>
          )}

          {dmChannels.map((dm) => {
            const channelId = getChannelId(dm);
            const partner = voidId
              ? getDMPartner(channelId, voidId)
              : channelId;
            const isMe = partner === voidId;
            return (
              <div
                key={channelId}
                className="flex items-center border-b border-white/5 hover:bg-void-gold/5 transition-colors"
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/dms/$channelId",
                      params: { channelId: encodeURIComponent(channelId) },
                    })
                  }
                  className="flex-1 flex items-center gap-4 px-6 py-4 text-left min-w-0"
                >
                  <VoidAvatar
                    voidId={partner}
                    size="md"
                    customAvatarUrl={
                      isMe ? (myCustomAvatar ?? undefined) : undefined
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <DMPartnerName voidId={partner} />
                  </div>
                </button>
                {/* View profile icon button */}
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => setProfileCardVoidId(partner)}
                    aria-label="View profile"
                    className="shrink-0 mr-4 p-2 text-white/20 hover:text-void-gold/60 transition-colors"
                    title="View profile"
                  >
                    <Info size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Profile card for DM partner */}
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
            <div className="flex justify-center py-8">
              <div className="text-white/30 text-sm animate-pulse">
                Loading groups...
              </div>
            </div>
          )}

          {!groupsLoading && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Users size={40} className="text-white/10 mb-4" />
              <p className="text-white/30 text-sm mb-2">No groups yet.</p>
              <p className="text-white/20 text-xs">
                Create one to start a group conversation.
              </p>
              <button
                type="button"
                onClick={() => setShowNewGroup(true)}
                className="mt-6 void-btn-primary px-6 py-2.5 text-xs tracking-widest uppercase"
              >
                <Plus size={13} className="inline mr-1.5" />
                New Group
              </button>
            </div>
          )}

          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() =>
                navigate({
                  to: "/groups/$groupId",
                  params: { groupId: encodeURIComponent(group.id) },
                })
              }
              className="w-full flex items-center gap-4 px-6 py-4 border-b border-white/5 hover:bg-void-gold/5 transition-colors text-left"
            >
              {/* Group icon */}
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
