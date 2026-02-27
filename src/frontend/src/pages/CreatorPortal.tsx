/**
 * CreatorPortal — The Founder's Temple.
 * Admin-only portal for managing VOID: daily reflections, user directory, message pinning.
 */
import { useState, useEffect } from 'react';
import { Crown, Users, Pin, Radio, Save, Loader2, CheckCircle2, XCircle, Hexagon } from 'lucide-react';
import { toast } from 'sonner';
import {
  useIsCallerAdmin,
  useGetDailyReflection,
  useSetDailyReflection,
  useGetAllUserProfiles,
  usePinMessage,
  useGetPinnedMessage,
  useSaveCallerUserProfile,
  useGetCallerUserProfile,
} from '../hooks/useQueries';
import { useVoidId } from '../hooks/useVoidId';
import VoidAvatar from '../components/VoidAvatar';

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type PortalTab = 'identity' | 'reflection' | 'users' | 'pinning';

const TABS: { id: PortalTab; label: string; icon: React.ReactNode }[] = [
  { id: 'identity',   label: 'Identity',   icon: <Crown size={14} /> },
  { id: 'reflection', label: 'Reflection', icon: <Radio size={14} /> },
  { id: 'users',      label: 'Travelers',  icon: <Users size={14} /> },
  { id: 'pinning',    label: 'Transmit',   icon: <Pin size={14} /> },
];

// ─── Not Authorized screen ────────────────────────────────────────────────────
function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center px-6 py-16">
      <XCircle size={48} className="text-red-500/40 mb-4" />
      <h2 className="text-white/60 text-lg font-bold tracking-wider mb-2">Access Denied</h2>
      <p className="text-white/30 text-sm max-w-xs leading-relaxed">
        The Creator Portal is restricted to the Void founder only. Your identity does not hold the
        necessary scroll.
      </p>
    </div>
  );
}

