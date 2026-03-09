/**
 * ChatScreen — Full Telegram-style private DM view with true ECDH E2EE.
 *
 * E2EE Flow:
 *   1. On mount: check for existing ECDH private key in session (ref).
 *      If none, generate a new P-256 key pair and store public key in backend.
 *   2. Fetch partner's public key from backend.
 *   3. Derive shared AES-GCM key via ECDH + HKDF.
 *   4. Persist shared key in IndexedDB.
 *
 * Message format: JSON v2 envelope stored as `ciphertext` in existing backend.
 * Falls back to legacy AES-GCM (crypto.ts) for older messages.
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
import {
  decryptWithKey,
  deriveSharedKey,
  encodeEnvelope,
  encryptWithKey,
  exportPublicKey,
  generateECDHKeyPair,
  importPublicKey,
  loadSharedKey,
  normalizeDMChatId,
  parseEnvelope,
  storeSharedKey,
} from "../lib/E2EEHelper";
import { sendLocalNotification } from "../lib/NotificationService";
import { decryptMessage, getChannelKey } from "../lib/crypto";
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
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function getDMPartner(channelId: string, myVoidId: string): string {
  const withoutPrefix = channelId.replace("DM-", "");
  const parts = withoutPrefix.split("_");
  const partner = parts.find((p) => !myVoidId.includes(p));
  return partner ? `@void_shadow_${partner}:canister` : channelId;
}

function formatTime(timestamp: bigint): string {
  const date = new Date(Number(timestamp));
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────
interface ChatBubbleProps {
  isOwn: boolean;
  senderHandle: string | null;
  senderVoidId: string;
  text: string | null | undefined; // undefined = pending decrypt, null = failed
  timestamp: bigint;
  index: number;
}

const ChatBubble = memo(function ChatBubble({
  isOwn,
  senderHandle,
  text,
  timestamp,
  index,
}: ChatBubbleProps) {
  const displayText =
    text === undefined
      ? null // shimmer
      : text === null
        ? "🔒" // failed decrypt
        : text;

  return (
    <div
      data-ocid={`chat.message.item.${index}`}
      className={`flex flex-col mb-3 ${isOwn ? "items-end" : "items-start"} max-w-[85%] ${isOwn ? "ml-auto" : "mr-auto"}`}
    >
      {/* Sender name — only for others */}
      {!isOwn && senderHandle && (
        <span className="text-[10px] text-void-gold/50 font-mono mb-1 pl-1">
          {senderHandle}
        </span>
      )}

      {/* Bubble */}
      <div
        className={`relative px-4 py-2.5 max-w-full break-words text-sm leading-relaxed ${
          isOwn ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm"
        }`}
        style={
          isOwn
            ? {
                background:
                  "linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(180,120,0,0.22) 100%)",
                border: "1px solid rgba(255,215,0,0.35)",
                color: "#FFD700",
                boxShadow:
                  "0 2px 16px rgba(255,215,0,0.12), inset 0 1px 0 rgba(255,215,0,0.15)",
              }
            : {
                background:
                  "linear-gradient(135deg, rgba(142,45,226,0.35) 0%, rgba(100,30,180,0.28) 100%)",
                border: "1px solid rgba(142,45,226,0.4)",
                color: "rgba(230,210,255,0.92)",
                boxShadow:
                  "0 2px 16px rgba(142,45,226,0.12), inset 0 1px 0 rgba(180,100,255,0.12)",
              }
        }
      >
        {/* Shimmer for pending */}
        {text === undefined ? (
          <span
            className="inline-block w-24 h-4 rounded"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        ) : (
          <span>{displayText}</span>
        )}
      </div>

      {/* Timestamp */}
      <span
        className={`text-[9px] font-mono mt-0.5 ${isOwn ? "text-void-gold/30 pr-1" : "text-white/20 pl-1"}`}
      >
        {formatTime(timestamp)}
      </span>
    </div>
  );
});

