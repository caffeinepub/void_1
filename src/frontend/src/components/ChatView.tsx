import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronUp, Lock, Pin, X } from "lucide-react";
/**
 * ChatView — Main message area for Light Room, Dark Room, and DMs.
 * Adds keyword filter bar for public rooms and upvote support.
 *
 * Decryption model:
 *   - undefined  = not yet attempted (shows shimmer)
 *   - null       = decryption failed / foreign sender (shows 🔒)
 *   - string     = decrypted plaintext (visible)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Message } from "../backend";
import { useEncryption } from "../hooks/useEncryption";
import {
  useGetMessages,
  useGetPinnedMessage,
  useLoadOlderMessages,
  useUpvoteMessage,
} from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { registerKnownUser } from "../lib/userRegistry";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

// ─── Keywords per channel — exactly 5 unique per room ────────────────────────
const KEYWORDS: Record<"lightRoom" | "darkRoom", string[]> = {
  lightRoom: ["truth", "mindset", "clarity", "omnism", "wisdom"],
  darkRoom: ["maya", "illusion", "matrix", "shadow", "ego"],
};

// ─── Room star dust layer — bright golden embers behind messages ──────────────
// 40 extra slow golden particles for rooms/chats (RoomStarDust spec)
const ROOM_DUST = Array.from({ length: 40 }).map((_, i) => ({
  id: `room-dust-${i}`,
  x: (i * 37 + 13) % 100,
  size: 1.5 + ((i * 7) % 3) * 0.5, // 1.5–2.5px
  dur: 12 + ((i * 3) % 16), // 12–28s (slow upward float)
  delay: -((i * 3.5) % 25),
  opacity: 0.35 + (i % 4) * 0.1, // 0.35–0.65 (brighter)
  isGold: i % 3 !== 2, // 70% gold, 30% purple-ish
}));

function RoomStarDust({ isLight }: { isLight: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {ROOM_DUST.map((p) => {
        const color = p.isGold ? "#FFD700" : isLight ? "#FFD700" : "#9333ea";
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              bottom: "-5px",
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              backgroundColor: color,
              boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${color}88`,
              opacity: p.opacity,
              animation: `starDustFloat ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

interface ChatViewProps {
  channel: string;
  channelType: "lightRoom" | "darkRoom" | "dm";
  title: string;
  /** Optional element rendered in the header next to the title (e.g. member count button) */
  extraHeaderAction?: ReactNode;
  /** Show back button (for DM chat screens) */
  showBack?: boolean;
}

// Map values: undefined = pending, null = failed decrypt, string = plaintext
type DecryptMap = Map<string, string | null | undefined>;

