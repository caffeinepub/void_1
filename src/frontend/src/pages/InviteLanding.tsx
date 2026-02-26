/**
 * InviteLanding — Landing page for /invite/:token
 * Resolves the invite token, shows VOID branding, allows login or DM creation.
 */
import { useParams, useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useResolveInviteToken, useCreateDM } from '../hooks/useQueries';
import { useVoidId } from '../hooks/useVoidId';
import { Loader2, LogIn, MessageSquare, Home } from 'lucide-react';

export default function InviteLanding() {
  const { token } = useParams({ from: '/invite/$token' });
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const voidId = useVoidId();
  const navigate = useNavigate();

  const { data: partnerVoidId, isLoading: resolving } = useResolveInviteToken(token ?? '');
  const { mutateAsync: createDM, isPending: creatingDM } = useCreateDM();

  const handleStartConversation = async () => {
    if (!voidId || !partnerVoidId) return;
    try {
      const channelId = await createDM({ voidId1: voidId, voidId2: partnerVoidId });
      navigate({ to: '/dms/$channelId', params: { channelId: encodeURIComponent(channelId) } });
    } catch (err) {
      console.error('Failed to create DM', err);
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (resolving) {
    return (
      <div className="void-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={28} className="text-void-gold/60 animate-spin" />
          <span className="text-white/30 text-sm font-mono">Opening the portal...</span>
        </div>
      </div>
    );
  }

  // ─── Invalid token ──────────────────────────────────────────────────────────
  if (!resolving && (partnerVoidId === null || partnerVoidId === undefined) && isAuthenticated) {
    return (
      <div className="void-bg min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center nebula-fade-in">
          <div className="text-5xl mb-6">🌑</div>
          <h1 className="text-white/70 text-xl font-bold tracking-wider mb-3">
            Portal Expired
          </h1>
          <p className="text-white/30 text-sm leading-relaxed mb-8">
            This portal has expired or is invalid. The void swallowed it.
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: '/light-room' })}
            className="void-btn-primary px-8 py-3 text-sm tracking-widest uppercase font-mono flex items-center gap-2 mx-auto"
          >
            <Home size={14} />
            Return to VOID
          </button>
        </div>
      </div>
    );
  }

  // ─── Not authenticated — show VOID branding + login CTA ─────────────────────
  if (!isAuthenticated) {
    return (
      <div className="void-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center nebula-fade-in space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img
              src="/assets/generated/void-logo.dim_256x256.png"
              alt="VOID"
              className="w-16 h-16 drop-shadow-[0_0_20px_rgba(255,215,0,0.4)]"
            />
            <h1 className="void-glow-text text-5xl font-black tracking-[0.4em]">VOID</h1>
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <p className="text-white/60 text-base leading-relaxed">
              A private sanctuary for truth, wisdom, and conscious conversation.
            </p>
            <p className="text-white/30 text-sm">
              End-to-end encrypted · No tracking · No noise
            </p>
          </div>

          {/* Sacred divider */}
          <div className="sacred-divider" />

          {/* Invite context */}
          <div
            className="px-6 py-4 text-center"
            style={{
              background: 'rgba(255,215,0,0.04)',
              border: '1px solid rgba(255,215,0,0.15)',
            }}
          >
            <p className="text-void-gold/60 text-xs tracking-[0.15em] uppercase font-mono mb-2">
              You've been invited
            </p>
            <p className="text-white/40 text-sm italic">
              "Join me in VOID – a private space for truth and wisdom."
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['🔒 E2EE', '👁️ Anonymous', '☀️ Light Room', '🌑 Dark Room', '💬 Private DMs'].map((pill) => (
              <span
                key={pill}
                className="px-3 py-1 text-xs font-mono text-white/30"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {pill}
              </span>
            ))}
          </div>

          {/* Login CTA */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => login()}
              disabled={isLoggingIn}
              className="void-btn-primary w-full max-w-xs py-4 text-sm tracking-[0.2em] uppercase font-mono flex items-center justify-center gap-3"
              style={{ boxShadow: '0 0 30px rgba(255,215,0,0.12)' }}
            >
              {isLoggingIn ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isLoggingIn ? 'Opening the void...' : 'Enter the Void'}
            </button>
            <p className="text-white/20 text-xs font-mono">
              Powered by Internet Identity · No email required
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authenticated — token resolved, show partner + DM CTA ─────────────────
  return (
    <div className="void-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full text-center nebula-fade-in space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.2), rgba(142,45,226,0.15))',
              border: '1px solid rgba(255,215,0,0.3)',
              boxShadow: '0 0 20px rgba(255,215,0,0.15)',
            }}
          >
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="void-glow-text text-3xl font-black tracking-[0.3em]">CONNECTION</h1>
        </div>

        {/* Partner void ID */}
        {partnerVoidId && (
          <div
            className="px-5 py-4"
            style={{
              background: 'rgba(255,215,0,0.04)',
              border: '1px solid rgba(255,215,0,0.15)',
            }}
          >
            <p className="text-white/30 text-xs font-mono tracking-wider mb-2 uppercase">
              Invited by
            </p>
            <p className="text-void-gold/80 text-sm font-mono break-all">
              {partnerVoidId}
            </p>
          </div>
        )}

        <p className="text-white/40 text-sm leading-relaxed">
          A traveler in the void wishes to connect with you. Start a private, encrypted conversation.
        </p>

        {/* Start Conversation CTA */}
        <button
          type="button"
          onClick={handleStartConversation}
          disabled={!partnerVoidId || creatingDM}
          className="void-btn-primary w-full py-4 text-sm tracking-[0.2em] uppercase font-mono flex items-center justify-center gap-3 disabled:opacity-50"
          style={{ boxShadow: '0 0 30px rgba(255,215,0,0.12)' }}
        >
          {creatingDM ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MessageSquare size={16} />
          )}
          {creatingDM ? 'Opening channel...' : 'Start Conversation'}
        </button>

        {/* Back to home */}
        <button
          type="button"
          onClick={() => navigate({ to: '/light-room' })}
          className="text-white/20 text-xs hover:text-white/40 transition-colors font-mono tracking-wider"
        >
          → Return to Light Room
        </button>
      </div>
    </div>
  );
}
