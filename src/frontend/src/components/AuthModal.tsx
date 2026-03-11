/**
 * AuthModal — Blocking full-screen modal for mandatory Cosmic Handle setup.
 * Cannot be dismissed until a valid unique handle is claimed.
 */

import { AtSign } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSetCosmicHandle } from "../hooks/useQueries";

interface AuthModalProps {
  voidId: string;
  onSuccess: () => void;
}

// ─── Star particle ────────────────────────────────────────────────────────────
interface StarParticle {
  id: number;
  top: string;
  left: string;
  size: string;
  opacity: number;
  duration: string;
  delay: string;
}

const AuthModal = memo(function AuthModal({
  voidId,
  onSuccess,
}: AuthModalProps) {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: setCosmicHandle, isPending } = useSetCosmicHandle();

  // Auto-focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Block Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Generate 50 star particles
  const stars = useMemo<StarParticle[]>(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${1 + Math.random() * 2.5}px`,
      opacity: 0.3 + Math.random() * 0.7,
      duration: `${2 + Math.random() * 4}s`,
      delay: `${Math.random() * 4}s`,
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = handle.trim().replace(/^@+/, "");
    if (!trimmed) {
      setError("Please enter a Cosmic Handle.");
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 24) {
      setError("Handle must be between 3 and 24 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Only letters, numbers, and underscores are allowed.");
      return;
    }
    setError(null);
    try {
      await setCosmicHandle({ voidId, handle: trimmed });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("taken") ||
        msg.toLowerCase().includes("exists") ||
        msg.toLowerCase().includes("already")
      ) {
        setError("This cosmic name is already taken. Please choose another.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }, [handle, voidId, setCosmicHandle, onSuccess]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <div
      data-ocid="cosmic_handle.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #000000 0%, #05001a 40%, #0a0030 70%, #000000 100%)",
      }}
    >
      {/* Animated star particles */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            background: "white",
            opacity: star.opacity,
            animation: `twinkle ${star.duration} ease-in-out ${star.delay} infinite alternate`,
          }}
        />
      ))}

      {/* Nebula glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(100,0,200,0.12) 0%, rgba(255,215,0,0.04) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-5 p-8 flex flex-col items-center gap-6"
        style={{
          background:
            "linear-gradient(160deg, rgba(10,0,30,0.97) 0%, rgba(0,0,0,0.97) 100%)",
          border: "1px solid rgba(255,215,0,0.35)",
          boxShadow:
            "0 0 60px rgba(255,215,0,0.10), 0 0 120px rgba(100,0,200,0.08), inset 0 1px 0 rgba(255,215,0,0.1)",
        }}
      >
        {/* Gold top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,215,0,0.8), transparent)",
          }}
        />

        {/* Icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(255,215,0,0.08)",
            border: "1px solid rgba(255,215,0,0.25)",
            boxShadow: "0 0 24px rgba(255,215,0,0.12)",
          }}
        >
          <span className="text-2xl">✨</span>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1
            className="font-bold text-2xl leading-tight tracking-wide mb-2"
            style={{ color: "rgba(255,215,0,0.95)" }}
          >
            Choose your Cosmic Handle
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">
            This is your permanent unique name in VOID
            <br />
            <span className="text-white/25 text-xs">(e.g. @NebulaSage)</span>
          </p>
        </div>

        {/* Input */}
        <div className="w-full">
          <div
            className="flex items-center w-full border transition-all"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: `1px solid ${
                error ? "rgba(239,68,68,0.5)" : "rgba(255,215,0,0.25)"
              }`,
              boxShadow: error
                ? "0 0 12px rgba(239,68,68,0.08)"
                : "0 0 12px rgba(255,215,0,0.04)",
            }}
          >
            <div
              className="px-3 flex items-center shrink-0"
              style={{ color: "rgba(255,215,0,0.5)" }}
            >
              <AtSign size={15} />
            </div>
            <input
              ref={inputRef}
              data-ocid="cosmic_handle.input"
              type="text"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="NebulaSage"
              maxLength={24}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-transparent py-3 pr-4 text-white placeholder:text-white/20 text-sm focus:outline-none"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* Error */}
          {error && (
            <p
              data-ocid="cosmic_handle.error_state"
              className="mt-2 text-xs leading-tight"
              style={{ color: "rgba(239,68,68,0.9)" }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="button"
          data-ocid="cosmic_handle.submit_button"
          onClick={handleSubmit}
          disabled={isPending || !handle.trim()}
          className="w-full py-3.5 text-sm font-semibold tracking-widest uppercase transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,180,0,0.12))",
            border: "1px solid rgba(255,215,0,0.45)",
            color: "rgba(255,215,0,0.95)",
            boxShadow: "0 0 20px rgba(255,215,0,0.08)",
          }}
        >
          {isPending ? (
            <>
              <span
                className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{
                  borderColor: "rgba(255,215,0,0.2)",
                  borderTopColor: "rgba(255,215,0,0.9)",
                }}
              />
              Claiming...
            </>
          ) : (
            "Claim Handle"
          )}
        </button>

        {/* Bottom note */}
        <p className="text-white/15 text-xs text-center font-mono tracking-wider">
          VOID ID:{" "}
          {voidId.replace("@void_shadow_", "").replace(":canister", "")}
        </p>
      </div>

      {/* Twinkle keyframe */}
      <style>{`
        @keyframes twinkle {
          from { opacity: 0.2; transform: scale(0.8); }
          to   { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
});

export default AuthModal;