// ─── ChatScreen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { channelId } = useParams({ from: "/dms/$channelId" });
  const decoded = decodeURIComponent(channelId);
  const navigate = useNavigate();
  const { actor, isFetching: actorFetching } = useActor();
  const myVoidId = useVoidId();

  // Determine DM partner
  const partnerVoidId = useMemo(
    () => (myVoidId ? getDMPartner(decoded, myVoidId) : decoded),
    [decoded, myVoidId],
  );

  // Cosmic handles
  const { data: partnerHandle } = useGetCosmicHandle(partnerVoidId);
  const { data: myHandle } = useGetCosmicHandle(myVoidId ?? "");

  // ─── E2EE state ──────────────────────────────────────────────────────────────
  const myKeyPairRef = useRef<CryptoKeyPair | null>(null);
  const [e2eeReady, setE2eeReady] = useState(false);
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  // Fallback channel key (legacy AES-GCM)
  const [legacyKey, setLegacyKey] = useState<CryptoKey | null>(null);

  // Chat ID for key storage (normalized)
  const chatId = useMemo(
    () => (myVoidId ? normalizeDMChatId(myVoidId, partnerVoidId) : decoded),
    [myVoidId, partnerVoidId, decoded],
  );

  // ─── E2EE initialization ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!actor || actorFetching || !myVoidId) return;

    let cancelled = false;

    async function initE2EE() {
      try {
        // 1. Try to load existing shared key
        const existingShared = await loadSharedKey(chatId);
        if (existingShared && !cancelled) {
          sharedKeyRef.current = existingShared;
          setE2eeReady(true);
          return;
        }

        // 2. Ensure we have an ECDH key pair for this session
        if (!myKeyPairRef.current) {
          const keyPair = await generateECDHKeyPair();
          myKeyPairRef.current = keyPair;

          // Export and store public key in backend
          const pubKeyBytes = await exportPublicKey(keyPair.publicKey);
          await actor!.storeE2EEPublicKey(pubKeyBytes);
        }

        // 3. Fetch partner's public key
        const partnerPubKeyBytes = await actor!.getE2EEPublicKey(partnerVoidId);
        if (!partnerPubKeyBytes || partnerPubKeyBytes.length === 0) {
          // Partner hasn't published their key yet — wait for next poll
          if (!cancelled) setE2eeReady(false);
          return;
        }

        // 4. Import partner key and derive shared key
        const partnerPubKey = await importPublicKey(
          new Uint8Array(partnerPubKeyBytes),
        );
        const shared = await deriveSharedKey(
          myKeyPairRef.current!.privateKey,
          partnerPubKey,
          chatId,
        );

        // 5. Store shared key in IndexedDB
        await storeSharedKey(chatId, shared);

        if (!cancelled) {
          sharedKeyRef.current = shared;
          setE2eeReady(true);
        }
      } catch (err) {
        console.warn(
          "[ChatScreen] E2EE init failed, using legacy fallback:",
          err,
        );
        if (!cancelled) setE2eeReady(false);
      }
    }

    initE2EE();

    // Retry every 3s until partner key is available
    const retryInterval = setInterval(() => {
      if (!sharedKeyRef.current) initE2EE();
      else clearInterval(retryInterval);
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(retryInterval);
    };
  }, [actor, actorFetching, myVoidId, partnerVoidId, chatId]);

  // Load legacy channel key for decrypting older messages
  useEffect(() => {
    getChannelKey(decoded)
      .then((k) => setLegacyKey(k))
      .catch(() => {});
  }, [decoded]);

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

  // Decryption map: messageId → plaintext | null | undefined
  type DecryptState = string | null | undefined;
  const [decryptedMap, setDecryptedMap] = useState<Map<string, DecryptState>>(
    new Map(),
  );

  // Pending local plaintext for just-sent messages (optimistic)
  const pendingRef = useRef<Map<string, string>>(new Map());

  // ─── Message polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!actor || actorFetching) return;

    const fetchMessages = async () => {
      try {
        const msgs = await actor.getMessages(decoded, BigInt(50));
        setMessages(msgs);
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [actor, actorFetching, decoded]);

  // ─── Mark chat as read on mount + when messages change ───────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length is intentional trigger
  useEffect(() => {
    markChatReadLocal(chatId);
  }, [chatId, messages.length]);

  // ─── Decryption ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const allMsgs = [...olderMessages, ...messages];
    if (allMsgs.length === 0) return;

    for (const msg of allMsgs) {
      setDecryptedMap((prev) => {
        if (prev.has(msg.id)) return prev;

        // Optimistic: did we just send this?
        if (pendingRef.current.has(msg.ciphertext)) {
          const next = new Map(prev);
          next.set(msg.id, pendingRef.current.get(msg.ciphertext)!);
          return next;
        }

        // Mark as pending decrypt
        const next = new Map(prev);
        next.set(msg.id, undefined);

        // Async decrypt
        (async () => {
          let plain: string | null = null;

          // Try v2 ECDH envelope first
          const envelope = parseEnvelope(msg.ciphertext);
          if (envelope && sharedKeyRef.current) {
            plain = await decryptWithKey(
              envelope.enc,
              envelope.nonce,
              envelope.tag,
              sharedKeyRef.current,
            );
          }

          // Fallback: legacy AES-GCM channel key
          if (plain === null && legacyKey) {
            plain = await decryptMessage(msg.ciphertext, legacyKey);
          }

          setDecryptedMap((current) => {
            const updated = new Map(current);
            updated.set(msg.id, plain);
            return updated;
          });
        })();

        return next;
      });
    }
  }, [messages, olderMessages, legacyKey]); // sharedKeyRef is a ref, not triggering re-render

  // Re-run decryption when e2eeReady toggles (shared key became available)
  // We clear all previously-failed entries so the decryption effect re-attempts them.
  useEffect(() => {
    if (!e2eeReady || !sharedKeyRef.current) return;
    // Remove all null entries so the main decryption effect will re-attempt them
    setDecryptedMap((prev) => {
      const next = new Map(prev);
      for (const [id, val] of next) {
        if (val === null) next.delete(id);
      }
      return next;
    });
  }, [e2eeReady]);

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
  const sendBtnRef = useRef<HTMLButtonElement>(null);

  const handleSend = useCallback(async () => {
    const plaintext = text.trim();
    if (!plaintext || !actor || !myVoidId) return;
    setSending(true);

    try {
      let ciphertext: string;

      if (e2eeReady && sharedKeyRef.current) {
        // True ECDH E2EE: encrypt with shared key
        const { encryptedContent, nonce, tag } = await encryptWithKey(
          plaintext,
          sharedKeyRef.current,
        );
        ciphertext = encodeEnvelope(encryptedContent, nonce, tag);
      } else {
        // Fallback: legacy channel key (compatible with existing messages)
        const fallbackKey = await getChannelKey(decoded);
        const { encryptMessage: legacyEncrypt } = await import("../lib/crypto");
        ciphertext = await legacyEncrypt(plaintext, fallbackKey);
      }

      // Store plaintext optimistically
      pendingRef.current.set(ciphertext, plaintext);

      // Send to backend
      await actor.postMessage(
        decoded,
        ciphertext,
        myVoidId,
        MessageType.text,
        null,
        null,
      );

      // Notify recipients (best-effort — function may not exist yet)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (actor as any).notifyRecipients?.(decoded);
      } catch {
        // optional — fail silently
      }

      // Local notification for partner if they're offline
      const partnerName = partnerHandle
        ? `@${partnerHandle.replace(/^@/, "")}`
        : "someone";
      sendLocalNotification(
        `Message from ${myHandle ? `@${myHandle}` : "you"}`,
        `${partnerName}: ${plaintext.slice(0, 50)}${plaintext.length > 50 ? "…" : ""}`,
      );

      setText("");
      setShowEmoji(false);
    } catch (err) {
      console.error("Send failed:", err);
      toast.error("Failed to send message. Try again.");
    } finally {
      setSending(false);
    }
  }, [text, actor, myVoidId, e2eeReady, decoded, partnerHandle, myHandle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ─── Render helpers ───────────────────────────────────────────────────────────
  const partnerDisplayName = partnerHandle
    ? `@${partnerHandle.replace(/^@/, "")}`
    : partnerVoidId.replace("@void_shadow_", "void_").replace(":canister", "");

  const partnerShortId = partnerVoidId
    .replace("@void_shadow_", "")
    .replace(":canister", "");

  const allMessages = useMemo(
    () => [...olderMessages, ...messages],
    [olderMessages, messages],
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      {/* Header */}
      <div className="shrink-0 px-3 py-3 flex items-center gap-3 border-b border-white/10 bg-void-black/60">
        <button
          type="button"
          data-ocid="chat.back.link"
          onClick={() => navigate({ to: "/dms" })}
          className="shrink-0 text-white/40 hover:text-void-gold transition-colors p-1"
          aria-label="Back to messages"
        >
          <ArrowLeft size={18} />
        </button>

        <VoidAvatar voidId={partnerVoidId} size="sm" />

        <div className="flex-1 min-w-0">
          {/* Cosmic Handle — gold bold title */}
          <h1 className="text-void-gold font-bold text-base leading-tight truncate">
            {partnerDisplayName}
          </h1>
          {/* VOID ID — tiny gray subtitle */}
          {partnerHandle && (
            <p className="text-white/25 text-[10px] font-mono truncate mt-0.5">
              @void_{partnerShortId}
            </p>
          )}
        </div>

        {/* E2EE indicator */}
        <div className="shrink-0 flex items-center gap-1.5">
          {e2eeReady ? (
            <span className="flex items-center gap-1">
              <Lock size={11} className="text-green-400" />
              <span className="text-green-400 text-[10px] font-bold font-mono">
                E2EE
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-yellow-400"
                style={{ boxShadow: "0 0 4px rgba(234,179,8,0.8)" }}
              />
              <span className="text-yellow-400/60 text-[10px] font-mono">
                Key exchange…
              </span>
            </span>
          )}
        </div>
      </div>

      {/* E2EE lock banner */}
      <div className="shrink-0 px-4 py-2 flex items-center gap-2 bg-green-950/30 border-b border-green-500/15">
        <Lock size={12} className="text-green-400 shrink-0" />
        <span className="text-green-400/80 text-xs">
          End-to-end encrypted. Only you and the recipient can read this.
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
          {/* Load older button */}
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
                Load older messages
              </button>
            </div>
          )}

          {isLoading && (
            <div
              data-ocid="chat.loading_state"
              className="flex justify-center py-8"
            >
              <div className="text-white/30 text-sm animate-pulse">
                Decrypting the void...
              </div>
            </div>
          )}

          {!isLoading && allMessages.length === 0 && (
            <div
              data-ocid="chat.empty_state"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="text-4xl mb-4">💬</div>
              <p className="text-white/30 text-sm">
                The void awaits your first message.
              </p>
              <p className="text-white/20 text-xs mt-1">
                Messages are end-to-end encrypted.
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
                text={decryptedMap.get(msg.id)}
                timestamp={msg.timestamp}
                index={idx + 1}
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
              <span className="text-white/30 text-xs">Emoji</span>
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

        <div className="flex items-end gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={`text-white/30 hover:text-void-gold transition-colors pb-1 ${showEmoji ? "text-void-gold" : ""}`}
          >
            <Smile size={18} />
          </button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            data-ocid="chat.message.input"
            placeholder={
              e2eeReady
                ? "Type your message..."
                : "Establishing E2EE connection..."
            }
            rows={1}
            className="flex-1 bg-transparent border-b border-void-gold/20 text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-void-gold/50 transition-colors resize-none py-1 max-h-24 overflow-y-auto"
            style={{ lineHeight: "1.5", fontSize: "16px" }}
          />

          <button
            ref={sendBtnRef}
            type="button"
            data-ocid="chat.send_button"
            onClick={handleSend}
            disabled={!text.trim() || sending || !actor}
            className="void-btn-send pb-1 disabled:opacity-30 transition-all"
          >
            {sending ? (
              <span className="w-5 h-5 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin block" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Shimmer animation style */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
