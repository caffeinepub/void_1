import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Heart,
  Trash2,
} from "lucide-react";
/**
 * MessageBubble — Renders a single message with:
 * - Gold (Light Room) or purple (Dark Room) styling
 * - Keyword pill badges
 * - Upvote button with count (single-vote enforced via localStorage)
 * - Bookmark/heart (saves to localStorage void_bookmarks_{voidId})
 * - Delete own messages (marks deleted in localStorage)
 * - Reply threading
 * - Clickable sender name opens user profile
 */
import { useEffect, useState } from "react";
import { type Message, MessageType } from "../backend";
import { useGetCosmicHandle } from "../hooks/useQueries";
import { getCachedHandle, registerKnownUser } from "../lib/userRegistry";
import ReplyInput from "./ReplyInput";
import UserProfileCard from "./UserProfileCard";
import VoidAvatar from "./VoidAvatar";

interface MessageBubbleProps {
  message: Message;
  /** undefined = pending shimmer, null = failed decrypt (locked), string = plaintext */
  decryptedText: string | null | undefined;
  channelType: "lightRoom" | "darkRoom" | "dm";
  channel: string;
  currentVoidId: string;
  replies?: Message[];
  decryptedReplies?: Map<string, string | null | undefined>;
  depth?: number;
  onUpvote?: () => void;
}

