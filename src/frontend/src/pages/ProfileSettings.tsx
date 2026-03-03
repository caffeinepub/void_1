import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Camera,
  Heart,
  Key,
  LogOut,
  Save,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import PolarityGarden from "../components/PolarityGarden";
import VoidAvatar from "../components/VoidAvatar";
import { Switch } from "../components/ui/switch";
import { useCustomAvatar } from "../hooks/useCustomAvatar";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetUserNFTs,
  useGetWisdomScore,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { getKeyFingerprint } from "../lib/crypto";
import { registerKnownUser } from "../lib/userRegistry";

// ─── NFT category labels (local copy for profile display) ────────────────────
const NFT_CAT_LABELS: Record<string, string> = {
  lightWisdom: "Light Wisdom",
  deepShadow: "Deep Shadow",
  guidedBreathwork: "Breathwork",
  sageReflection: "Sage Reflection",
};

const NFT_CAT_COLORS: Record<string, string> = {
  lightWisdom: "rgba(255,215,0,0.8)",
  deepShadow: "rgba(142,45,226,0.8)",
  guidedBreathwork: "rgba(100,200,255,0.8)",
  sageReflection: "rgba(200,255,150,0.8)",
};

const BIO_MAX = 280;

interface BookmarkEntry {
  channel: string;
  messageId: string;
  ciphertext: string;
  timestamp: string;
}

function formatBookmarkChannel(channel: string): string {
  if (channel === "lightRoom") return "☀️ Light Room";
  if (channel === "darkRoom") return "🌑 Dark Room";
  if (channel.startsWith("dm_")) return "💬 DM";
  if (channel.startsWith("GROUP-")) return "👥 Group";
  return channel;
}

