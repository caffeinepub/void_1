import { useNavigate } from "@tanstack/react-router";
/**
 * UserProfileCard — A modal that shows another user's profile.
 * Displays their avatar, cosmic handle (main title), VOID ID (subtitle),
 * bio, wisdom score, and a "Send Message" button.
 */
import { MessageCircle, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useCreateDM,
  useGetCosmicHandle,
  useGetWisdomScore,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { getCachedHandle, registerKnownUser } from "../lib/userRegistry";
import VoidAvatar from "./VoidAvatar";

interface UserProfileCardProps {
  voidId: string;
  onClose: () => void;
  /** Called after successfully opening a DM — parent can also close the modal */
  onStartDM?: () => void;
}

export default function UserProfileCard({
  voidId,
  onClose,
  onStartDM,
}: UserProfileCardProps) {
  const navigate = useNavigate();
  const myVoidId = useVoidId();
  const { mutateAsync: createDM, isPending: creatingDM } = useCreateDM();

  // Cosmic handle
  const cachedHandle = getCachedHandle(voidId);
  const { data: fetchedHandle } = useGetCosmicHandle(voidId);
  useEffect(() => {
    if (fetchedHandle) registerKnownUser(voidId, fetchedHandle);
  }, [fetchedHandle, voidId]);
  const handle = fetchedHandle ?? cachedHandle;

  // Wisdom score
  const { data: wisdomScore } = useGetWisdomScore(voidId);

  // Bio — read from localStorage for own profile, "Traveler in the void" for others
  const [bio, setBio] = useState<string>("");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`void_bio_${voidId}`);
      setBio(stored || "");
    } catch {
      setBio("");
    }
  }, [voidId]);

  // Custom avatar
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`void_avatar_${voidId}`);
      setCustomAvatar(stored ?? undefined);
    } catch {
      setCustomAvatar(undefined);
    }
  }, [voidId]);

  const shortId = voidId.replace("@void_shadow_", "").replace(":canister", "");

  const handleSendMessage = async () => {
    if (!myVoidId) {
      toast.error("Your identity is not ready yet.");
      return;
    }
    if (voidId === myVoidId) {
      toast.error("You cannot open a channel with yourself.");
      return;
    }
    try {
      const channelId = await createDM({ voidId1: myVoidId, voidId2: voidId });
      if (!channelId) {
        toast.error("Failed to create channel. Try again.");
        return;
      }
      onStartDM?.();
      onClose();
      navigate({
        to: "/dms/$channelId",
        params: { channelId: encodeURIComponent(channelId) },
      });
    } catch (err) {
      console.error("createDM error", err);
      toast.error("Could not open channel. Try again.");
    }
  };

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] flex items-center justify-center bg-void-black/85 backdrop-blur-sm w-full h-full max-w-none max-h-none m-0 p-0 border-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {/* Decorative ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80 rounded-full border border-void-gold/8 animate-pulse" />
      </div>

      <div
        className="relative z-10 w-full max-w-xs mx-4 bg-void-deep border border-void-gold/25 p-6 shadow-[0_0_60px_rgba(255,215,0,0.08)]"
        style={{
          background:
            "linear-gradient(135deg, rgba(10,0,21,0.98) 0%, rgba(0,0,0,0.98) 100%)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative mb-4">
            <VoidAvatar
              voidId={voidId}
              size="lg"
              customAvatarUrl={customAvatar}
              className="w-20 h-20"
            />
            <div className="absolute inset-0 rounded-full ring-2 ring-void-gold/20 shadow-[0_0_20px_rgba(255,215,0,0.2)]" />
          </div>

          {/* Cosmic Handle — main title */}
          {handle ? (
            <>
              <h3 className="text-void-gold font-bold text-lg tracking-wide text-center leading-tight">
                @{handle.replace(/^@/, "")}
              </h3>
              <p className="text-white/30 text-xs font-mono mt-1 text-center">
                @void_{shortId}
              </p>
            </>
          ) : (
            <h3 className="text-white/70 font-bold text-base tracking-wide font-mono text-center">
              void_{shortId}
            </h3>
          )}
        </div>

        {/* Wisdom Score */}
        {wisdomScore !== undefined && (
          <div className="flex items-center justify-center gap-1.5 mb-4">
            <Star
              size={12}
              className="text-void-gold/60"
              fill="rgba(255,215,0,0.3)"
            />
            <span className="text-void-gold/70 text-xs font-mono">
              {Number(wisdomScore).toLocaleString()} Wisdom
            </span>
          </div>
        )}

        {/* Bio */}
        <div className="mb-5 min-h-[48px]">
          {bio ? (
            <p className="text-white/50 text-xs leading-relaxed text-center italic">
              &ldquo;{bio}&rdquo;
            </p>
          ) : (
            <p className="text-white/20 text-xs text-center italic">
              Traveler in the void
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-full h-px mb-5"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)",
          }}
        />

        {/* Send Message button */}
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={creatingDM}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs tracking-widest uppercase font-semibold transition-all disabled:opacity-40"
          style={{
            background: "rgba(255,215,0,0.08)",
            border: "1px solid rgba(255,215,0,0.3)",
            color: "rgba(255,215,0,0.9)",
            boxShadow: "0 0 16px rgba(255,215,0,0.06)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,215,0,0.15)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 20px rgba(255,215,0,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,215,0,0.08)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 0 16px rgba(255,215,0,0.06)";
          }}
        >
          {creatingDM ? (
            <span className="w-4 h-4 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
          ) : (
            <MessageCircle size={14} />
          )}
          {creatingDM ? "Opening channel..." : "Send Message"}
        </button>
      </div>
    </dialog>
  );
}
