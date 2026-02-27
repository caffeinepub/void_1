import { Check, Copy, Loader2, X } from "lucide-react";
/**
 * InviteModal — Share a VOID invite link via QR code, WhatsApp, Telegram, or clipboard.
 * Generates an invite token via the backend when opened.
 * QR code is rendered via Google Charts API (no npm package needed).
 */
import { useEffect, useState } from "react";
import { SiTelegram, SiWhatsapp } from "react-icons/si";
import { useGenerateInviteToken } from "../hooks/useQueries";

// ─── Pre-filled invite message ────────────────────────────────────────────────
const INVITE_MESSAGE =
  "Join me in VOID – a private space for truth and wisdom.";

/** Build a QR code image URL using the Google Charts API (no npm package needed). */
function buildQrUrl(text: string, size = 160): string {
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}&chco=FFD700|000000&chld=M|1`;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  voidId: string;
}

export default function InviteModal({
  isOpen,
  onClose,
  voidId,
}: InviteModalProps) {
  const { mutateAsync: generateToken, isPending } = useGenerateInviteToken();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate token when modal opens
  useEffect(() => {
    if (!isOpen || !voidId) return;
    let cancelled = false;

    setToken(null);
    setError(null);

    generateToken(voidId)
      .then((t) => {
        if (!cancelled) setToken(t);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to generate invite token", err);
          setError("Could not generate invite link. Please try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, voidId, generateToken]);

  if (!isOpen) return null;

  const inviteUrl = token ? `${window.location.origin}/invite/${token}` : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = encodeURIComponent(INVITE_MESSAGE);
  const shareUrl = encodeURIComponent(inviteUrl);

  return (
    /* Backdrop */
    <dialog
      aria-modal="true"
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm border-0 p-0 max-w-none w-full h-full"
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-sm mx-4 nebula-fade-in"
        style={{
          background: "linear-gradient(160deg, #0f001f 0%, #000000 100%)",
          border: "1px solid rgba(255,215,0,0.3)",
          boxShadow:
            "0 0 60px rgba(255,215,0,0.08), 0 0 120px rgba(142,45,226,0.05)",
        }}
      >
        {/* Gold top-line accent */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-void-gold/10">
          <div>
            <h2 className="text-white font-bold tracking-wider">
              Invite to VOID
            </h2>
            <p className="text-white/30 text-xs mt-0.5">
              Share a portal to the truth
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center gap-5">
          {/* Loading state */}
          {(isPending || (!token && !error)) && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="text-void-gold/60 animate-spin" />
              <span className="text-white/30 text-sm">Opening a portal...</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="w-full text-center py-6">
              <p className="text-red-400/70 text-sm">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setToken(null);
                }}
                className="mt-3 text-void-gold/60 text-xs hover:text-void-gold transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Token ready */}
          {token && !error && (
            <>
              {/* QR code */}
              <div
                className="p-3"
                style={{
                  background: "#000000",
                  border: "1px solid rgba(255,215,0,0.2)",
                  boxShadow: "0 0 20px rgba(255,215,0,0.08)",
                }}
              >
                <img
                  src={buildQrUrl(inviteUrl)}
                  alt="Invite QR code"
                  className="w-[160px] h-[160px]"
                />
              </div>

              {/* Invite message */}
              <p className="text-white/40 text-xs text-center italic leading-relaxed max-w-[220px]">
                "{INVITE_MESSAGE}"
              </p>

              {/* URL display + copy */}
              <div className="w-full flex items-center gap-2">
                <div
                  className="flex-1 min-w-0 px-3 py-2 text-xs font-mono text-void-gold/60 truncate"
                  style={{
                    background: "rgba(255,215,0,0.04)",
                    border: "1px solid rgba(255,215,0,0.15)",
                  }}
                >
                  {inviteUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="void-btn-icon shrink-0"
                  title="Copy link"
                >
                  {copied ? (
                    <Check size={15} className="text-green-400" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>

              {/* Share pills */}
              <div className="flex items-center gap-3 w-full">
                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-mono tracking-wider transition-all"
                  style={{
                    background: "rgba(37,211,102,0.08)",
                    border: "1px solid rgba(37,211,102,0.25)",
                    color: "rgba(37,211,102,0.8)",
                  }}
                >
                  <SiWhatsapp size={14} />
                  WhatsApp
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-mono tracking-wider transition-all"
                  style={{
                    background: "rgba(0,136,204,0.08)",
                    border: "1px solid rgba(0,136,204,0.25)",
                    color: "rgba(0,136,204,0.8)",
                  }}
                >
                  <SiTelegram size={14} />
                  Telegram
                </a>
              </div>

              {/* Copy confirmation toast-style */}
              {copied && (
                <div className="text-green-400/70 text-xs font-mono tracking-wider">
                  ✓ Link copied to clipboard
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom manifesto */}
        <div className="px-6 pb-5 text-center">
          <p className="text-white/15 text-xs font-mono tracking-[0.12em]">
            Truth needs no algorithm. Just a portal.
          </p>
        </div>
      </div>
    </dialog>
  );
}
