import {
  CheckCircle2,
  Crown,
  Hexagon,
  Loader2,
  Mail,
  Pin,
  Radio,
  Save,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
/**
 * CreatorPortal — The Founder's Temple.
 * Admin-only portal for managing VOID: daily reflections, user directory,
 * message pinning, content moderation, newsletter.
 */
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import VoidAvatar from "../components/VoidAvatar";
import {
  useGetAllUserProfiles,
  useGetCallerUserProfile,
  useGetDailyReflection,
  useGetPinnedMessage,
  useIsCallerAdmin,
  usePinMessage,
  useSaveCallerUserProfile,
  useSetDailyReflection,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type PortalTab =
  | "identity"
  | "reflection"
  | "users"
  | "pinning"
  | "moderation"
  | "newsletter";

const TABS: { id: PortalTab; label: string; icon: ReactNode }[] = [
  { id: "identity", label: "Identity", icon: <Crown size={14} /> },
  { id: "reflection", label: "Reflection", icon: <Radio size={14} /> },
  { id: "users", label: "Travelers", icon: <Users size={14} /> },
  { id: "pinning", label: "Transmit", icon: <Pin size={14} /> },
  { id: "moderation", label: "Moderate", icon: <Shield size={14} /> },
  { id: "newsletter", label: "Newsletter", icon: <Mail size={14} /> },
];

// ─── Not Authorized screen ────────────────────────────────────────────────────
function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full text-center px-6 py-16">
      <XCircle size={48} className="text-red-500/40 mb-4" />
      <h2 className="text-white/60 text-lg font-bold tracking-wider mb-2">
        Access Denied
      </h2>
      <p className="text-white/30 text-sm max-w-xs leading-relaxed">
        The Creator Portal is restricted to the Void founder only. Your identity
        does not hold the necessary scroll.
      </p>
    </div>
  );
}