interface BookmarkEntry {
  channel: string;
  messageId: string;
  ciphertext: string;
  timestamp: bigint | string;
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function SenderName({
  voidId,
  isOwn,
  channelType,
  onClickProfile,
}: {
  voidId: string;
  isOwn: boolean;
  channelType: "lightRoom" | "darkRoom" | "dm";
  onClickProfile?: () => void;
}) {
  const cachedHandle = getCachedHandle(voidId);
  const { data: fetchedHandle } = useGetCosmicHandle(voidId);

  useEffect(() => {
    if (fetchedHandle !== undefined && fetchedHandle !== null) {
      registerKnownUser(voidId, fetchedHandle);
    }
  }, [fetchedHandle, voidId]);

  const handle = fetchedHandle ?? cachedHandle;
  const shortId = voidId.replace("@void_shadow_", "").replace(":canister", "");

  const handleColor = isOwn
    ? "text-void-gold"
    : channelType === "lightRoom"
      ? "text-void-gold/80"
      : channelType === "darkRoom"
        ? "text-void-purple"
        : "text-white/70";

  return (
    <button
      type="button"
      onClick={onClickProfile}
      className={`text-left flex flex-col gap-0.5 cursor-pointer group/sender ${onClickProfile ? "hover:opacity-80 transition-opacity" : "cursor-default"}`}
      title={onClickProfile ? "View profile" : undefined}
    >
      <span
        className={`text-xs font-bold tracking-wide ${handleColor} ${onClickProfile ? "group-hover/sender:underline underline-offset-2" : ""}`}
      >
        {handle ? `@${handle.replace(/^@/, "")}` : `void_${shortId}`}
      </span>
      {handle && (
        <span className="text-[10px] font-mono text-white/25 leading-none">
          @void_{shortId}
        </span>
      )}
    </button>
  );
}

export default function MessageBubble({
  message,
  decryptedText,
  channelType,
  channel,
  currentVoidId,
  replies = [],
  decryptedReplies,
  depth = 0,
  onUpvote,
}: MessageBubbleProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(true);
  const [upvoteLocal, setUpvoteLocal] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const isOwn = message.senderVoidId === currentVoidId;
  const isPublicRoom =
    channelType === "lightRoom" || channelType === "darkRoom";
  const isLightRoom = channelType === "lightRoom";
  const isDarkRoom = channelType === "darkRoom";

  // ─── Load persisted upvote + bookmark + deleted state on mount ────────────
  useEffect(() => {
    if (!currentVoidId) return;

    // Load upvoted set
    try {
      const upvotedKey = `void_upvoted_${currentVoidId}`;
      const raw = localStorage.getItem(upvotedKey);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        if (ids.includes(message.id)) {
          setUpvoteLocal(true);
        }
      }
    } catch {
      // fail silently
    }

    // Load bookmarks
    try {
      const bookmarkKey = `void_bookmarks_${currentVoidId}`;
      const raw = localStorage.getItem(bookmarkKey);
      if (raw) {
        const entries: BookmarkEntry[] = JSON.parse(raw);
        if (entries.some((e) => e.messageId === message.id)) {
          setBookmarked(true);
        }
      }
    } catch {
      // fail silently
    }

    // Load deleted
    try {
      const deletedKey = `void_deleted_${channel}`;
      const raw = localStorage.getItem(deletedKey);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        if (ids.includes(message.id)) {
          setIsDeleted(true);
        }
      }
    } catch {
      // fail silently
    }
  }, [message.id, currentVoidId, channel]);

  const bubbleClass = isOwn
    ? isLightRoom
      ? "bg-gradient-to-br from-void-gold/30 to-void-gold-dark/20 border border-void-gold/40 ml-auto"
      : isDarkRoom
        ? "bg-gradient-to-br from-void-purple/30 to-void-purple-dark/20 border border-void-purple/40 ml-auto"
        : "bg-gradient-to-br from-void-gold/20 to-void-purple/20 border border-void-gold/30 ml-auto"
    : "bg-void-black/60 border border-white/10";

  // ─── Upvote handler with localStorage persistence ─────────────────────────
  const handleUpvote = () => {
    if (upvoteLocal) return;
    setUpvoteLocal(true);
    onUpvote?.();
    try {
      const upvotedKey = `void_upvoted_${currentVoidId}`;
      const raw = localStorage.getItem(upvotedKey);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(message.id)) {
        ids.push(message.id);
        localStorage.setItem(upvotedKey, JSON.stringify(ids));
      }
    } catch {
      // fail silently
    }
  };

  // ─── Bookmark toggle ──────────────────────────────────────────────────────
  const handleBookmark = () => {
    try {
      const bookmarkKey = `void_bookmarks_${currentVoidId}`;
      const raw = localStorage.getItem(bookmarkKey);
      const entries: BookmarkEntry[] = raw ? JSON.parse(raw) : [];

      if (bookmarked) {
        // Remove bookmark
        const filtered = entries.filter((e) => e.messageId !== message.id);
        localStorage.setItem(bookmarkKey, JSON.stringify(filtered));
        setBookmarked(false);
      } else {
        // Add bookmark
        const entry: BookmarkEntry = {
          channel,
          messageId: message.id,
          ciphertext: message.ciphertext,
          timestamp: message.timestamp.toString(),
        };
        entries.push(entry);
        localStorage.setItem(bookmarkKey, JSON.stringify(entries));
        setBookmarked(true);
      }
    } catch {
      // fail silently
    }
  };

  // ─── Delete own message ───────────────────────────────────────────────────
  const handleDelete = () => {
    if (!window.confirm("Delete this message from your view?")) return;
    try {
      const deletedKey = `void_deleted_${channel}`;
      const raw = localStorage.getItem(deletedKey);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (!ids.includes(message.id)) {
        ids.push(message.id);
        localStorage.setItem(deletedKey, JSON.stringify(ids));
      }
      setIsDeleted(true);
    } catch {
      setIsDeleted(true);
    }
  };

  // Keyword pill color
  const kwColor = isLightRoom
    ? {
        bg: "rgba(255,215,0,0.1)",
        border: "rgba(255,215,0,0.3)",
        text: "rgba(255,215,0,0.7)",
      }
    : isDarkRoom
      ? {
          bg: "rgba(142,45,226,0.1)",
          border: "rgba(142,45,226,0.3)",
          text: "rgba(178,102,255,0.7)",
        }
      : {
          bg: "rgba(255,255,255,0.05)",
          border: "rgba(255,255,255,0.1)",
          text: "rgba(255,255,255,0.4)",
        };

  // If deleted, show placeholder
  if (isDeleted) {
    return (
      <div className={`flex flex-col ${depth > 0 ? "ml-8 mt-2" : "mt-4"}`}>
        <p className="text-white/20 text-xs italic px-2">✦ Removed</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${depth > 0 ? "ml-8 mt-2" : "mt-4"}`}>
      <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="shrink-0 mt-1">
            <VoidAvatar voidId={message.senderVoidId} size="sm" />
          </div>
        )}

        {/* Bubble */}
        <div
          className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}
        >
          {/* Sender name */}
          <div
            className={`mb-1 px-1 ${isOwn ? "text-right items-end" : "text-left items-start"} flex flex-col`}
          >
            <SenderName
              voidId={message.senderVoidId}
              isOwn={isOwn}
              channelType={channelType}
              onClickProfile={!isOwn ? () => setShowProfile(true) : undefined}
            />
          </div>

          <div className={`px-4 py-3 ${bubbleClass} relative group`}>
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="mb-2 pl-2 border-l-2 border-void-gold/30 text-white/40 text-xs italic">
                ↩ Replying to a message
              </div>
            )}

            {/* Message content */}
            {message.messageType === MessageType.image && message.blobId ? (
              <div className="text-white/60 text-sm italic">
                📷 Image (encrypted)
              </div>
            ) : message.messageType === MessageType.file && message.blobId ? (
              <div className="text-white/60 text-sm italic">
                📎 File (encrypted)
              </div>
            ) : decryptedText === undefined ? (
              <span className="text-white/30 text-sm italic animate-pulse">
                Decrypting...
              </span>
            ) : decryptedText === null ? (
              <span className="text-white/20 text-sm italic">
                🔒 Sealed wisdom
              </span>
            ) : (
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {decryptedText}
              </p>
            )}

            {/* Keyword pills */}
            {message.keywords && message.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-1.5 py-0.5 text-xs font-mono"
                    style={{
                      background: kwColor.bg,
                      border: `1px solid ${kwColor.border}`,
                      color: kwColor.text,
                    }}
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div
              className={`text-xs opacity-40 mt-1 ${isOwn ? "text-right" : "text-left"}`}
            >
              {formatTime(message.timestamp)}
            </div>

            {/* Hover actions */}
            <div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {/* Reply button */}
              <button
                type="button"
                data-ocid="message.secondary_button"
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="bg-void-black border border-void-gold/20 px-2 py-0.5 text-xs text-void-gold/60 hover:text-void-gold flex items-center gap-1"
              >
                <CornerDownRight size={10} />
                Reply
              </button>

              {/* Delete own message */}
              {isOwn && (
                <button
                  type="button"
                  data-ocid="message.delete_button"
                  onClick={handleDelete}
                  aria-label="Delete message"
                  className="bg-void-black border border-red-500/20 px-2 py-0.5 text-xs text-red-400/50 hover:text-red-400 flex items-center gap-1"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Bottom action row: upvote + bookmark */}
          <div
            className={`flex items-center gap-1.5 mt-1.5 px-1 ${isOwn ? "flex-row-reverse" : ""}`}
          >
            {/* Resonate / Upvote button */}
            <button
              type="button"
              data-ocid="message.toggle"
              onClick={handleUpvote}
              disabled={upvoteLocal}
              className="flex items-center gap-1 transition-all group/up"
              title={isPublicRoom ? "Resonate with this wisdom" : "Upvote"}
              style={{ opacity: upvoteLocal ? 0.7 : 1 }}
            >
              {isPublicRoom ? (
                <span
                  className="text-xs tracking-wide px-2 py-0.5 flex items-center gap-1"
                  style={{
                    background: upvoteLocal
                      ? isLightRoom
                        ? "rgba(255,215,0,0.12)"
                        : "rgba(142,45,226,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: upvoteLocal
                      ? isLightRoom
                        ? "1px solid rgba(255,215,0,0.4)"
                        : "1px solid rgba(142,45,226,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: upvoteLocal
                      ? isLightRoom
                        ? "rgba(255,215,0,0.9)"
                        : "rgba(178,102,255,0.9)"
                      : "rgba(255,255,255,0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  ✦ Resonate{" "}
                  {(Number(message.upvotes) + (upvoteLocal ? 1 : 0)).toString()}
                </span>
              ) : (
                <>
                  <ArrowUp
                    size={13}
                    style={{
                      color: upvoteLocal ? "#FFD700" : "rgba(255,255,255,0.2)",
                      transition: "color 0.2s ease",
                    }}
                  />
                  <span
                    className="text-xs font-mono"
                    style={{
                      color: upvoteLocal
                        ? "rgba(255,215,0,0.8)"
                        : "rgba(255,255,255,0.2)",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {(
                      Number(message.upvotes) + (upvoteLocal ? 1 : 0)
                    ).toString()}
                  </span>
                </>
              )}
            </button>

            {/* Bookmark heart — only in public rooms */}
            {isPublicRoom && (
              <button
                type="button"
                data-ocid="message.toggle"
                onClick={handleBookmark}
                aria-label={
                  bookmarked ? "Remove bookmark" : "Bookmark this wisdom"
                }
                title={
                  bookmarked ? "Remove from saved wisdom" : "Save this wisdom"
                }
                className="flex items-center justify-center p-1 transition-all"
                style={{
                  color: bookmarked ? "#FFD700" : "rgba(255,255,255,0.2)",
                  transition: "color 0.2s ease",
                }}
              >
                <Heart
                  size={13}
                  fill={bookmarked ? "#FFD700" : "none"}
                  strokeWidth={bookmarked ? 0 : 1.5}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className={`mt-2 ${depth > 0 ? "" : "ml-11"}`}>
          <ReplyInput
            parentMessageId={message.id}
            parentText={typeof decryptedText === "string" ? decryptedText : ""}
            channel={channel}
            channelType={channelType}
            currentVoidId={currentVoidId}
            onClose={() => setShowReplyInput(false)}
          />
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className={`mt-1 ${depth > 0 ? "" : "ml-11"}`}>
          <button
            type="button"
            onClick={() => setRepliesExpanded(!repliesExpanded)}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mb-1"
          >
            {repliesExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
          {repliesExpanded && (
            <div className="border-l border-void-gold/10 pl-3">
              {replies.map((reply) => (
                <MessageBubble
                  key={reply.id}
                  message={reply}
                  decryptedText={decryptedReplies?.get(reply.id)}
                  channelType={channelType}
                  channel={channel}
                  currentVoidId={currentVoidId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* User profile card modal */}
      {showProfile && !isOwn && (
        <UserProfileCard
          voidId={message.senderVoidId}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