export default function ProfileSettings() {
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: userProfile } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const voidId = useVoidId();
  const { avatarUrl: customAvatar, setAvatar } = useCustomAvatar(
    voidId ?? null,
  );
  const { data: wisdomScore } = useGetWisdomScore(voidId ?? "");
  const { data: myNFTs = [] } = useGetUserNFTs(voidId ?? "");
  const score = wisdomScore ? Number(wisdomScore) : 0;

  const [cosmicHandle, setCosmicHandle] = useState(
    userProfile?.cosmicHandle ?? "",
  );
  const [bio, setBio] = useState("");
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
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

  // Load bookmarks from localStorage
  useEffect(() => {
    if (!voidId) return;
    try {
      const raw = localStorage.getItem(`void_bookmarks_${voidId}`);
      if (raw) {
        const parsed: BookmarkEntry[] = JSON.parse(raw);
        setBookmarks(parsed);
      }
    } catch {
      // fail silently
    }
  }, [voidId]);

  // Load notifications preference
  useEffect(() => {
    if (!voidId) return;
    try {
      const raw = localStorage.getItem(`void_notifications_${voidId}`);
      if (raw) setNotificationsEnabled(JSON.parse(raw) === true);
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
    try {
      localStorage.setItem(`void_bio_${voidId}`, bio.trim());
    } catch {
      // fail silently
    }
    await saveProfile({
      voidId,
      cosmicHandle: cosmicHandle.trim() || undefined,
    });
    registerKnownUser(voidId, cosmicHandle.trim() || null);
    toast.success("Profile updated", {
      description: "Your cosmic identity has been saved.",
    });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  /** Compress/resize a File to ~200×200 and return as base64 data URL */
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas not available"));
          return;
        }
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale;
        const sh = size / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load failed"));
      };
      img.src = url;
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    try {
      const base64 = await compressImage(file);
      setAvatar(base64);
      toast.success("Avatar updated");
    } catch {
      toast.error("Could not process image. Please try another file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      if ("Notification" in window) {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            toast.error("Notification permission denied");
            return;
          }
        } catch {
          // fall through — some browsers don't support requestPermission
        }
      }
    }
    setNotificationsEnabled(checked);
    try {
      localStorage.setItem(
        `void_notifications_${voidId}`,
        JSON.stringify(checked),
      );
    } catch {
      // fail silently
    }
    toast.success(checked ? "Notifications enabled" : "Notifications disabled");
  };

  const handleRemoveBookmark = (messageId: string) => {
    if (!voidId) return;
    try {
      const filtered = bookmarks.filter((b) => b.messageId !== messageId);
      setBookmarks(filtered);
      localStorage.setItem(
        `void_bookmarks_${voidId}`,
        JSON.stringify(filtered),
      );
    } catch {
      // fail silently
    }
  };

  const keyFingerprint = getKeyFingerprint();

  return (
    <div className="void-bg flex flex-col min-h-full">
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
            data-ocid="profile.upload_button"
            onClick={() => fileInputRef.current?.click()}
            className="relative mb-4 group cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-void-gold/60"
          >
            <VoidAvatar
              voidId={voidId ?? ""}
              size="lg"
              customAvatarUrl={customAvatar ?? undefined}
              className="w-20 h-20"
            />
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-void-black/70 opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_16px_rgba(255,215,0,0.5)]">
              <Camera size={22} className="text-void-gold" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {cosmicHandle.trim() ? (
            <>
              <div className="text-void-gold font-bold text-xl tracking-wide mb-1">
                @{cosmicHandle.trim().replace(/^@/, "")}
              </div>
              <div className="text-white/30 text-xs font-mono mb-1">
                {voidId}
              </div>
            </>
          ) : (
            <div className="text-void-gold/70 font-mono text-sm tracking-wider mb-1">
              {voidId}
            </div>
          )}
          <div className="text-white/25 text-xs">
            Tap avatar to change photo
          </div>
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
            data-ocid="profile.input"
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
              data-ocid="profile.textarea"
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
          <p className="text-white/30 text-xs mt-1">
            Stored locally · Never transmitted
          </p>
        </div>

        <button
          type="button"
          data-ocid="profile.save_button"
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

        {/* Wisdom Score */}
        <div
          className="mb-6 px-4 py-3 flex items-center gap-3"
          style={{
            background: "rgba(255,215,0,0.05)",
            border: "1px solid rgba(255,215,0,0.15)",
          }}
        >
          <Zap size={16} className="text-void-gold/50 shrink-0" />
          <div>
            <div className="text-void-gold/50 text-xs uppercase tracking-widest">
              Wisdom Score
            </div>
            <div className="text-void-gold font-bold font-mono text-lg mt-0.5">
              {score.toLocaleString()} WS
            </div>
          </div>
        </div>

        {/* Polarity Garden */}
        <div className="mb-8">
          <PolarityGarden wisdomScore={score} />
        </div>

        {/* ─── Saved Wisdom / Bookmarks ─────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-void-gold/60 text-xs uppercase tracking-widest flex items-center gap-2">
              <Heart size={12} /> Saved Wisdom
            </span>
            <span className="text-white/25 text-xs font-mono">
              {bookmarks.length} saved
            </span>
          </div>

          {bookmarks.length === 0 ? (
            <div
              data-ocid="profile.empty_state"
              className="px-4 py-6 text-center"
              style={{
                background: "rgba(255,215,0,0.03)",
                border: "1px solid rgba(255,215,0,0.08)",
              }}
            >
              <Heart size={18} className="text-void-gold/20 mx-auto mb-2" />
              <p className="text-white/25 text-xs leading-relaxed">
                Tap the ♡ on any wisdom post to save it here.
              </p>
            </div>
          ) : (
            <div
              data-ocid="profile.list"
              className="space-y-2 max-h-64 overflow-y-auto pr-1"
            >
              {bookmarks.map((bookmark, idx) => (
                <div
                  key={bookmark.messageId}
                  data-ocid={`profile.item.${idx + 1}`}
                  className="flex items-start gap-2 px-3 py-2.5 group"
                  style={{
                    background: "rgba(255,215,0,0.04)",
                    border: "1px solid rgba(255,215,0,0.1)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-void-gold/50 text-xs mb-0.5">
                      {formatBookmarkChannel(bookmark.channel)}
                    </div>
                    <p className="text-white/40 text-xs font-mono truncate">
                      {bookmark.ciphertext.slice(0, 40)}...
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid={`profile.delete_button.${idx + 1}`}
                    onClick={() => handleRemoveBookmark(bookmark.messageId)}
                    aria-label="Remove bookmark"
                    className="shrink-0 text-white/20 hover:text-red-400/60 transition-colors p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Notifications Toggle ─────────────────────────────────────── */}
        <div
          className="mb-6 flex items-center justify-between p-4 border border-void-gold/10"
          style={{ background: "rgba(255,215,0,0.03)" }}
        >
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-void-gold/60 shrink-0" />
            <div>
              <div className="text-void-gold/60 text-xs uppercase tracking-widest">
                Notifications
              </div>
              <div className="text-white/30 text-xs">
                New messages, daily reflection, NFT sales
              </div>
            </div>
          </div>
          <Switch
            data-ocid="profile.switch"
            checked={notificationsEnabled}
            onCheckedChange={handleToggleNotifications}
          />
        </div>

        {/* Cosmic NFT Collection */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-void-gold/60 text-xs uppercase tracking-widest">
              Cosmic Collection ✦
            </span>
            <span className="text-white/25 text-xs font-mono">
              {myNFTs.length} NFT{myNFTs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {myNFTs.length === 0 ? (
            <div
              className="px-4 py-6 text-center"
              style={{
                background: "rgba(255,215,0,0.03)",
                border: "1px solid rgba(255,215,0,0.08)",
              }}
            >
              <Sparkles size={20} className="text-void-gold/20 mx-auto mb-2" />
              <p className="text-white/25 text-xs leading-relaxed">
                Your wisdom NFTs will appear here as you mint them.
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {myNFTs.map((nft) => {
                const catKey = nft.category as unknown as string;
                const catColor =
                  NFT_CAT_COLORS[catKey] ?? "rgba(255,215,0,0.6)";
                return (
                  <div
                    key={nft.id.toString()}
                    className="shrink-0 w-36 p-3 flex flex-col gap-1.5"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(10,0,21,0.9), rgba(0,0,0,0.85))",
                      border: `1px solid ${catColor}33`,
                      boxShadow: `0 0 10px ${catColor}11`,
                    }}
                  >
                    <span
                      className="text-xs tracking-wide"
                      style={{ color: catColor }}
                    >
                      {NFT_CAT_LABELS[catKey] ?? catKey}
                    </span>
                    <p
                      className="text-xs italic leading-relaxed line-clamp-2"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      "{nft.postText}"
                    </p>
                    <div
                      className="flex items-center gap-1 text-xs font-mono mt-auto"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      <Sparkles size={9} />
                      {nft.resonanceCount.toString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security info */}
        <div className="space-y-4 mb-8">
          <div className="border border-void-gold/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-void-gold/60" />
              <span className="text-void-gold/60 text-xs uppercase tracking-widest">
                Privacy
              </span>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">
              All messages are encrypted client-side before reaching the
              canister. The server never sees your plaintext.
            </p>
          </div>

          <div className="border border-void-gold/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key size={14} className="text-void-gold/60" />
              <span className="text-void-gold/60 text-xs uppercase tracking-widest">
                E2EE Key
              </span>
            </div>
            <p className="text-white/40 text-xs font-mono">{keyFingerprint}</p>
            <p className="text-white/30 text-xs mt-1">
              Stored locally · Never transmitted
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          data-ocid="profile.delete_button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors text-sm tracking-widest uppercase"
        >
          <LogOut size={16} />
          Exit the Void
        </button>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-white/15 text-xs">
            © {new Date().getFullYear()} VOID · Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                window.location.hostname || "void-app",
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
