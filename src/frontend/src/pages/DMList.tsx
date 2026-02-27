import { useNavigate } from '@tanstack/react-router';
import { useGetSortedDMs, useCreateDM, useGetCallerUserProfile } from '../hooks/useQueries';
import { useVoidId } from '../hooks/useVoidId';
import { useCustomAvatar } from '../hooks/useCustomAvatar';
import VoidAvatar from '../components/VoidAvatar';
import InviteModal from '../components/InviteModal';
import { MessageSquare, Plus, X, Share2, Copy, Check, Search, AtSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { type ChannelType } from '../backend';
import { searchKnownUsers, type KnownUser } from '../lib/userRegistry';
import { toast } from 'sonner';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDMPartner(channelId: string, myVoidId: string): string {
  // Channel format: DM-voidId1_voidId2
  const withoutPrefix = channelId.replace('DM-', '');
  const parts = withoutPrefix.split('_');
  const partner = parts.find((p) => !myVoidId.includes(p));
  return partner ? `@void_shadow_${partner}:canister` : channelId;
}

function getChannelId(channel: ChannelType): string {
  if (channel.__kind__ === 'dm') return channel.dm;
  return channel.__kind__;
}

/** Validate full VOID ID format: @void_shadow_xxxxxxxx:canister */
function isValidVoidId(id: string): boolean {
  return /^@void_shadow_[a-zA-Z0-9]+:canister$/.test(id.trim());
}

// ─── Search mode types ────────────────────────────────────────────────────────
type SearchTab = 'voidId' | 'handle';

// ─── NewDMModal component ─────────────────────────────────────────────────────
interface NewDMModalProps {
  voidId: string;
  onClose: () => void;
  onCreate: (targetVoidId: string) => Promise<void>;
  creating: boolean;
}

function NewDMModal({ voidId, onClose, onCreate, creating }: NewDMModalProps) {
  const [tab, setTab] = useState<SearchTab>('voidId');
  const [voidIdInput, setVoidIdInput] = useState('');
  const [handleInput, setHandleInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<KnownUser[]>([]);
  const [copied, setCopied] = useState(false);

  // Search by handle as user types
  useEffect(() => {
    if (tab !== 'handle') return;
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
        'Invalid VOID ID. Enter full ID like @void_shadow_abc12345:canister or just the short code.'
      );
      return;
    }
    setValidationError(null);
    await onCreate(trimmed);
  };

  const handleSelectUser = async (user: KnownUser) => {
    await onCreate(user.voidId);
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(voidId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Could not copy to clipboard');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      <div className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4 rounded-sm overflow-y-auto max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold tracking-wider">New Message</h2>
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
            <div className="text-void-gold/70 text-xs font-mono truncate flex-1">{voidId}</div>
            <button
              type="button"
              onClick={copyMyId}
              aria-label="Copy my VOID ID"
              className="shrink-0 flex items-center gap-1 text-xs text-void-gold/50 hover:text-void-gold transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-5 border border-void-gold/15 rounded-sm overflow-hidden">
          <button
            type="button"
            onClick={() => { setTab('voidId'); setValidationError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs tracking-wider uppercase transition-colors ${
              tab === 'voidId'
                ? 'bg-void-gold/10 text-void-gold border-r border-void-gold/15'
                : 'text-white/30 hover:text-white/60 border-r border-void-gold/10'
            }`}
          >
            <AtSign size={12} />
            VOID ID
          </button>
          <button
            type="button"
            onClick={() => { setTab('handle'); setValidationError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs tracking-wider uppercase transition-colors ${
              tab === 'handle'
                ? 'bg-void-gold/10 text-void-gold'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            <Search size={12} />
            By Handle
          </button>
        </div>

        {/* Tab: By VOID ID */}
        {tab === 'voidId' && (
          <div>
            <label htmlFor="dm-voidid-input" className="block text-white/40 text-xs mb-2">
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleVoidIdSubmit(); }}
              placeholder="@void_shadow_xxxxxxxx:canister or short code"
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm font-mono focus:outline-none focus:border-void-gold/50 mb-2 transition-colors"
            />
            {validationError && (
              <p className="text-red-400/80 text-xs mb-3 leading-relaxed">{validationError}</p>
            )}
            <button
              type="button"
              onClick={handleVoidIdSubmit}
              disabled={!voidIdInput.trim() || creating}
              className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50 mt-1"
            >
              {creating ? 'Opening channel...' : 'Open Channel'}
            </button>
          </div>
        )}

        {/* Tab: By Cosmic Handle */}
        {tab === 'handle' && (
          <div>
            <label htmlFor="dm-handle-input" className="block text-white/40 text-xs mb-2">
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
                No travelers found with that handle. They must first appear in a shared room.
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
                      {user.cosmicHandle && (
                        <div className="text-void-gold/80 text-sm font-semibold truncate">
                          {user.cosmicHandle}
                        </div>
                      )}
                      <div className="text-white/40 text-xs font-mono truncate">{user.voidId}</div>
                    </div>
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

// ─── DMList page ──────────────────────────────────────────────────────────────

export default function DMList() {
  const navigate = useNavigate();
  const { data: dms = [], isLoading } = useGetSortedDMs();
  const { mutateAsync: createDM, isPending: creating } = useCreateDM();
  const { data: _userProfile } = useGetCallerUserProfile();
  const voidId = useVoidId();
  const { avatarUrl: myCustomAvatar } = useCustomAvatar(voidId ?? null);
  const [showNewDM, setShowNewDM] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleCreateDM = async (targetVoidId: string) => {
    if (!voidId) return;
    if (targetVoidId === voidId) {
      toast.error('You cannot open a channel with yourself.');
      return;
    }
    try {
      const channelId = await createDM({ voidId1: voidId, voidId2: targetVoidId });
      if (!channelId) {
        toast.error('Failed to create channel. Try again.');
        return;
      }
      setShowNewDM(false);
      navigate({ to: '/dms/$channelId', params: { channelId: encodeURIComponent(channelId) } });
    } catch (err) {
      console.error('createDM error', err);
      toast.error('Could not open channel. Check the VOID ID and try again.');
    }
  };

  const dmChannels = dms.filter((d) => d.__kind__ === 'dm');

  return (
    <div className="void-bg flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold tracking-wider text-lg">Messages</h1>
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
          <button
            type="button"
            onClick={() => setShowNewDM(true)}
            className="void-btn-icon"
            title="New message"
          >
            <Plus size={18} />
          </button>
        </div>
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

      {/* Invite Modal */}
      <InviteModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        voidId={voidId ?? ''}
      />

      {/* DM list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="text-white/30 text-sm animate-pulse">Loading channels...</div>
          </div>
        )}

        {!isLoading && dmChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <MessageSquare size={40} className="text-white/10 mb-4" />
            <p className="text-white/30 text-sm mb-2">No private channels yet.</p>
            <p className="text-white/20 text-xs">
              Start a conversation with another VOID ID.
            </p>
          </div>
        )}

        {dmChannels.map((dm) => {
          const channelId = getChannelId(dm);
          const partner = voidId ? getDMPartner(channelId, voidId) : channelId;
          const isMe = partner === voidId;
          return (
            <button
              key={channelId}
              type="button"
              onClick={() =>
                navigate({
                  to: '/dms/$channelId',
                  params: { channelId: encodeURIComponent(channelId) },
                })
              }
              className="w-full flex items-center gap-4 px-6 py-4 border-b border-white/5 hover:bg-void-gold/5 transition-colors text-left"
            >
              <VoidAvatar
                voidId={partner}
                size="md"
                customAvatarUrl={isMe ? (myCustomAvatar ?? undefined) : undefined}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-sm font-medium truncate">{partner}</div>
                <div className="text-white/30 text-xs">Private channel · E2EE</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
