import { useState } from "react";
import { useAvatar } from "../hooks/useAvatar";
import { useEncryption } from "../hooks/useEncryption";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useSaveCallerUserProfile,
  useSetCosmicHandle,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { registerKnownUser } from "../lib/userRegistry";

const BIO_MAX = 280;

export default function ProfileSetupModal() {
  const { identity } = useInternetIdentity();
  const voidId = useVoidId();
  const { mutateAsync: saveProfile, isPending: savePending } =
    useSaveCallerUserProfile();
  const { mutateAsync: setCosmicHandle, isPending: handlePending } =
    useSetCosmicHandle();
  const { isReady: encryptionReady } = useEncryption();
  const [cosmicHandle, setCosmicHandleInput] = useState("");
  const [bio, setBio] = useState("");
  const [handleError, setHandleError] = useState("");
  const avatarUrl = useAvatar(voidId ?? "");

  const isPending = savePending || handlePending;

  if (!identity || !voidId) return null;

  const HANDLE_RE = /^[a-zA-Z0-9_]{3,24}$/;
  const cleanHandle = cosmicHandle.trim().replace(/^@/, "");

  const validate = () => {
    if (!cleanHandle) {
      setHandleError("A Cosmic Handle is required to enter the Void.");
      return false;
    }
    if (!HANDLE_RE.test(cleanHandle)) {
      setHandleError(
        "3–24 characters, letters, numbers, and underscores only.",
      );
      return false;
    }
    setHandleError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Save bio to localStorage
    if (bio.trim()) {
      try {
        localStorage.setItem(`void_bio_${voidId}`, bio.trim());
      } catch {
        // fail silently
      }
    }

    // Register profile first, then set the cosmic handle
    await saveProfile({ voidId, cosmicHandle: undefined });
    try {
      await setCosmicHandle({ voidId, handle: cleanHandle });
      registerKnownUser(voidId, cleanHandle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("taken") ||
        msg.toLowerCase().includes("exists")
      ) {
        setHandleError("That handle is already taken. Try another.");
      } else {
        setHandleError("Could not claim handle. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm">
      {/* Sacred geometry rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full border border-void-gold/10 animate-pulse" />
        <div className="w-64 h-64 rounded-full border border-void-gold/15 absolute" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 bg-void-deep border border-void-gold/20 p-8">
        <div className="text-center mb-8">
          <div className="text-void-gold/50 text-xs tracking-widest uppercase mb-4">
            First Contact
          </div>
          <h2 className="text-white text-2xl font-bold tracking-wider mb-2">
            Welcome to the Void
          </h2>
          <p className="text-white/40 text-sm">
            Choose your Cosmic Handle to enter the Void.
          </p>
        </div>

        {/* Avatar + VOID ID */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img
              src={avatarUrl}
              alt="Your cosmic avatar"
              className="w-20 h-20 rounded-full border-2 border-void-gold/40 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-void-gold/20 rounded-full border border-void-gold/40 flex items-center justify-center">
              <span className="text-xs">✦</span>
            </div>
          </div>
          <div className="text-void-gold/80 text-sm font-mono tracking-wider">
            {voidId}
          </div>
          <div className="text-white/30 text-xs mt-1">
            Your permanent anonymous identity
          </div>
        </div>

        {/* Encryption status */}
        <div className="mb-6 flex items-center gap-2 text-xs text-white/40">
          <span
            className={`w-2 h-2 rounded-full ${
              encryptionReady ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            }`}
          />
          {encryptionReady
            ? "E2EE keys generated"
            : "Generating encryption keys..."}
        </div>

        {/* Required cosmic handle */}
        <div className="mb-5">
          <label
            htmlFor="setup-cosmic-handle"
            className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
          >
            Cosmic Handle <span className="text-void-gold">*</span>
          </label>
          <input
            id="setup-cosmic-handle"
            type="text"
            value={cosmicHandle}
            onChange={(e) => {
              setCosmicHandleInput(e.target.value);
              setHandleError("");
            }}
            placeholder="@NebulaSage, @MayaBurner..."
            maxLength={32}
            className={`w-full bg-void-black/50 border text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none transition-colors ${
              handleError
                ? "border-red-500/60 focus:border-red-500"
                : "border-void-gold/20 focus:border-void-gold/50"
            }`}
          />
          {handleError ? (
            <p className="text-red-400/80 text-xs mt-1">{handleError}</p>
          ) : (
            <p className="text-white/30 text-xs mt-1">
              3–24 characters, letters, numbers, underscores. Must be unique.
            </p>
          )}
        </div>

        {/* Optional bio */}
        <div className="mb-6">
          <label
            htmlFor="setup-bio"
            className="block text-void-gold/60 text-xs uppercase tracking-widest mb-2"
          >
            Bio{" "}
            <span className="text-white/30 text-xs normal-case">
              (optional)
            </span>
          </label>
          <div className="relative">
            <textarea
              id="setup-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              placeholder="Describe your cosmic journey..."
              rows={2}
              className="w-full bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-3 text-sm focus:outline-none focus:border-void-gold/50 transition-colors resize-none"
            />
            <span className="absolute bottom-2 right-3 text-white/25 text-xs font-mono">
              {bio.length}/{BIO_MAX}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !encryptionReady}
          className="void-btn-primary w-full py-3 text-sm tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
              Entering...
            </span>
          ) : (
            "Enter the Void"
          )}
        </button>
      </div>
    </div>
  );
}
