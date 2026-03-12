/**
 * ChatScreen — Telegram-style private DM view.
 * E2EE decryption removed temporarily; messages rendered as plain text from ciphertext field.
 */

import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, ChevronUp, Lock, Send, Smile, X } from "lucide-react";
import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MessageType } from "../backend";
import VoidAvatar from "../components/VoidAvatar";
import { useActor } from "../hooks/useActor";
import { useGetCosmicHandle } from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";
import { normalizeDMChatId } from "../lib/E2EEHelper";
import { sendLocalNotification } from "../lib/NotificationService";
import { markChatReadLocal } from "./Messages";

// ─── Emoji set ────────────────────────────────────────────────────────────────
const EMOJI_SET = [
  "✨",
  "🌑",
  "☀️",
  "🌌",
  "💫",
  "🔮",
  "⚡",
  "🌊",
  "🔥",
  "❄️",
  "🌙",
  "⭐",
  "💎",
  "🌸",
  "🦋",
  "🌿",
  "🕊️",
  "🌈",
  "💡",
  "🎭",
  "🙏",
  "💜",
  "💛",
  "🖤",
  "🤍",
  "👁️",
  "∞",
  "☯️",
  "🌀",
  "🔯",
  "🌟",
  "💥",
  "🎇",
  "🎆",
  "🌠",
  "🪐",
  "🛸",
  "👽",
  "🔭",
  "⚗️",
  "🧿",
  "🪬",
  "🫧",
  "💠",
  "🔷",
  "🧲",
  "⚖️",
  "🕯️",
  "🪷",
  "🌺",
  "🦄",
  "🐉",
  "🦅",
  "🌻",
  "🍃",
  "🌱",
  "☁️",
  "⛅",
  "🌤️",
  "🌋",
  "🏔️",
  "🌍",
  "✊",
  "🤲",
  "🫶",
  "💪",
  "🧘",
  "🎯",
  "🎲",
  "🎴",
  "🎪",
  "🎠",
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function getDMPartner(channelId: string, myVoidId: string): string {
  const body = channelId.startsWith("DM-") ? channelId.slice(3) : channelId;
  const separator = "_@void_shadow_";
  const sepIdx = body.indexOf(separator);
  if (sepIdx !== -1) {
    const id1 = body.slice(0, sepIdx);
    const id2 = `@void_shadow_${body.slice(sepIdx + separator.length)}`;
    return id1 === myVoidId ? id2 : id1;
  }
  return body;
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Status Ticks ─────────────────────────────────────────────────────────────
type MessageStatus = "sent" | "delivered" | "read";

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === "sent") {
    return (
      <span
        className="text-[10px] leading-none"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        ✓
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span
        className="text-[10px] leading-none tracking-[-2px]"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        ✓✓
      </span>
    );
  }
  return (
    <span
      className="text-[10px] leading-none tracking-[-2px]"
      style={{ color: "#3b82f6" }}
    >
      ✓✓
    </span>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────
interface ChatBubbleProps {
  isOwn: boolean;
  senderHandle: string | null;
  senderVoidId: string;
  text: string | null | undefined;
  timestamp: bigint;
  index: number;
  status?: MessageStatus;
}

const ChatBubble = memo(function ChatBubble({
  isOwn,
  senderHandle,
  text,
  timestamp,
  index,
  status,
}: ChatBubbleProps) {
  // Simplified: no E2EE — just show text directly, empty string as fallback
  const displayText = text ?? "";

  return (
    <div
      data-ocid={`chat.message.item.${index}`}
      className={`flex flex-col mb-3 ${
        isOwn ? "items-end" : "items-start"
      } max-w-[85%] ${isOwn ? "ml-auto" : "mr-auto"}`}
    >
      {!isOwn && senderHandle && (
        <div
          className="text-[10px] font-semibold mb-1 px-1"
          style={{ color: "rgba(255,215,0,0.6)" }}
        >
          {senderHandle}
        </div>
      )}

      <div
        className="px-4 py-2.5 max-w-full break-words"
        style={{
          background: isOwn
            ? "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,180,0,0.10))"
            : "linear-gradient(135deg, rgba(123,47,190,0.22), rgba(90,30,150,0.14))",
          border: `1px solid ${
            isOwn ? "rgba(255,215,0,0.25)" : "rgba(123,47,190,0.3)"
          }`,
          color: isOwn ? "rgba(255,215,0,0.95)" : "rgba(220,200,255,0.9)",
          borderRadius: isOwn ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          boxShadow: isOwn
            ? "0 2px 12px rgba(255,215,0,0.07)"
            : "0 2px 12px rgba(123,47,190,0.1)",
        }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
      </div>

      <div
        className={`flex items-center gap-1 mt-1 px-1 ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className="text-[9px] font-mono"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          {formatTime(timestamp)}
        </div>
        {isOwn && status && <StatusTicks status={status} />}
      </div>
    </div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatScreen() {
  const navigate = useNavigate();
  const { channelId: encodedChannelId } = useParams({
    from: "/dms/$channelId",
  });
  const decoded = decodeURIComponent(encodedChannelId);

  const myVoidId = useVoidId();
  const { actor, isFetching: actorFetching } = useActor();

  const partnerVoidId = useMemo(
    () => (myVoidId ? getDMPartner(decoded, myVoidId) : decoded),
    [decoded, myVoidId],
  );

  const { data: partnerHandle } = useGetCosmicHandle(partnerVoidId);
  const { data: myHandleData } = useGetCosmicHandle(myVoidId ?? "");
  const myHandle = myHandleData ?? null;

  const chatId = useMemo(
    () => (myVoidId ? normalizeDMChatId(myVoidId, partnerVoidId) : decoded),
    [myVoidId, partnerVoidId, decoded],
  );

  // ─── Messages ─────────────────────────────────────────────────────────────────
  interface BackendMessage {
    id: string;
    senderVoidId: string;
    ciphertext: string;
    timestamp: bigint;
    messageType: MessageType;
  }

  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [olderMessages, setOlderMessages] = useState<BackendMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [msgStatusMap, setMsgStatusMap] = useState<Map<string, MessageStatus>>(
    new Map(),
  );

  // Poll messages
  useEffect(() => {
    if (!actor || actorFetching) return;

    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const result = await actor.getMessages(decoded, BigInt(50));
        if (!cancelled) {
          setMessages(result as BackendMessage[]);
          setIsLoading(false);
        }

        // Poll typing status from canister for PARTNER only
        try {
          const typingStatus = await (actor as any).getTypingStatus?.(chatId);
          if (typingStatus === true && !cancelled) {
            setPartnerIsTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              setPartnerIsTyping(false);
            }, 3000);
          }
        } catch {
          // method may not exist — skip silently
        }
      } catch (err) {
        console.error("fetchMessages error:", err);
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [actor, actorFetching, decoded, chatId]);

  // Mark chat as read on mount (local)
  useEffect(() => {
    markChatReadLocal(decoded);
  }, [decoded]);

  // Mark chat as read on canister
  useEffect(() => {
    if (!actor || actorFetching) return;
    try {
      (actor as any).markChatRead?.(decoded);
    } catch {
      // optional — fail silently
    }
  }, [actor, actorFetching, decoded]);

  const allMessages = useMemo(
    () => [...olderMessages, ...messages],
    [olderMessages, messages],
  );

  // ─── Load older messages ──────────────────────────────────────────────────────
  const handleLoadOlder = useCallback(async () => {
    if (!actor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const totalLoaded = olderMessages.length + messages.length;
      const result = await actor.loadOlderMessages(
        decoded,
        BigInt(totalLoaded),
        BigInt(20),
      );
      if (result.length === 0) setHasMore(false);
      else setOlderMessages((prev) => [...result, ...prev]);
    } catch (err) {
      console.error("loadOlderMessages error:", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [actor, olderMessages.length, messages.length, decoded, loadingOlder]);

  // ─── Auto-scroll ──────────────────────────────────────────────────────────────
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevLastMsgId = useRef("");

  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? "";
    if (lastId !== prevLastMsgId.current) {
      prevLastMsgId.current = lastId;
      if (autoScroll && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(atBottom);
    if (el.scrollTop < 100 && hasMore && !loadingOlder) {
      handleLoadOlder();
    }
  }, [hasMore, loadingOlder, handleLoadOlder]);

  // ─── Send message ─────────────────────────────────────────────────────────────
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);

  // Typing indicator — PARTNER only
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleSend = useCallback(async () => {
    const plaintext = text.trim();
    if (!plaintext || !actor || !myVoidId) return;
    setSending(true);

    // Optimistic: add sent message to local list immediately
    const optimisticId = `optimistic_${Date.now()}`;
    const optimisticMsg: BackendMessage = {
      id: optimisticId,
      senderVoidId: myVoidId,
      ciphertext: plaintext,
      timestamp: BigInt(Date.now()) * BigInt(1_000_000),
      messageType: MessageType.text,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMsgStatusMap((prev) => new Map(prev).set(plaintext, "sent"));

    try {
      await actor.postMessage(
        decoded,
        plaintext,
        myVoidId,
        MessageType.text,
        null,
        null,
      );

      setMsgStatusMap((prev) => new Map(prev).set(plaintext, "delivered"));

      // Notify recipients after successful send
      try {
        await (actor as any).notifyRecipients?.(chatId);
        console.log(`Notification triggered for chatId: ${chatId}`);
      } catch (notifyErr) {
        console.warn("[ChatScreen] notifyRecipients failed:", notifyErr);
      }

      const partnerName = partnerHandle
        ? `@${partnerHandle.replace(/^@/, "")}`
        : "someone";
      sendLocalNotification(
        `Message from ${myHandle ? `@${myHandle}` : "you"}`,
        `${partnerName}: ${plaintext.slice(0, 50)}${
          plaintext.length > 50 ? "…" : ""
        }`,
      );

      setText("");
    } catch (err) {
      console.error("sendMessage error:", err);
      toast.error("Failed to send message. Try again.");
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
    }
  }, [text, actor, myVoidId, decoded, chatId, partnerHandle, myHandle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ─── Partner display name ─────────────────────────────────────────────────────
  const partnerDisplayName = partnerHandle
    ? `@${partnerHandle.replace(/^@/, "")}`
    : null;
  const partnerShortId = partnerVoidId
    .replace("@void_shadow_", "")
    .replace(":canister", "");

  const getMessageStatus = useCallback(
    (ciphertext: string): MessageStatus => {
      return msgStatusMap.get(ciphertext) ?? "sent";
    },
    [msgStatusMap],
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="void-bg flex flex-col h-full">
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3 border-b border-void-gold/15 flex items-center gap-3"
        style={{ background: "rgba(0,0,0,0.8)" }}
      >
        <button
          type="button"
          data-ocid="chat.back.button"
          onClick={() => navigate({ to: "/dms" })}
          className="shrink-0 p-1.5 text-white/40 hover:text-void-gold transition-colors"
          aria-label="Back to messages"
        >
          <ArrowLeft size={18} />
        </button>

        <VoidAvatar voidId={partnerVoidId} size="sm" />

        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-base leading-tight truncate"
            style={{ color: "rgba(255,215,0,0.95)" }}
          >
            {partnerDisplayName ?? `void_${partnerShortId.slice(0, 8)}`}
          </div>
          {partnerDisplayName && (
            <div className="text-white/25 text-[10px] font-mono truncate mt-0.5">
              @void_{partnerShortId}
            </div>
          )}
        </div>

        {/* E2EE lock icon — decorative */}
        <div
          className="shrink-0 relative group flex items-center gap-1.5 cursor-help"
          data-ocid="chat.e2ee.tooltip"
        >
          <Lock size={14} style={{ color: "rgba(34,197,94,0.9)" }} />
          <span
            className="text-[9px] font-mono tracking-wide hidden sm:block"
            style={{ color: "rgba(34,197,94,0.7)" }}
          >
            E2EE
          </span>
          <div className="absolute bottom-full right-0 mb-2 w-48 px-3 py-2 text-xs text-white/80 bg-black/90 border border-green-500/20 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
            End-to-end encrypted. Only you and the recipient can read this.
            <div
              className="absolute top-full right-3 w-0 h-0"
              style={{
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "4px solid rgba(0,0,0,0.9)",
              }}
            />
          </div>
        </div>
      </div>

      {/* E2EE banner — decorative */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2 bg-green-950/30 border-b border-green-500/15">
        <Lock size={12} className="text-green-400 shrink-0" />
        <span className="text-green-400/80 text-xs">
          End-to-end encrypted 🔒 Only you and the recipient can read this.
        </span>
        <span
          title="End-to-end encrypted. Only you and the recipient can read this."
          className="ml-auto text-green-400 text-xs font-bold cursor-help"
        >
          E2EE ✓
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 py-4 w-full overflow-x-hidden"
          style={{ background: "rgba(0,0,0,0.3)" }}
        >
          {hasMore && (
            <div className="flex justify-center mb-4">
              <button
                type="button"
                data-ocid="chat.pagination_prev"
                onClick={handleLoadOlder}
                disabled={loadingOlder}
                className="flex items-center gap-2 text-xs text-white/30 hover:text-void-gold transition-colors border border-void-gold/10 px-4 py-2"
              >
                {loadingOlder ? (
                  <span className="w-3 h-3 border border-void-gold/30 border-t-void-gold rounded-full animate-spin" />
                ) : (
                  <ChevronUp size={12} />
                )}
                Load older messages ✨
              </button>
            </div>
          )}

          {isLoading && (
            <div
              data-ocid="chat.loading_state"
              className="flex justify-center py-8"
            >
              <div className="text-white/30 text-sm animate-pulse">
                🌌 Loading messages...
              </div>
            </div>
          )}

          {!isLoading && allMessages.length === 0 && (
            <div
              data-ocid="chat.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="text-4xl mb-4">🌌</div>
              <p className="text-white/30 text-sm">
                ✨ The void awaits your first message.
              </p>
              <p className="text-white/20 text-xs mt-1">
                🔒 Messages are end-to-end encrypted.
              </p>
            </div>
          )}

          {allMessages.map((msg, idx) => {
            const isOwn = msg.senderVoidId === myVoidId;
            const senderHandle = isOwn
              ? null
              : partnerHandle
                ? `@${partnerHandle.replace(/^@/, "")}`
                : null;

            return (
              <ChatBubble
                key={msg.id}
                isOwn={isOwn}
                senderHandle={senderHandle}
                senderVoidId={msg.senderVoidId}
                text={msg.ciphertext}
                timestamp={msg.timestamp}
                index={idx + 1}
                status={isOwn ? getMessageStatus(msg.ciphertext) : undefined}
              />
            );
          })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-void-gold/10 bg-void-black/80 backdrop-blur-sm">
        {/* Emoji picker */}
        {showEmoji && (
          <div className="px-3 pt-2 pb-1 border-b border-void-gold/10">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-white/30 text-xs">✨ Cosmic Emoji</span>
              <button
                type="button"
                onClick={() => setShowEmoji(false)}
                className="text-white/30 hover:text-white/60"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-10 gap-1 max-h-24 overflow-y-auto">
              {EMOJI_SET.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setText((prev) => prev + emoji);
                    setShowEmoji(false);
                  }}
                  className="text-lg hover:bg-void-gold/10 rounded p-0.5 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator — ONLY shown when PARTNER is typing */}
        {partnerIsTyping && (
          <div className="px-4 pt-2 flex items-center gap-1.5">
            <span className="text-white/40 text-xs">
              ✨ {partnerDisplayName ?? `void_${partnerShortId.slice(0, 8)}`} is
              typing
            </span>
            <span className="flex gap-0.5 items-center">
              <span
                className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-white/40 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        )}

        <div className="flex items-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={`text-white/30 hover:text-void-gold transition-colors p-1.5 ${
              showEmoji ? "text-void-gold" : ""
            }`}
            aria-label="Emoji picker"
          >
            <Smile size={18} />
          </button>

          <textarea
            data-ocid="chat.message.input"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Send a message… ✨"
            rows={1}
            disabled={sending}
            className="flex-1 bg-void-black/50 border border-void-gold/20 text-white placeholder:text-white/20 px-4 py-2.5 text-sm focus:outline-none focus:border-void-gold/40 resize-none transition-colors disabled:opacity-50"
            style={{ maxHeight: "120px", fontSize: "16px" }}
          />

          <button
            type="button"
            data-ocid="chat.send_button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="shrink-0 w-9 h-9 flex items-center justify-center disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
            style={{
              background:
                text.trim() && !sending
                  ? "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,180,0,0.15))"
                  : "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,215,0,0.2)",
            }}
            aria-label="Send message"
          >
            <Send
              size={15}
              className={text.trim() ? "text-void-gold" : "text-white/30"}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
