/**
 * ChatView — Main message area for Light Room, Dark Room, and DMs.
 * Adds keyword filter bar for public rooms and upvote support.
 */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { type Message } from '../backend';
import { useGetMessages, useLoadOlderMessages, useUpvoteMessage, useGetPinnedMessage } from '../hooks/useQueries';
import { useEncryption } from '../hooks/useEncryption';
import { useVoidId } from '../hooks/useVoidId';
import { registerKnownUser } from '../lib/userRegistry';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { ChevronUp } from 'lucide-react';

// ─── Keywords per channel ─────────────────────────────────────────────────────
const KEYWORDS: Record<'lightRoom' | 'darkRoom', string[]> = {
  lightRoom: ['truth', 'mindset', 'clarity', 'omnism', 'wisdom', 'consciousness', 'unity', 'love'],
  darkRoom:  ['maya', 'illusion', 'matrix', 'shadow', 'ego', 'deception', 'deconstruction', 'fear'],
};

interface ChatViewProps {
  channel: string;
  channelType: 'lightRoom' | 'darkRoom' | 'dm';
  title: string;
}

export default function ChatView({ channel, channelType, title }: ChatViewProps) {
  const { data: messages = [], isLoading } = useGetMessages(channel);
  const { mutateAsync: loadOlder, isPending: loadingOlder } = useLoadOlderMessages();
  const { mutateAsync: upvote } = useUpvoteMessage();
  const { decryptReceived, isReady } = useEncryption();
  const voidId = useVoidId();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [decryptedMap, setDecryptedMap] = useState<Map<string, string | null>>(new Map());
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);

  // Fetch pinned message for public rooms (rendered in future enhancement)
  const isPublicRoom = channelType !== 'dm';
  useGetPinnedMessage(isPublicRoom ? channel : '');

  // ─── Decrypt new messages as they arrive ─────────────────────────────────────
  useEffect(() => {
    if (!isReady || messages.length === 0) return;
    messages.forEach((msg) => {
      setDecryptedMap((prev) => {
        if (prev.has(msg.id)) return prev;
        decryptReceived(msg.ciphertext).then((plain) => {
          setDecryptedMap((current) => new Map(current).set(msg.id, plain));
        });
        return new Map(prev).set(msg.id, null);
      });
    });
  }, [messages, isReady, decryptReceived]);

  // ─── Decrypt older messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady || olderMessages.length === 0) return;
    olderMessages.forEach((msg) => {
      setDecryptedMap((prev) => {
        if (prev.has(msg.id)) return prev;
        decryptReceived(msg.ciphertext).then((plain) => {
          setDecryptedMap((current) => new Map(current).set(msg.id, plain));
        });
        return new Map(prev).set(msg.id, null);
      });
    });
  }, [olderMessages, isReady, decryptReceived]);

  // ─── Register known users from messages (for DM search) ─────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    messages.forEach((msg) => {
      if (msg.senderVoidId) registerKnownUser(msg.senderVoidId);
    });
  }, [messages]);

  // ─── Auto-scroll to bottom on new messages ───────────────────────────────────
  // Use a ref to track last message ID to avoid derived-state deps lint error
  const prevLastMsgRef = useRef<string>('');
  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? '';
    if (lastId !== prevLastMsgRef.current) {
      prevLastMsgRef.current = lastId;
      if (autoScroll && bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // ─── Scroll handler ───────────────────────────────────────────────────────────
  const handleLoadOlder = useCallback(async () => {
    const totalLoaded = olderMessages.length + messages.length;
    const result = await loadOlder({ channel, start: totalLoaded, count: 20 });
    if (result.length === 0) {
      setHasMore(false);
    } else {
      setOlderMessages((prev) => [...result, ...prev]);
    }
  }, [olderMessages.length, messages.length, loadOlder, channel]);

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
      upvote({ channel, messageId }).catch((err) => console.error('Upvote failed', err));
    },
    [upvote, channel]
  );

  // ─── Build thread hierarchy ───────────────────────────────────────────────────
  const { rootMessages, replyMap } = useMemo(() => {
    const allMessages = [...olderMessages, ...messages];
    const replyMap = new Map<string, Message[]>();
    const rootMessages: Message[] = [];

    allMessages.forEach((msg) => {
      if (msg.replyTo) {
        const existing = replyMap.get(msg.replyTo) ?? [];
        replyMap.set(msg.replyTo, [...existing, msg]);
      } else {
        rootMessages.push(msg);
      }
    });

    return { rootMessages, replyMap };
  }, [messages, olderMessages]);

  // ─── Keyword filter ───────────────────────────────────────────────────────────
  const showFilterBar = channelType !== 'dm';
  const keywords = showFilterBar ? KEYWORDS[channelType as 'lightRoom' | 'darkRoom'] ?? [] : [];
  const isLightRoom = channelType === 'lightRoom';

  const headerBg =
    channelType === 'lightRoom'
      ? 'border-b border-void-gold/20 bg-void-gold/5'
      : channelType === 'darkRoom'
      ? 'border-b border-void-purple/20 bg-void-purple/5'
      : 'border-b border-white/10 bg-void-black/50';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`px-6 py-4 flex items-center gap-3 ${headerBg}`}>
        <div>
          <h1
            className={`font-bold tracking-wider text-lg ${
              channelType === 'lightRoom'
                ? 'text-void-gold'
                : channelType === 'darkRoom'
                ? 'text-void-purple'
                : 'text-white'
            }`}
          >
            {title}
          </h1>
          <p className="text-white/30 text-xs">
            {channelType === 'lightRoom'
              ? 'Wisdom & Truth · Public'
              : channelType === 'darkRoom'
              ? 'Illusion & Shadow · Public'
              : 'Private · E2EE'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500/60" />
          <span className="text-white/30 text-xs">E2EE</span>
        </div>
      </div>

      {/* Keyword filter bar — only for public rooms */}
      {showFilterBar && keywords.length > 0 && (
        <div
          className="px-4 py-2 flex gap-1.5 overflow-x-auto border-b"
          style={{
            borderColor: isLightRoom ? 'rgba(255,215,0,0.08)' : 'rgba(142,45,226,0.08)',
            background: isLightRoom ? 'rgba(255,215,0,0.02)' : 'rgba(142,45,226,0.02)',
          }}
        >
          {/* "All" pill */}
          <button
            type="button"
            onClick={() => setActiveKeyword(null)}
            className="shrink-0 px-3 py-1 text-xs font-mono tracking-wide transition-all"
            style={{
              border: activeKeyword === null
                ? isLightRoom ? '1px solid rgba(255,215,0,0.7)' : '1px solid rgba(142,45,226,0.7)'
                : '1px solid rgba(255,255,255,0.1)',
              background: activeKeyword === null
                ? isLightRoom ? 'rgba(255,215,0,0.1)' : 'rgba(142,45,226,0.1)'
                : 'rgba(255,255,255,0.03)',
              color: activeKeyword === null
                ? isLightRoom ? 'rgba(255,215,0,0.9)' : 'rgba(178,102,255,0.9)'
                : 'rgba(255,255,255,0.3)',
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
                    ? isLightRoom ? '1px solid rgba(255,215,0,0.7)' : '1px solid rgba(142,45,226,0.7)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: isActive
                    ? isLightRoom ? 'rgba(255,215,0,0.1)' : 'rgba(142,45,226,0.1)'
                    : 'rgba(255,255,255,0.03)',
                  color: isActive
                    ? isLightRoom ? 'rgba(255,215,0,0.9)' : 'rgba(178,102,255,0.9)'
                    : 'rgba(255,255,255,0.25)',
                  boxShadow: isActive
                    ? isLightRoom ? '0 0 6px rgba(255,215,0,0.12)' : '0 0 6px rgba(142,45,226,0.12)'
                    : 'none',
                }}
              >
                #{kw}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 nebula-bg"
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
            <div className="text-white/30 text-sm animate-pulse">Decrypting the void...</div>
          </div>
        )}

        {!isLoading && rootMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-4">
              {channelType === 'lightRoom' ? '☀️' : channelType === 'darkRoom' ? '🌑' : '💬'}
            </div>
            <p className="text-white/30 text-sm">The void awaits your first message.</p>
          </div>
        )}

        {rootMessages.map((msg) => {
          // Dim non-matching messages when filter is active
          const matchesFilter =
            !activeKeyword || msg.keywords.includes(activeKeyword);
          return (
            <div
              key={msg.id}
              style={{ opacity: matchesFilter ? 1 : 0.25, transition: 'opacity 0.2s ease' }}
            >
              <MessageBubble
                message={msg}
                decryptedText={decryptedMap.get(msg.id) ?? null}
                channelType={channelType}
                channel={channel}
                currentVoidId={voidId ?? ''}
                replies={replyMap.get(msg.id) ?? []}
                decryptedReplies={decryptedMap}
                onUpvote={() => handleUpvote(msg.id)}
              />
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        channel={channel}
        channelType={channelType}
        currentVoidId={voidId ?? ''}
      />
    </div>
  );
}
