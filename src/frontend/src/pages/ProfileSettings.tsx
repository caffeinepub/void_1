import { useState, useEffect, useRef } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import { useVoidId } from '../hooks/useVoidId';
import { useCustomAvatar } from '../hooks/useCustomAvatar';
import VoidAvatar from '../components/VoidAvatar';
import { getKeyFingerprint } from '../lib/crypto';
import { LogOut, Save, Shield, Key, Camera } from 'lucide-react';
import { toast } from 'sonner';

const BIO_MAX = 280;

export default function ProfileSettings() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: userProfile } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const voidId = useVoidId();
  const { avatarUrl: customAvatar, setAvatar } = useCustomAvatar(voidId ?? null);

  const [cosmicHandle, setCosmicHandle] = useState(userProfile?.cosmicHandle ?? '');
  const [bio, setBio] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load bio from localStorage on mount
  useEffect(() => {
    if (!voidId) return;
    try {
      const stored = localStorage.getItem(`void_bio_${voidId}`);
      if (stored) setBio(stored);
    } catch {
      // fail silently
    }
  }, [voidId]);

  // Keep cosmicHandle in sync with loaded profile
  useEffect(() => {
    if (userProfile?.cosmicHandle) setCosmicHandle(userProfile.cosmicHandle);
  }, [userProfile?.cosmicHandle]);

  const handleSave = async () => {
    if (!voidId) return;
    // Save bio to localStorage
    try {
      localStorage.setItem(`void_bio_${voidId}`, bio.trim());
    } catch {
      // fail silently
    }
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

  /** Compress/resize a File to ~200×200 and return as base64 data URL */
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas not available'));
          return;
        }
        // Cover-crop to square
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale;
        const sh = size / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    try {
      const base64 = await compressImage(file);
      setAvatar(base64);
      toast.success('Avatar updated');
    } catch {
      toast.error('Could not process image. Please try another file.');
    }
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const keyFingerprint = getKeyFingerprint();

  return (
    <div className="void-bg flex flex-col min-h-screen pt-14 md:pt-0 pb-16 md:pb-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <h1 className="text-white font-bold tracking-wider text-lg">Profile</h1>
        <p className="text-white/30 text-xs">Your cosmic identity</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-lg mx-auto w-full">
        {/* Avatar upload circle */}
        <div className="flex flex-col items-center mb-10">
          <button
            type="button"
            aria-label="Change profile photo"
            onClick={() => fileInputRef.current?.click()}
            className="relative mb-4 group cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-void-gold/60"
          >
            <VoidAvatar
              voidId={voidId ?? ''}
              size="lg"
              customAvatarUrl={customAvatar ?? undefined}
              className="w-20 h-20"
            />
            {/* Camera overlay on hover */}
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-void-black/70 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_16px_rgba(255,215,0,0.5)]">
              <Camera size={22} className="text-void-gold" />
            </div>
          </button>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-void-gold/80 font-mono text-sm tracking-wider mb-1">{voidId}</div>
          <div className="text-white/30 text-xs">Tap avatar to change photo</div>
        </div>

        {/* Cosmic Handle */}
        <div className="mb-6">
          <label
            htmlFor="cosmic-handle"
            className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
          >
            Cosmic Handle
          </label>
          <input
            id="cosmic-handle"
            type="text"
            value={cosmicHandle}
            onChange={(e) => setCosmicHandle(e.target.value)}
            placeholder="@NebulaSage, @MayaBurner..."
            maxLength={32}
            className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors"
          />
          <p className="text-white/30 text-xs mt-1">Optional persistent name visible to others</p>
        </div>

        {/* Bio */}
        <div className="mb-8">
          <label
            htmlFor="bio-field"
            className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
          >
            Bio
          </label>
          <div className="relative">
            <textarea
              id="bio-field"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              placeholder="Describe your cosmic journey..."
              rows={3}
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors resize-none"
            />
            <span className="absolute bottom-2 right-3 text-white/25 text-xs font-mono">
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <p className="text-white/30 text-xs mt-1">Stored locally · Never transmitted</p>
        </div>

        <button
          type="button"
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
          type="button"
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