// ─── Pinned Message Banner ────────────────────────────────────────────────────
function PinnedBanner({
  decryptedText,
  isLight,
  onDismiss,
}: {
  decryptedText: string | null | undefined;
  isLight: boolean;
  onDismiss: () => void;
}) {
  const accentColor = isLight ? "rgba(255,215,0,0.8)" : "rgba(178,102,255,0.8)";
  const borderColor = isLight
    ? "rgba(255,215,0,0.25)"
    : "rgba(142,45,226,0.25)";
  const bgColor = isLight ? "rgba(255,215,0,0.05)" : "rgba(142,45,226,0.05)";

  // Text to display
  let displayText: string;
  if (decryptedText === undefined) {
    displayText = "Decrypting...";
  } else if (decryptedText === null) {
    displayText = "🔒 Sealed transmission";
  } else {
    displayText = decryptedText;
  }

  return (
    <div
      className="shrink-0 flex items-start gap-2.5 px-4 py-2.5"
      style={{
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Pin icon */}
      <Pin
        size={13}
        className="shrink-0 mt-0.5"
        style={{ color: accentColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-mono tracking-widest uppercase mb-0.5"
          style={{ color: accentColor, opacity: 0.7 }}
        >
          Void Transmission
        </p>
        <p
          className="text-xs text-white/70 leading-relaxed line-clamp-2"
          style={{
            fontStyle: decryptedText === null ? "italic" : "normal",
          }}
        >
          {displayText}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-white/20 hover:text-white/50 transition-colors mt-0.5"
        aria-label="Dismiss pinned message"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function ChatView({
  channel,
  channelType,
  title,
  extraHeaderAction,
  showBack,
}: ChatViewProps) {
  const navigate = useNavigate();
  const { data: messages = [], isLoading } = useGetMessages(channel);
  const { mutateAsync: loadOlder, isPending: loadingOlder } =
    useLoadOlderMessages();
  const { mutateAsync: upvote } = useUpvoteMessage();
  // Use channel-specific shared key so all participants can decrypt each other's messages
  const { decryptReceived, isReady } = useEncryption(channel);
  const voidId = useVoidId();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [decryptedMap, setDecryptedMap] = useState<DecryptMap>(new Map());
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  // pendingPlaintext: ciphertext → plaintext for messages just sent (before they come back from server)
  const [pendingPlaintext, setPendingPlaintext] = useState<Map<string, string>>(
    new Map(),
  );
  // Locally deleted message IDs (from localStorage void_deleted_{channel})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // ─── Pinned message ──────────────────────────────────────────────────────────
  const isPublicRoom = channelType !== "dm";
  const { data: pinnedMessage } = useGetPinnedMessage(
    isPublicRoom ? channel : "",
  );
  const [pinnedText, setPinnedText] = useState<string | null | undefined>(
    undefined,
  );
  const [pinnedDismissed, setPinnedDismissed] = useState(false);
  const dismissedPinnedIdRef = useRef<string | null>(null);

  // Decrypt pinned message whenever it or the encryption key changes
  useEffect(() => {
    if (!pinnedMessage || !isReady) return;
    // If already dismissed this specific pinned message, skip
    if (dismissedPinnedIdRef.current === pinnedMessage.id) return;
    // Reset dismissed state when a new pinned message arrives
    setPinnedDismissed(false);
    setPinnedText(undefined); // shimmer while decrypting
    decryptReceived(pinnedMessage.ciphertext).then((plain) => {
      setPinnedText(plain);
    });
  }, [pinnedMessage, isReady, decryptReceived]);

  const handleDismissPinned = useCallback(() => {
    setPinnedDismissed(true);
    if (pinnedMessage) dismissedPinnedIdRef.current = pinnedMessage.id;
  }, [pinnedMessage]);

  const showPinnedBanner = isPublicRoom && !!pinnedMessage && !pinnedDismissed;

  // ─── Load deleted message IDs from localStorage ───────────────────────────
  useEffect(() => {
    try {
      const deletedKey = `void_deleted_${channel}`;
      const raw = localStorage.getItem(deletedKey);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        setDeletedIds(new Set(ids));
      }
    } catch {
      // fail silently
    }
  }, [channel]);

  // ─── Combined decryption effect — fires whenever isReady, messages, or olderMessages change ──
  useEffect(() => {
    if (!isReady) return;
    const allMsgs = [...olderMessages, ...messages];
    if (allMsgs.length === 0) return;

    for (const msg of allMsgs) {
      setDecryptedMap((prev) => {
        // Already processed (including if set to null for failed decrypt)
        if (prev.has(msg.id)) return prev;

        // Check if we have locally-stored plaintext for our own just-sent message
        if (pendingPlaintext.has(msg.ciphertext)) {
          const next = new Map(prev);
          next.set(msg.id, pendingPlaintext.get(msg.ciphertext)!);
          return next;
        }

        // Mark as pending (undefined → shimmer)
        const next = new Map(prev);
        next.set(msg.id, undefined);

        // Kick off async decryption
        decryptReceived(msg.ciphertext).then((plain) => {
          setDecryptedMap((current) => {
            const updated = new Map(current);
            updated.set(msg.id, plain); // null if foreign sender / failed
            return updated;
          });
        });

        return next;
      });
    }
  }, [messages, olderMessages, isReady, decryptReceived, pendingPlaintext]);

  // ─── Register known users from messages (for DM search) ─────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    for (const msg of messages) {
      if (msg.senderVoidId) registerKnownUser(msg.senderVoidId);
    }
  }, [messages]);

  // ─── Auto-scroll to bottom on new messages ───────────────────────────────────
  const prevLastMsgRef = useRef<string>("");
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? "";
    if (lastId !== prevLastMsgRef.current) {
      prevLastMsgRef.current = lastId;
      if (autoScroll && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  });

  // ─── Load older messages ──────────────────────────────────────────────────────
  const handleLoadOlder = useCallback(async () => {
    const totalLoaded = olderMessages.length + messages.length;
    const result = await loadOlder({ channel, start: totalLoaded, count: 20 });
    if (result.length === 0) {
      setHasMore(false);
    } else {
      setOlderMessages((prev) => [...result, ...prev]);
    }
  }, [olderMessages.length, messages.length, loadOlder, channel]);

  // ─── Scroll handler ───────────────────────────────────────────────────────────
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(atBottom);
    if (el.scrollTop < 100 && hasMore && !loadingOlder) {
      handleLoadOlder();
    }
  };

  // ─── Upvote handler ───────────────────────────────────────────────────────────
  const handleUpvote = useCallback(
    (messageId: string) => {
      upvote({ channel, messageId }).catch((err) =>
        console.error("Upvote failed", err),
      );
    },
    [upvote, channel],
  );

  // ─── Callback for MessageInput to register sent plaintext immediately ─────────
  const handleSentPlaintext = useCallback(
    (ciphertext: string, text: string) => {
      setPendingPlaintext((prev) => {
        const next = new Map(prev);
        next.set(ciphertext, text);
        return next;
      });
    },
    [],
  );

  // ─── Build thread hierarchy ───────────────────────────────────────────────────
  const { rootMessages, replyMap } = useMemo(() => {
    const allMessages = [...olderMessages, ...messages];
    const replyMap = new Map<string, Message[]>();
    const rootMessages: Message[] = [];

    for (const msg of allMessages) {
      // Skip locally deleted messages
      if (deletedIds.has(msg.id)) continue;
      if (msg.replyTo) {
        const existing = replyMap.get(msg.replyTo) ?? [];
        replyMap.set(msg.replyTo, [...existing, msg]);
      } else {
        rootMessages.push(msg);
      }
    }

    return { rootMessages, replyMap };
  }, [messages, olderMessages, deletedIds]);

  // ─── Keyword filter ───────────────────────────────────────────────────────────
  const showFilterBar = channelType !== "dm";
  const keywords = showFilterBar
    ? (KEYWORDS[channelType as "lightRoom" | "darkRoom"] ?? [])
    : [];
  const isLightRoom = channelType === "lightRoom";

  const headerBg =
    channelType === "lightRoom"
      ? "border-b border-void-gold/20 bg-void-gold/5"
      : channelType === "darkRoom"
        ? "border-b border-void-purple/20 bg-void-purple/5"
        : "border-b border-white/10 bg-void-black/50";

  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      {/* Header */}
      <div
        className={`shrink-0 px-3 sm:px-5 py-3 sm:py-3.5 flex items-center gap-2 sm:gap-3 ${headerBg}`}
      >
        {/* Back button for DMs */}
        {(showBack || channelType === "dm") && (
          <button
            type="button"
            onClick={() => navigate({ to: "/dms" })}
            className="shrink-0 text-white/40 hover:text-void-gold transition-colors p-1"
            aria-label="Back to messages"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1
            className={`font-bold tracking-wider text-base sm:text-lg truncate ${
              channelType === "lightRoom"
                ? "text-void-gold"
                : channelType === "darkRoom"
                  ? "text-void-purple"
                  : "text-void-gold"
            }`}
          >
            {title}
          </h1>
          <p className="text-white/30 text-xs">
            {channelType === "lightRoom"
              ? "Wisdom & Truth · Public"
              : channelType === "darkRoom"
                ? "Illusion & Shadow · Public"
                : "Private · E2EE"}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {extraHeaderAction}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-green-500"
              style={{ boxShadow: "0 0 6px rgba(34,197,94,0.8)" }}
            />
            <span className="text-green-400/70 text-xs font-mono">E2EE</span>
          </div>
        </div>
      </div>

      {/* E2EE banner for private DMs */}
      {channelType === "dm" && (
        <div
          className="shrink-0 px-4 py-2 flex items-center gap-2"
          style={{
            background: "rgba(34,197,94,0.04)",
            borderBottom: "1px solid rgba(34,197,94,0.12)",
          }}
        >
          <Lock size={11} className="text-green-400/60 shrink-0" />
          <p className="text-green-400/60 text-xs leading-snug">
            Messages are end-to-end encrypted. Only you and the recipient can
            read them.
          </p>
        </div>
      )}

      {/* Keyword filter bar — only for public rooms */}
      {showFilterBar && keywords.length > 0 && (
        <div
          className="shrink-0 px-4 py-2 flex gap-1.5 overflow-x-auto border-b scrollbar-none"
          style={{
            borderColor: isLightRoom
              ? "rgba(255,215,0,0.08)"
              : "rgba(142,45,226,0.08)",
            background: isLightRoom
              ? "rgba(255,215,0,0.02)"
              : "rgba(142,45,226,0.02)",
          }}
        >
          {/* "All" pill */}
          <button
            type="button"
            onClick={() => setActiveKeyword(null)}
            className="shrink-0 px-3 py-1 text-xs font-mono tracking-wide transition-all"
            style={{
              border:
                activeKeyword === null
                  ? isLightRoom
                    ? "1px solid rgba(255,215,0,0.7)"
                    : "1px solid rgba(142,45,226,0.7)"
                  : "1px solid rgba(255,255,255,0.1)",
              background:
                activeKeyword === null
                  ? isLightRoom
                    ? "rgba(255,215,0,0.1)"
                    : "rgba(142,45,226,0.1)"
                  : "rgba(255,255,255,0.03)",
              color:
                activeKeyword === null
                  ? isLightRoom
                    ? "rgba(255,215,0,0.9)"
                    : "rgba(178,102,255,0.9)"
                  : "rgba(255,255,255,0.3)",
            }}
          >
            All
          </button>

          {keywords.map((kw) => {
            const isActive = activeKeyword === kw;
            return (
              <button
                key={kw}
                type="button"
                data-ocid="room.hashtag.tab"
                onClick={() => setActiveKeyword(isActive ? null : kw)}
                className="shrink-0 px-2.5 py-1 text-xs font-mono tracking-wide transition-all"
                style={{
                  border: isActive
                    ? isLightRoom
                      ? "1px solid rgba(255,215,0,0.7)"
                      : "1px solid rgba(142,45,226,0.7)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: isActive
                    ? isLightRoom
                      ? "rgba(255,215,0,0.1)"
                      : "rgba(142,45,226,0.1)"
                    : "rgba(255,255,255,0.03)",
                  color: isActive
                    ? isLightRoom
                      ? "rgba(255,215,0,0.9)"
                      : "rgba(178,102,255,0.9)"
                    : "rgba(255,255,255,0.25)",
                  boxShadow: isActive
                    ? isLightRoom
                      ? "0 0 6px rgba(255,215,0,0.12)"
                      : "0 0 6px rgba(142,45,226,0.12)"
                    : "none",
                }}
              >
                #{kw}
              </button>
            );
          })}
        </div>
      )}

      {/* Pinned message banner — shown for public rooms when a message is pinned */}
      {showPinnedBanner && pinnedMessage && (
        <PinnedBanner
          decryptedText={pinnedText}
          isLight={isLightRoom}
          onDismiss={handleDismissPinned}
        />
      )}

      {/* Messages scroll container — flex-1 + min-h-0 is critical for bounded scroll */}
      <div className="flex-1 min-h-0 relative">
        {/* Star dust layer — only for public rooms, sits behind messages */}
        {isPublicRoom && <RoomStarDust isLight={isLightRoom} />}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-3 sm:px-4 py-4 space-y-1 w-full overflow-x-hidden relative"
          style={{
            background: "rgba(0,0,0,0.3)",
            zIndex: 1,
          }}
        >
          {/* Load older button */}
          {hasMore && (
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={loadingOlder}
                className="flex items-center gap-2 text-xs text-white/30 hover:text-void-gold transition-colors border border-void-gold/10 px-4 py-2"
              >
                {loadingOlder ? (
                  <span className="w-3 h-3 border border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
                ) : (
                  <ChevronUp size={12} />
                )}
                Load older messages
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="text-white/30 text-sm animate-pulse">
                Decrypting the void...
              </div>
            </div>
          )}

          {!isLoading && rootMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {channelType === "lightRoom" ? (
                <>
                  <div className="text-4xl mb-4">☀️</div>
                  <p
                    className="text-sm italic"
                    style={{ color: "rgba(255,215,0,0.45)" }}
                  >
                    Decrypting the void…
                  </p>
                  <p className="text-white/20 text-xs mt-2">
                    Be the first to share wisdom.
                  </p>
                </>
              ) : channelType === "darkRoom" ? (
                <>
                  <div
                    className="text-3xl mb-3"
                    style={{
                      filter: "drop-shadow(0 0 10px rgba(142,45,226,0.5))",
                    }}
                  >
                    🔒
                  </div>
                  <p
                    className="text-sm italic"
                    style={{ color: "rgba(142,45,226,0.6)" }}
                  >
                    Sealed wisdom awaits...
                  </p>
                  <p className="text-white/20 text-xs mt-2">
                    Speak your shadow. Dissolve the illusion.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">💬</div>
                  <p className="text-white/30 text-sm">
                    The void awaits your first message.
                  </p>
                </>
              )}
            </div>
          )}

          {rootMessages.map((msg, idx) => {
            // Dim non-matching messages when filter is active
            const matchesFilter =
              !activeKeyword || msg.keywords.includes(activeKeyword);
            return (
              <div
                key={msg.id}
                data-ocid={
                  isPublicRoom ? `room.post.item.${idx + 1}` : undefined
                }
                style={{
                  opacity: matchesFilter ? 1 : 0.25,
                  transition: "opacity 0.2s ease",
                }}
              >
                <MessageBubble
                  message={msg}
                  decryptedText={decryptedMap.get(msg.id)}
                  channelType={channelType}
                  channel={channel}
                  currentVoidId={voidId ?? ""}
                  replies={replyMap.get(msg.id) ?? []}
                  decryptedReplies={decryptedMap}
                  onUpvote={() => handleUpvote(msg.id)}
                  msgIndex={idx + 1}
                />
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — shrink-0 keeps it anchored to bottom */}
      <div className="shrink-0">
        <MessageInput
          channel={channel}
          channelType={channelType}
          currentVoidId={voidId ?? ""}
          onSentPlaintext={handleSentPlaintext}
        />
      </div>
    </div>
  );
}
