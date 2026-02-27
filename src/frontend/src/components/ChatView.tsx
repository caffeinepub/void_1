import { ChevronUp } from "lucide-react";
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

// ─── Keywords per channel ─────────────────────────────────────────────────────
const KEYWORDS: Record<"lightRoom" | "darkRoom", string[]> = {
  lightRoom: [
    "truth",
    "mindset",
    "clarity",
    "omnism",
    "wisdom",
    "consciousness",
    "unity",
    "love",
  ],
  darkRoom: [
    "maya",
    "illusion",
    "matrix",
    "shadow",
    "ego",
    "deception",
    "deconstruction",
    "fear",
  ],
};

interface ChatViewProps {
  channel: string;
  channelType: "lightRoom" | "darkRoom" | "dm";
  title: string;
}

// Map values: undefined = pending, null = failed decrypt, string = plaintext
type DecryptMap = Map<string, string | null | undefined>;

export default function ChatView({
  channel,
  channelType,
  title,
}: ChatViewProps) {
  const { data: messages = [], isLoading } = useGetMessages(channel);
  const { mutateAsync: loadOlder, isPending: loadingOlder } =
    useLoadOlderMessages();
  const { mutateAsync: upvote } = useUpvoteMessage();
  const { decryptReceived, isReady } = useEncryption();
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

  // Fetch pinned message for public rooms
  const isPublicRoom = channelType !== "dm";
  useGetPinnedMessage(isPublicRoom ? channel : "");

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
      if (msg.replyTo) {
        const existing = replyMap.get(msg.replyTo) ?? [];
        replyMap.set(msg.replyTo, [...existing, msg]);
      } else {
        rootMessages.push(msg);
      }
    }

    return { rootMessages, replyMap };
  }, [messages, olderMessages]);

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
        className={`shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 ${headerBg}`}
      >
        <div className="min-w-0 flex-1">
          <h1
            className={`font-bold tracking-wider text-base sm:text-lg truncate ${
              channelType === "lightRoom"
                ? "text-void-gold"
                : channelType === "darkRoom"
                  ? "text-void-purple"
                  : "text-white"
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
          <span className="w-2 h-2 rounded-full bg-green-500/60" />
          <span className="text-white/30 text-xs">E2EE</span>
        </div>
      </div>

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

      {/* Messages scroll container — flex-1 + min-h-0 is critical for bounded scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 space-y-1 w-full overflow-x-hidden"
        style={{
          background: "rgba(0,0,0,0.3)",
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
            <div className="text-4xl mb-4">
              {channelType === "lightRoom"
                ? "☀️"
                : channelType === "darkRoom"
                  ? "🌑"
                  : "💬"}
            </div>
            <p className="text-white/30 text-sm">
              The void awaits your first message.
            </p>
          </div>
        )}

        {rootMessages.map((msg) => {
          // Dim non-matching messages when filter is active
          const matchesFilter =
            !activeKeyword || msg.keywords.includes(activeKeyword);
          return (
            <div
              key={msg.id}
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
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
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
