import { useNavigate } from '@tanstack/react-router';
import { useGetSortedDMs, useCreateDM, useGetCallerUserProfile } from '../hooks/useQueries';
import { useVoidId } from '../hooks/useVoidId';
import VoidAvatar from '../components/VoidAvatar';
import InviteModal from '../components/InviteModal';
import { MessageSquare, Plus, X, Share2 } from 'lucide-react';
import { useState } from 'react';
import { type ChannelType } from '../backend';

function getDMPartner(channelId: string, myVoidId: string): string {
  // Channel format: DM-voidId1_voidId2
  const withoutPrefix = channelId.replace('DM-', '');
  const parts = withoutPrefix.split('_');
  // Find the part that isn't our voidId
  const partner = parts.find((p) => !myVoidId.includes(p));
  return partner ? `@void_shadow_${partner}:canister` : channelId;
}

function getChannelId(channel: ChannelType): string {
  if (channel.__kind__ === 'dm') return channel.dm;
  return channel.__kind__;
}

export default function DMList() {
  const navigate = useNavigate();
  const { data: dms = [], isLoading } = useGetSortedDMs();
  const { mutateAsync: createDM, isPending: creating } = useCreateDM();
  const { data: _userProfile } = useGetCallerUserProfile();
  const voidId = useVoidId();
  const [showNewDM, setShowNewDM] = useState(false);
  const [targetVoidId, setTargetVoidId] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  const handleCreateDM = async () => {
    if (!voidId || !targetVoidId.trim()) return;
    const channelId = await createDM({ voidId1: voidId, voidId2: targetVoidId.trim() });
    setShowNewDM(false);
    setTargetVoidId('');
    navigate({ to: '/dms/$channelId', params: { channelId: encodeURIComponent(channelId) } });
  };

  const dmChannels = dms.filter((d) => d.__kind__ === 'dm');

  return (
    <div className="flex flex-col h-screen pt-14 md:pt-0 pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold tracking-wider text-lg">Messages</h1>
          <p className="text-white/30 text-xs">Private · E2EE</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setInviteOpen(true)} className="void-btn-icon" title="Invite friends">
            <Share2 size={16} />
          </button>
          <button type="button" onClick={() => setShowNewDM(true)} className="void-btn-icon">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* New DM modal */}
      {showNewDM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
          <div className="bg-void-deep border border-void-gold/20 p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold tracking-wider">New Message</h2>
              <button
                type="button"
                onClick={() => setShowNewDM(false)}
                className="text-white/30 hover:text-white/60"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mb-2 text-white/40 text-xs">Your VOID ID: {voidId}</div>
            <input
              type="text"
              value={targetVoidId}
              onChange={(e) => setTargetVoidId(e.target.value)}
              placeholder="@void_shadow_xxxxxxxx:canister"
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 mb-4"
            />
            <button
              type="button"
              onClick={handleCreateDM}
              disabled={!targetVoidId.trim() || creating}
              className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50"
            >
              {creating ? 'Opening channel...' : 'Open Channel'}
            </button>
          </div>
        </div>
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
              <VoidAvatar voidId={partner} size="md" />
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
