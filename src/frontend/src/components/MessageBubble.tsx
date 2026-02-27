/**
 * MessageBubble — Renders a single message with:
 * - Gold (Light Room) or purple (Dark Room) styling
 * - Keyword pill badges
 * - Upvote button with count
 * - Reply threading
 */
import { useState } from 'react';
import { type Message, MessageType } from '../backend';
import VoidAvatar from './VoidAvatar';
import ReplyInput from './ReplyInput';
import { useGetCosmicHandle } from '../hooks/useQueries';
import { CornerDownRight, ChevronDown, ChevronRight, ArrowUp } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  decryptedText: string | null;
  channelType: 'lightRoom' | 'darkRoom' | 'dm';
  channel: string;
  currentVoidId: string;
  replies?: Message[];
  decryptedReplies?: Map<string, string | null>;
  depth?: number;
  onUpvote?: () => void;
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000;
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SenderName({ voidId }: { voidId: string }) {
  const { data: handle } = useGetCosmicHandle(voidId);
  const shortId = voidId.replace('@void_shadow_', '').replace(':canister', '');
  return (
    <span className="text-xs font-medium opacity-70">
      {handle || `void_${shortId}`}
    </span>
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

  const isOwn = message.senderVoidId === currentVoidId;
  const isLightRoom = channelType === 'lightRoom';
  const isDarkRoom = channelType === 'darkRoom';

  const bubbleClass = isOwn
    ? isLightRoom
      ? 'bg-gradient-to-br from-void-gold/30 to-void-gold-dark/20 border border-void-gold/40 ml-auto'
      : isDarkRoom
      ? 'bg-gradient-to-br from-void-purple/30 to-void-purple-dark/20 border border-void-purple/40 ml-auto'
      : 'bg-gradient-to-br from-void-gold/20 to-void-purple/20 border border-void-gold/30 ml-auto'
    : 'bg-void-black/60 border border-white/10';

  const displayText =
    decryptedText ??
    (message.messageType === MessageType.text ? '🔒 Encrypted message' : null);

  const handleUpvote = () => {
    if (upvoteLocal) return; // optimistic single-tap guard
    setUpvoteLocal(true);
    onUpvote?.();
  };

  // Keyword pill color
  const kwColor = isLightRoom
    ? { bg: 'rgba(255,215,0,0.1)', border: 'rgba(255,215,0,0.3)', text: 'rgba(255,215,0,0.7)' }
    : isDarkRoom
    ? { bg: 'rgba(142,45,226,0.1)', border: 'rgba(142,45,226,0.3)', text: 'rgba(178,102,255,0.7)' }
    : { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' };

  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-8 mt-2' : 'mt-4'}`}>
      <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="shrink-0 mt-1">
            <VoidAvatar voidId={message.senderVoidId} size="sm" />
          </div>
        )}

        {/* Bubble */}
        <div className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
          {/* Sender name */}
          {!isOwn && (
            <div className="mb-1 px-1">
              <SenderName voidId={message.senderVoidId} />
            </div>
          )}

          <div className={`px-4 py-3 ${bubbleClass} relative group`}>
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="mb-2 pl-2 border-l-2 border-void-gold/30 text-white/40 text-xs italic">
                ↩ Replying to a message
              </div>
            )}

            {/* Message content */}
            {message.messageType === MessageType.image && message.blobId ? (
              <div className="text-white/60 text-sm italic">📷 Image (encrypted)</div>
            ) : message.messageType === MessageType.file && message.blobId ? (
              <div className="text-white/60 text-sm italic">📎 File (encrypted)</div>
            ) : (
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {displayText || '🔒 Encrypted'}
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
            <div className={`text-xs opacity-40 mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
              {formatTime(message.timestamp)}
            </div>

            {/* Reply button (hover) */}
            <button
              type="button"
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-void-black border border-void-gold/20 px-2 py-0.5 text-xs text-void-gold/60 hover:text-void-gold flex items-center gap-1"
            >
              <CornerDownRight size={10} />
              Reply
            </button>
          </div>

          {/* Upvote button — below the bubble */}
          <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
            <button
              type="button"
              onClick={handleUpvote}
              disabled={upvoteLocal}
              className="flex items-center gap-1 transition-all group/up"
              title="Upvote this wisdom"
              style={{
                opacity: upvoteLocal ? 0.7 : 1,
              }}
            >
              <ArrowUp
                size={13}
                style={{
                  color: upvoteLocal
                    ? isLightRoom ? '#FFD700' : '#8e2de2'
                    : 'rgba(255,255,255,0.2)',
                  transition: 'color 0.2s ease',
                }}
              />
              <span
                className="text-xs font-mono"
                style={{
                  color: upvoteLocal
                    ? isLightRoom ? 'rgba(255,215,0,0.8)' : 'rgba(142,45,226,0.8)'
                    : 'rgba(255,255,255,0.2)',
                  transition: 'color 0.2s ease',
                }}
              >
                {(Number(message.upvotes) + (upvoteLocal ? 1 : 0)).toString()}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className={`mt-2 ${depth > 0 ? '' : 'ml-11'}`}>
          <ReplyInput
            parentMessageId={message.id}
            parentText={displayText ?? ''}
            channel={channel}
            channelType={channelType}
            currentVoidId={currentVoidId}
            onClose={() => setShowReplyInput(false)}
          />
        </div>
      )}

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className={`mt-1 ${depth > 0 ? '' : 'ml-11'}`}>
          <button
            type="button"
            onClick={() => setRepliesExpanded(!repliesExpanded)}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors mb-1"
          >
            {repliesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {repliesExpanded && (
            <div className="border-l border-void-gold/10 pl-3">
              {replies.map((reply) => (
                <MessageBubble
                  key={reply.id}
                  message={reply}
                  decryptedText={decryptedReplies?.get(reply.id) ?? null}
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
    </div>
  );
}
