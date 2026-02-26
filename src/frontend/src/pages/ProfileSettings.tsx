import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import { useVoidId } from '../hooks/useVoidId';
import VoidAvatar from '../components/VoidAvatar';
import { getKeyFingerprint } from '../lib/crypto';
import { LogOut, Save, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettings() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: userProfile } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const voidId = useVoidId();
  const [cosmicHandle, setCosmicHandle] = useState(userProfile?.cosmicHandle ?? '');

  const handleSave = async () => {
    if (!voidId) return;
    await saveProfile({
      voidId,
      cosmicHandle: cosmicHandle.trim() || undefined,
    });
    toast.success('Profile updated', { description: 'Your cosmic identity has been saved.' });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: '/' });
  };

  const keyFingerprint = getKeyFingerprint();

  return (
    <div className="flex flex-col min-h-screen pt-14 md:pt-0 pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <h1 className="text-white font-bold tracking-wider text-lg">Profile</h1>
        <p className="text-white/30 text-xs">Your cosmic identity</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full">
        {/* Avatar + VOID ID */}
        <div className="flex flex-col items-center mb-10">
          <VoidAvatar voidId={voidId ?? ''} size="lg" className="mb-4" />
          <div className="text-void-gold/80 font-mono text-sm tracking-wider mb-1">{voidId}</div>
          <div className="text-white/30 text-xs">Your permanent anonymous identity</div>
        </div>

        {/* Cosmic Handle */}
        <div className="mb-8">
          <label className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2">
            Cosmic Handle
          </label>
          <input
            type="text"
            value={cosmicHandle}
            onChange={(e) => setCosmicHandle(e.target.value)}
            placeholder="@NebulaSage, @MayaBurner..."
            maxLength={32}
            className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors"
          />
          <p className="text-white/30 text-xs mt-1">
            Optional persistent name visible to others
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase mb-8 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isPending ? (
            <span className="w-4 h-4 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save Identity
        </button>

        {/* Security info */}
        <div className="space-y-4 mb-8">
          <div className="border border-void-gold/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-void-gold/60" />
              <span className="text-void-gold/60 text-xs uppercase tracking-widest">Privacy</span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              All messages are encrypted client-side before reaching the canister. The server never
              sees your plaintext.
            </p>
          </div>

          <div className="border border-void-gold/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key size={14} className="text-void-gold/60" />
              <span className="text-void-gold/60 text-xs uppercase tracking-widest">E2EE Key</span>
            </div>
            <p className="text-white/40 text-xs font-mono">{keyFingerprint}</p>
            <p className="text-white/30 text-xs mt-1">Stored locally · Never transmitted</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors text-sm tracking-widest uppercase"
        >
          <LogOut size={16} />
          Exit the Void
        </button>

        {/* Footer */}
        <div className="mt-12 text-center">
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
    </div>
  );
}