// ─── Section: Creator Identity ────────────────────────────────────────────────
function IdentitySection() {
  const voidId = useVoidId();
  const { data: userProfile } = useGetCallerUserProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();
  const [handle, setHandle] = useState(userProfile?.cosmicHandle ?? "");

  useEffect(() => {
    if (userProfile?.cosmicHandle) setHandle(userProfile.cosmicHandle);
  }, [userProfile?.cosmicHandle]);

  const handleSave = async () => {
    if (!voidId) return;
    try {
      await saveProfile({ voidId, cosmicHandle: handle.trim() || undefined });
      toast.success("Identity sealed", {
        description: "Your cosmic handle has been updated.",
      });
    } catch {
      toast.error("Failed to save identity");
    }
  };

  return (
    <div className="space-y-8 nebula-fade-in">
      <div className="flex flex-col items-center pt-4 pb-8 border-b border-void-gold/10">
        <div className="relative mb-4">
          <VoidAvatar voidId={voidId ?? ""} size="lg" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-void-black border border-void-gold/40 rounded-full flex items-center justify-center">
            <Crown size={11} className="text-void-gold" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 border border-void-gold/30 bg-void-gold/8 mb-3">
          <Hexagon size={10} className="text-void-gold fill-void-gold/20" />
          <span className="text-void-gold text-xs font-bold tracking-[0.3em] uppercase">
            Creator
          </span>
          <Hexagon size={10} className="text-void-gold fill-void-gold/20" />
        </div>

        <p className="text-void-gold/70 font-mono text-xs tracking-wider mb-1">
          {voidId}
        </p>
        <p className="text-white/25 text-xs">Founder of the Void</p>
      </div>

      <div>
        <label
          htmlFor="cosmic-handle"
          className="block text-void-gold/50 text-xs uppercase tracking-widest mb-2"
        >
          Cosmic Handle
        </label>
        <input
          id="cosmic-handle"
          data-ocid="creator.input"
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@VoidFounder, @OmnismSage..."
          maxLength={32}
          className="w-full bg-void-black/60 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors font-mono"
        />
        <p className="text-white/25 text-xs mt-1.5">
          Visible to other travelers as your identity
        </p>
      </div>

      <button
        type="button"
        data-ocid="creator.save_button"
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
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (current) setText(current);
  }, [current]);

  const handleTransmit = async () => {
    if (!text.trim()) {
      toast.error("Reflection cannot be empty");
      return;
    }
    try {
      await setReflection(text.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("Transmitted to the Void", {
        description: "All travelers will see your reflection.",
      });
    } catch {
      toast.error("Transmission failed");
    }
  };

  return (
    <div className="space-y-6 nebula-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Radio size={14} className="text-void-gold/60" />
          <span className="text-void-gold/60 text-xs uppercase tracking-widest">
            Daily Void Reflection
          </span>
        </div>
        <p className="text-white/30 text-xs leading-relaxed">
          This prompt appears on the splash screen for all travelers entering
          the Void each day.
        </p>
      </div>

      {!isLoading && current && (
        <div className="px-4 py-3 border border-void-gold/15 bg-void-gold/4">
          <p className="text-void-gold/40 text-xs uppercase tracking-widest mb-1">
            Currently active
          </p>
          <p className="text-white/50 text-sm italic">"{current}"</p>
        </div>
      )}

      <div>
        <label
          htmlFor="daily-reflection"
          className="block text-void-gold/50 text-xs uppercase tracking-widest mb-2"
        >
          New Reflection
        </label>
        <textarea
          id="daily-reflection"
          data-ocid="creator.textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={280}
          placeholder="What truth are you afraid to face in the light of the void?"
          className="w-full bg-void-black/60 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/60 transition-colors resize-none leading-relaxed"
          style={{
            boxShadow:
              text.length > 0 ? "0 0 12px rgba(255,215,0,0.04)" : "none",
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
        data-ocid="creator.primary_button"
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

// ─── Section: Message Pinning ─────────────────────────────────────────────────
type PinChannel = "lightRoom" | "darkRoom";

function PinningSection() {
  const [activeChannel, setActiveChannel] = useState<PinChannel>("lightRoom");
  const [messageId, setMessageId] = useState("");

  const { mutateAsync: pinMessage, isPending } = usePinMessage();
  const { data: pinnedLight } = useGetPinnedMessage("lightRoom");
  const { data: pinnedDark } = useGetPinnedMessage("darkRoom");

  const currentPinned =
    activeChannel === "lightRoom" ? pinnedLight : pinnedDark;
  const isLightRoom = activeChannel === "lightRoom";

  const handlePin = async () => {
    if (!messageId.trim()) {
      toast.error("Message ID cannot be empty");
      return;
    }
    try {
      await pinMessage({ channel: activeChannel, messageId: messageId.trim() });
      setMessageId("");
      toast.success("Message pinned as Void Transmission", {
        description: `Pinned in ${isLightRoom ? "Light Room" : "Dark Room"}.`,
      });
    } catch {
      toast.error("Pinning failed");
    }
  };

  return (
    <div className="space-y-6 nebula-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Pin size={14} className="text-void-gold/60" />
          <span className="text-void-gold/60 text-xs uppercase tracking-widest">
            Void Transmissions
          </span>
        </div>
        <p className="text-white/30 text-xs leading-relaxed">
          Pin any message in a room as an official Void Transmission.
        </p>
      </div>

      <div className="flex">
        {(["lightRoom", "darkRoom"] as PinChannel[]).map((ch) => {
          const isActive = activeChannel === ch;
          const isLight = ch === "lightRoom";
          return (
            <button
              key={ch}
              type="button"
              data-ocid="creator.tab"
              onClick={() => setActiveChannel(ch)}
              className="flex-1 py-2.5 text-xs tracking-widest uppercase transition-all"
              style={{
                borderBottom: isActive
                  ? `2px solid ${isLight ? "rgba(255,215,0,0.7)" : "rgba(142,45,226,0.7)"}`
                  : "2px solid rgba(255,255,255,0.05)",
                color: isActive
                  ? isLight
                    ? "rgba(255,215,0,0.9)"
                    : "rgba(178,102,255,0.9)"
                  : "rgba(255,255,255,0.3)",
                background: isActive
                  ? isLight
                    ? "rgba(255,215,0,0.04)"
                    : "rgba(142,45,226,0.04)"
                  : "transparent",
              }}
            >
              {isLight ? "☀️" : "🌑"} {isLight ? "Light Room" : "Dark Room"}
            </button>
          );
        })}
      </div>

      {currentPinned && (
        <div
          className="px-4 py-3 border"
          style={{
            borderColor: isLightRoom
              ? "rgba(255,215,0,0.2)"
              : "rgba(142,45,226,0.2)",
            background: isLightRoom
              ? "rgba(255,215,0,0.04)"
              : "rgba(142,45,226,0.04)",
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-1"
            style={{
              color: isLightRoom
                ? "rgba(255,215,0,0.5)"
                : "rgba(178,102,255,0.5)",
            }}
          >
            Currently pinned
          </p>
          <p className="text-white/50 text-xs font-mono break-all">
            {currentPinned.id}
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="pin-message-id"
          className="block text-void-gold/50 text-xs uppercase tracking-widest mb-2"
        >
          Message ID to Pin
        </label>
        <input
          id="pin-message-id"
          data-ocid="creator.input"
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
        data-ocid="creator.submit_button"
        onClick={handlePin}
        disabled={isPending || !messageId.trim()}
        className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-50"
        style={{
          borderColor: isLightRoom
            ? "rgba(255,215,0,0.4)"
            : "rgba(142,45,226,0.4)",
          color: isLightRoom ? "#FFD700" : "rgba(178,102,255,0.9)",
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

// ─── Section: User Directory ──────────────────────────────────────────────────
function UsersSection() {
  const { data: profiles = [], isLoading } = useGetAllUserProfiles();

  return (
    <div className="space-y-4 nebula-fade-in">
      <div className="flex items-center gap-3">
        <Users size={14} className="text-void-gold/60" />
        <span className="text-void-gold/60 text-xs uppercase tracking-widest">
          Travelers in the Void
        </span>
        {!isLoading && (
          <span
            className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(255,215,0,0.1)",
              color: "rgba(255,215,0,0.7)",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
          >
            {profiles.length} travelers
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <div
            className="w-4 h-4 rounded-full animate-spin"
            style={{
              border: "2px solid rgba(255,215,0,0.3)",
              borderTopColor: "rgba(255,215,0,0.9)",
            }}
          />
          <span className="text-white/30 text-xs">Scanning the void...</span>
        </div>
      ) : profiles.length === 0 ? (
        <div
          className="flex flex-col items-center py-12 text-center gap-3"
          style={{
            border: "1px solid rgba(255,215,0,0.08)",
            background: "rgba(255,215,0,0.02)",
          }}
        >
          <Users size={24} className="text-void-gold/20" />
          <p className="text-white/30 text-sm">No travelers yet</p>
        </div>
      ) : (
        <div
          className="divide-y rounded-lg overflow-hidden"
          style={{
            border: "1px solid rgba(255,215,0,0.1)",
            background: "rgba(0,0,0,0.4)",
          }}
        >
          {profiles.map((profile, i) => (
            <div
              key={profile.voidId || i}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,215,0,0.06)" }}
            >
              <VoidAvatar voidId={profile.voidId} size="sm" />
              <div className="flex-1 min-w-0">
                {profile.cosmicHandle ? (
                  <div
                    className="font-semibold text-sm truncate"
                    style={{ color: "#fbbf24" }}
                  >
                    @{profile.cosmicHandle}
                  </div>
                ) : (
                  <div className="text-white/40 text-sm truncate italic">
                    No handle
                  </div>
                )}
                <div className="text-white/30 text-xs font-mono truncate">
                  {profile.voidId}
                </div>
              </div>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "rgba(74,222,128,0.6)" }}
                title="Registered"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Content Moderation ──────────────────────────────────────────────
function ModerationSection() {
  return (
    <div className="space-y-6 nebula-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-void-gold/60" />
          <span className="text-void-gold/60 text-xs uppercase tracking-widest">
            Content Moderation
          </span>
        </div>
      </div>
      <div
        className="flex flex-col items-center py-16 text-center gap-4"
        style={{
          border: "1px solid rgba(255,215,0,0.08)",
          background: "rgba(255,215,0,0.02)",
        }}
      >
        <Shield size={28} className="text-void-gold/20" />
        <div>
          <p className="text-white/40 text-sm font-medium mb-1">
            Full moderation coming soon
          </p>
          <p className="text-white/20 text-xs leading-relaxed max-w-xs">
            Real user bans and message deletion require a dedicated admin
            canister function. This will be wired in a future update.
          </p>
        </div>
        <div
          className="px-4 py-2 text-xs"
          style={{
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.1)",
            color: "rgba(255,255,255,0.30)",
          }}
        >
          ⚠️ No backend moderation functions exist yet — actions here would have
          no effect.
        </div>
      </div>
    </div>
  );
}

// ─── Section: Newsletter ───────────────────────────────────────────────────────
function NewsletterSection() {
  return (
    <div className="space-y-6 nebula-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mail size={14} className="text-void-gold/60" />
          <span className="text-void-gold/60 text-xs uppercase tracking-widest">
            Newsletter Transmission
          </span>
        </div>
        <p className="text-white/30 text-xs leading-relaxed">
          Send a cosmic message to all travelers who have opted in to
          notifications.
        </p>
      </div>

      <div
        className="flex flex-col items-center py-16 text-center gap-4"
        style={{
          border: "1px solid rgba(142,45,226,0.12)",
          background: "rgba(142,45,226,0.03)",
        }}
      >
        <Mail size={28} className="text-purple-400/30" />
        <div>
          <p className="text-white/40 text-sm font-medium mb-1">
            Newsletter delivery coming soon
          </p>
          <p className="text-white/20 text-xs leading-relaxed max-w-xs">
            Sending newsletters requires a server-side VAPID push
            infrastructure. The backend endpoint and push server are not yet
            active.
          </p>
        </div>
        <div
          className="px-4 py-2 text-xs"
          style={{
            background: "rgba(142,45,226,0.06)",
            border: "1px solid rgba(142,45,226,0.15)",
            color: "rgba(178,102,255,0.5)",
          }}
        >
          No messages will be sent until the push server is live.
        </div>
      </div>
    </div>
  );
}

// ─── Main Creator Portal ──────────────────────────────────────────────────────
export default function CreatorPortal() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState<PortalTab>("identity");

  // Also allow Founder Mode users (activated via localStorage flag)
  const isFounderMode = (() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key?.startsWith("void_founder_mode_") &&
          localStorage.getItem(key) === "true"
        ) {
          return true;
        }
      }
    } catch {
      /**/
    }
    return false;
  })();

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

  if (!isAdmin && !isFounderMode) {
    return <NotAuthorized />;
  }

  return (
    <div className="void-bg flex flex-col min-h-full">
      {/* Page Header */}
      <div
        className="px-6 py-5 border-b"
        style={{
          borderColor: "rgba(255,215,0,0.12)",
          background:
            "linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(74,0,255,0.04) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center border"
            style={{
              borderColor: "rgba(255,215,0,0.3)",
              background: "rgba(255,215,0,0.08)",
              boxShadow: "0 0 16px rgba(255,215,0,0.1)",
            }}
          >
            <Crown size={18} className="text-void-gold" />
          </div>
          <div>
            <h1 className="void-glow-text text-lg font-black tracking-[0.2em] uppercase">
              Creator Portal
            </h1>
            <p className="text-white/30 text-xs tracking-wider">
              The Founder's Temple · Admin Only
            </p>
          </div>
        </div>
      </div>

      <div className="sacred-divider" />

      {/* Tab Bar */}
      <div className="flex border-b border-void-gold/8 overflow-x-auto shrink-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid="creator.tab"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-xs tracking-widest uppercase whitespace-nowrap transition-all"
              style={{
                borderBottom: isActive
                  ? "2px solid rgba(255,215,0,0.7)"
                  : "2px solid transparent",
                color: isActive
                  ? "rgba(255,215,0,0.9)"
                  : "rgba(255,255,255,0.3)",
                background: isActive ? "rgba(255,215,0,0.03)" : "transparent",
              }}
            >
              <span
                style={{
                  color: isActive
                    ? "rgba(255,215,0,0.7)"
                    : "rgba(255,255,255,0.25)",
                }}
              >
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
          {activeTab === "identity" && <IdentitySection />}
          {activeTab === "reflection" && <ReflectionSection />}
          {activeTab === "users" && <UsersSection />}
          {activeTab === "pinning" && <PinningSection />}
          {activeTab === "moderation" && <ModerationSection />}
          {activeTab === "newsletter" && <NewsletterSection />}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-void-gold/6 text-center">
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
  );
}