// ─── Section: Creator Identity ────────────────────────────────────────────────
function IdentitySection() {
  const voidId = useVoidId();
  const { data: userProfile } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const [handle, setHandle] = useState(userProfile?.cosmicHandle ?? '');

  // Sync handle from profile when loaded
  useEffect(() => {
    if (userProfile?.cosmicHandle) setHandle(userProfile.cosmicHandle);
  }, [userProfile?.cosmicHandle]);

  const handleSave = async () => {
    if (!voidId) return;
    try {
      await saveProfile({ voidId, cosmicHandle: handle.trim() || undefined });
      toast.success('Identity sealed', { description: 'Your cosmic handle has been updated.' });
    } catch {
      toast.error('Failed to save identity');
    }
  };

  return (
    <div className="space-y-8 nebula-fade-in">
      {/* Creator badge */}
      <div className="flex flex-col items-center pt-4 pb-8 border-b border-void-gold/10">
        <div className="relative mb-4">
          <VoidAvatar voidId={voidId ?? ''} size="lg" />
          {/* Crown overlay */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-void-black border border-void-gold/40 rounded-full flex items-center justify-center">
            <Crown size={11} className="text-void-gold" />
          </div>
        </div>

        {/* CREATOR badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 border border-void-gold/30 bg-void-gold/8 mb-3">
          <Hexagon size={10} className="text-void-gold fill-void-gold/20" />
          <span className="text-void-gold text-xs font-bold tracking-[0.3em] uppercase">Creator</span>
          <Hexagon size={10} className="text-void-gold fill-void-gold/20" />
        </div>

        {/* VOID ID */}
        <p className="text-void-gold/70 font-mono text-xs tracking-wider mb-1">{voidId}</p>
        <p className="text-white/25 text-xs">Founder of the Void</p>
      </div>

      {/* Cosmic Handle editor */}
      <div>
        <label
          htmlFor="cosmic-handle"
          className="block text-void-gold/50 text-xs uppercase tracking-widest mb-2"
        >
          Cosmic Handle
        </label>
        <input
          id="cosmic-handle"
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@VoidFounder, @OmnismSage..."
          maxLength={32}
          className="w-full bg-void-black/60 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors font-mono"
        />
        <p className="text-white/25 text-xs mt-1.5">Visible to other travelers as your identity</p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        Seal Identity
      </button>
    </div>
  );
}

// ─── Section: Daily Reflection Editor ─────────────────────────────────────────
function ReflectionSection() {
  const { data: current, isLoading } = useGetDailyReflection();
  const { mutateAsync: setReflection, isPending } = useSetDailyReflection();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  // Pre-fill with current reflection when loaded
  useEffect(() => {
    if (current) setText(current);
  }, [current]);

  const handleTransmit = async () => {
    if (!text.trim()) {
      toast.error('Reflection cannot be empty');
      return;
    }
    try {
      await setReflection(text.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success('Transmitted to the Void', {
        description: 'All travelers will see your reflection.',
      });
    } catch {
      toast.error('Transmission failed');
    }
  };

  return (
    <div className="space-y-6 nebula-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio size={14} className="text-void-gold/60" />
          <span className="text-void-gold/60 text-xs uppercase tracking-widest">Daily Void Reflection</span>
        </div>
        <p className="text-white/30 text-xs leading-relaxed">
          This prompt appears on the splash screen for all travelers entering the Void each day. Make
          it resonate with the eternal question between light and illusion.
        </p>
      </div>

      {/* Current reflection display */}
      {!isLoading && current && (
        <div className="px-4 py-3 border border-void-gold/15 bg-void-gold/4">
          <p className="text-void-gold/40 text-xs uppercase tracking-widest mb-1">Currently active</p>
          <p className="text-white/50 text-sm italic">"{current}"</p>
        </div>
      )}

      {/* Textarea */}
      <div>
        <label
          htmlFor="daily-reflection"
          className="block text-void-gold/50 text-xs uppercase tracking-widest mb-2"
        >
          New Reflection
        </label>
        <textarea
          id="daily-reflection"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={280}
          placeholder="What truth are you afraid to face in the light of the void?"
          className="w-full bg-void-black/60 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/60 transition-colors resize-none leading-relaxed"
          style={{
            boxShadow: text.length > 0 ? '0 0 12px rgba(255,215,0,0.04)' : 'none',
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-white/20 text-xs">{text.length}/280</span>
          {saved && (
            <span className="flex items-center gap-1 text-green-400/70 text-xs">
              <CheckCircle2 size={11} />
              Transmitted
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleTransmit}
        disabled={isPending || !text.trim()}
        className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Radio size={16} />
        )}
        Transmit to the Void
      </button>
    </div>
  );
}

// ─── Section: User Directory ──────────────────────────────────────────────────
function UsersSection() {
  const { data: profiles = [], isLoading } = useGetAllUserProfiles();

  return (
    <div className="space-y-4 nebula-fade-in">
      {/* Count header */}
      <div className="flex items-center gap-3">
        <Users size={14} className="text-void-gold/60" />
        <span className="text-void-gold/60 text-xs uppercase tracking-widest">
          Travelers in the Void
        </span>
        <span className="ml-auto px-2 py-0.5 border border-void-gold/20 bg-void-gold/8 text-void-gold text-xs font-mono">
          {isLoading ? '—' : profiles.length}
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Reading the void registry...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && profiles.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-white/20 text-sm">No travelers have entered the void yet.</p>
        </div>
      )}

      {/* User list */}
      {!isLoading && profiles.length > 0 && (
        <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
          {profiles.map((profile) => (
            <div
              key={profile.voidId}
              className="flex items-center gap-3 px-3 py-3 border border-void-gold/8 bg-void-gold/3 hover:bg-void-gold/6 transition-colors"
            >
              <VoidAvatar voidId={profile.voidId} size="sm" />
              <div className="min-w-0 flex-1">
                {profile.cosmicHandle && (
                  <p className="text-white/80 text-sm font-medium truncate">
                    {profile.cosmicHandle}
                  </p>
                )}
                <p className="text-void-gold/40 text-xs font-mono truncate">
                  {profile.voidId}
                </p>
              </div>
              {/* Wisdom score placeholder */}
              <span className="shrink-0 text-void-gold/20 text-xs font-mono">—</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Message Pinning ─────────────────────────────────────────────────
type PinChannel = 'lightRoom' | 'darkRoom';

function PinningSection() {
  const [activeChannel, setActiveChannel] = useState<PinChannel>('lightRoom');
  const [messageId, setMessageId] = useState('');

  const { mutateAsync: pinMessage, isPending } = usePinMessage();
  const { data: pinnedLight } = useGetPinnedMessage('lightRoom');
  const { data: pinnedDark } = useGetPinnedMessage('darkRoom');

  const currentPinned = activeChannel === 'lightRoom' ? pinnedLight : pinnedDark;
  const isLightRoom = activeChannel === 'lightRoom';

  const handlePin = async () => {
    if (!messageId.trim()) {
      toast.error('Message ID cannot be empty');
      return;
    }
    try {
      await pinMessage({ channel: activeChannel, messageId: messageId.trim() });
      setMessageId('');
      toast.success('Message pinned as Void Transmission', {
        description: `Pinned in ${isLightRoom ? 'Light Room' : 'Dark Room'}.`,
      });
    } catch {
      toast.error('Pinning failed');
    }
  };

  return (
    <div className="space-y-6 nebula-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Pin size={14} className="text-void-gold/60" />
          <span className="text-void-gold/60 text-xs uppercase tracking-widest">Void Transmissions</span>
        </div>
        <p className="text-white/30 text-xs leading-relaxed">
          Pin any message in a room as an official Void Transmission. It appears as a golden banner
          at the top of the room for all travelers.
        </p>
      </div>

      {/* Room tabs */}
      <div className="flex">
        {(['lightRoom', 'darkRoom'] as PinChannel[]).map((ch) => {
          const isActive = activeChannel === ch;
          const isLight = ch === 'lightRoom';
          return (
            <button
              key={ch}
              type="button"
              onClick={() => setActiveChannel(ch)}
              className="flex-1 py-2.5 text-xs tracking-widest uppercase transition-all"
              style={{
                borderBottom: isActive
                  ? `2px solid ${isLight ? 'rgba(255,215,0,0.7)' : 'rgba(142,45,226,0.7)'}`
                  : '2px solid rgba(255,255,255,0.05)',
                color: isActive
                  ? isLight ? 'rgba(255,215,0,0.9)' : 'rgba(178,102,255,0.9)'
                  : 'rgba(255,255,255,0.3)',
                background: isActive
                  ? isLight ? 'rgba(255,215,0,0.04)' : 'rgba(142,45,226,0.04)'
                  : 'transparent',
              }}
            >
              {isLight ? '☀️' : '🌑'} {isLight ? 'Light Room' : 'Dark Room'}
            </button>
          );
        })}
      </div>

      {/* Current pinned message */}
      {currentPinned && (
        <div
          className="px-4 py-3 border"
          style={{
            borderColor: isLightRoom ? 'rgba(255,215,0,0.2)' : 'rgba(142,45,226,0.2)',
            background: isLightRoom ? 'rgba(255,215,0,0.04)' : 'rgba(142,45,226,0.04)',
          }}
        >
          <p className="text-xs uppercase tracking-widest mb-1"
             style={{ color: isLightRoom ? 'rgba(255,215,0,0.5)' : 'rgba(178,102,255,0.5)' }}>
            Currently pinned
          </p>
          <p className="text-white/50 text-xs font-mono break-all">{currentPinned.id}</p>
        </div>
      )}

      {/* Message ID input */}
      <div>
        <label
          htmlFor="pin-message-id"
          className="block text-void-gold/50 text-xs uppercase tracking-widest mb-2"
        >
          Message ID to Pin
        </label>
        <input
          id="pin-message-id"
          type="text"
          value={messageId}
          onChange={(e) => setMessageId(e.target.value)}
          placeholder="msg_xxxxxxxx..."
          className="w-full bg-void-black/60 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors font-mono"
        />
        <p className="text-white/20 text-xs mt-1.5">
          Copy a message ID from the room to pin it as a Void Transmission
        </p>
      </div>

      <button
        type="button"
        onClick={handlePin}
        disabled={isPending || !messageId.trim()}
        className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          borderColor: isLightRoom ? 'rgba(255,215,0,0.4)' : 'rgba(142,45,226,0.4)',
          color: isLightRoom ? '#FFD700' : 'rgba(178,102,255,0.9)',
        }}
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Pin size={16} />
        )}
        Pin as Void Transmission
      </button>
    </div>
  );
}

// ─── Main Creator Portal ──────────────────────────────────────────────────────
export default function CreatorPortal() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState<PortalTab>('identity');

  // Loading state while checking admin status
  if (checkingAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-16">
        <div className="flex items-center gap-2 text-void-gold/50 text-sm animate-pulse">
          <Loader2 size={16} className="animate-spin" />
          Verifying creator credentials...
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <NotAuthorized />;
  }

  return (
    <div className="void-bg flex flex-col min-h-full">
      {/* Page Header */}
      <div
        className="px-6 py-5 border-b"
        style={{
          borderColor: 'rgba(255,215,0,0.12)',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(74,0,255,0.04) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center border"
            style={{
              borderColor: 'rgba(255,215,0,0.3)',
              background: 'rgba(255,215,0,0.08)',
              boxShadow: '0 0 16px rgba(255,215,0,0.1)',
            }}
          >
            <Crown size={18} className="text-void-gold" />
          </div>
          <div>
            <h1 className="void-glow-text text-lg font-black tracking-[0.2em] uppercase">
              Creator Portal
            </h1>
            <p className="text-white/30 text-xs tracking-wider">The Founder's Temple · Admin Only</p>
          </div>
        </div>
      </div>

      {/* Sacred geometry divider */}
      <div className="sacred-divider" />

      {/* Tab Bar */}
      <div className="flex border-b border-void-gold/8 overflow-x-auto shrink-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-5 py-3 text-xs tracking-widest uppercase whitespace-nowrap transition-all"
              style={{
                borderBottom: isActive ? '2px solid rgba(255,215,0,0.7)' : '2px solid transparent',
                color: isActive ? 'rgba(255,215,0,0.9)' : 'rgba(255,255,255,0.3)',
                background: isActive ? 'rgba(255,215,0,0.03)' : 'transparent',
              }}
            >
              <span style={{ color: isActive ? 'rgba(255,215,0,0.7)' : 'rgba(255,255,255,0.25)' }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto w-full px-6 py-8">
          {activeTab === 'identity'   && <IdentitySection />}
          {activeTab === 'reflection' && <ReflectionSection />}
          {activeTab === 'users'      && <UsersSection />}
          {activeTab === 'pinning'    && <PinningSection />}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-void-gold/6 text-center">
        <p className="text-white/15 text-xs">
          © {new Date().getFullYear()} VOID · Built with ♥ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              window.location.hostname || 'void-app'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-void-gold/30 hover:text-void-gold/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
