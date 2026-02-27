import { Paperclip, Send, Smile, X } from "lucide-react";
/**
 * MessageInput — Handles text/file input with optional keyword tagging for
 * Light Room and Dark Room channels.
 */
import { useCallback, useRef, useState } from "react";
import { MessageType } from "../backend";
import { useEncryption } from "../hooks/useEncryption";
import {
  usePostMessage,
  usePostMessageWithKeywords,
} from "../hooks/useQueries";
import { triggerGoldDust } from "../lib/goldDustAnimation";

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

// ─── Keywords per channel type ────────────────────────────────────────────────
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

interface MessageInputProps {
  channel: string;
  channelType: "lightRoom" | "darkRoom" | "dm";
  currentVoidId: string;
  /** Called immediately after encrypting, before server round-trip, so ChatView can show plaintext right away */
  onSentPlaintext?: (ciphertext: string, plaintext: string) => void;
}

export default function MessageInput({
  channel,
  channelType,
  currentVoidId,
  onSentPlaintext,
}: MessageInputProps) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [filePreview, setFilePreview] = useState<{
    name: string;
    dataUrl: string;
    type: string;
  } | null>(null);
  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const { encryptForSend, encryptFile, isReady } = useEncryption();
  const { mutateAsync: postMessage, isPending: postPending } = usePostMessage();
  const { mutateAsync: postMessageWithKeywords, isPending: postKwPending } =
    usePostMessageWithKeywords();
  const isPending = postPending || postKwPending;
  const sendBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Show keywords for public rooms only ─────────────────────────────────────
  const showKeywords =
    channelType === "lightRoom" || channelType === "darkRoom";
  const keywords = showKeywords ? KEYWORDS[channelType] : [];
  const isLightRoom = channelType === "lightRoom";

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw],
    );
  };

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setFilePreview({ name: file.name, dataUrl: result, type: file.type });
        }
      };
      reader.readAsDataURL(file);

      const bytesReader = new FileReader();
      bytesReader.onload = (ev) => {
        const buf = ev.target?.result;
        if (buf instanceof ArrayBuffer) {
          setFileBytes(new Uint8Array(buf));
        }
      };
      bytesReader.readAsArrayBuffer(file);
    },
    [],
  );

  const clearFile = () => {
    setFilePreview(null);
    setFileBytes(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!text.trim() && !filePreview) || !isReady) return;

    try {
      if (filePreview && fileBytes) {
        const encryptedContent = await encryptFile(fileBytes);
        const isImage = filePreview.type.startsWith("image/");
        await postMessage({
          channel,
          ciphertext: encryptedContent,
          senderVoidId: currentVoidId,
          messageType: isImage ? MessageType.image : MessageType.file,
        });
        clearFile();
      } else if (text.trim()) {
        const plaintext = text.trim();
        const ciphertext = await encryptForSend(plaintext);
        // Register plaintext immediately so ChatView can display it before server round-trip
        onSentPlaintext?.(ciphertext, plaintext);
        if (selectedKeywords.length > 0) {
          // Post with keywords
          await postMessageWithKeywords({
            channel,
            ciphertext,
            senderVoidId: currentVoidId,
            messageType: MessageType.text,
            keywords: selectedKeywords,
          });
        } else {
          await postMessage({
            channel,
            ciphertext,
            senderVoidId: currentVoidId,
            messageType: MessageType.text,
          });
        }
        setText("");
        setSelectedKeywords([]);
      }

      if (sendBtnRef.current) triggerGoldDust(sendBtnRef.current);
    } catch (err) {
      console.error("Send failed:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  return (
    <div className="relative border-t border-void-gold/10 bg-void-black/80 backdrop-blur-sm">
      {/* File preview */}
      {filePreview && (
        <div className="px-4 pt-3 flex items-center gap-3">
          {filePreview.type.startsWith("image/") ? (
            <img
              src={filePreview.dataUrl}
              alt="preview"
              className="w-16 h-16 object-cover border border-void-gold/20 opacity-70"
            />
          ) : (
            <div className="w-16 h-16 bg-void-deep border border-void-gold/20 flex items-center justify-center">
              <Paperclip size={20} className="text-void-gold/50" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white/60 text-xs truncate">
              {filePreview.name}
            </div>
            <div className="text-white/30 text-xs">
              Encrypted before sending
            </div>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="text-white/30 hover:text-white/60"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Keyword chips — only for public rooms */}
      {showKeywords && (
        <div className="px-4 pt-2.5 pb-0 flex gap-1.5 overflow-x-auto scrollbar-none">
          {keywords.map((kw) => {
            const active = selectedKeywords.includes(kw);
            return (
              <button
                key={kw}
                type="button"
                onClick={() => toggleKeyword(kw)}
                className="shrink-0 px-2.5 py-1 text-xs font-mono tracking-wide transition-all"
                style={{
                  border: active
                    ? isLightRoom
                      ? "1px solid rgba(255,215,0,0.7)"
                      : "1px solid rgba(142,45,226,0.7)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: active
                    ? isLightRoom
                      ? "rgba(255,215,0,0.12)"
                      : "rgba(142,45,226,0.12)"
                    : "rgba(255,255,255,0.03)",
                  color: active
                    ? isLightRoom
                      ? "rgba(255,215,0,0.9)"
                      : "rgba(178,102,255,0.9)"
                    : "rgba(255,255,255,0.25)",
                  boxShadow: active
                    ? isLightRoom
                      ? "0 0 8px rgba(255,215,0,0.15)"
                      : "0 0 8px rgba(142,45,226,0.15)"
                    : "none",
                }}
              >
                #{kw}
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 right-0 bg-void-black/95 border border-void-gold/20 p-3 grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
          {EMOJI_SET.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="text-lg hover:bg-void-gold/10 rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Emoji toggle */}
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className={`text-white/30 hover:text-void-gold transition-colors pb-1 ${showEmoji ? "text-void-gold" : ""}`}
        >
          <Smile size={18} />
        </button>

        {/* File attach */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-white/30 hover:text-void-gold transition-colors pb-1"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isReady ? "Speak your truth..." : "Initializing encryption..."
          }
          disabled={!isReady}
          rows={1}
          className="flex-1 bg-transparent border-b border-void-gold/20 text-white/90 placeholder:text-white/20 text-sm focus:outline-none focus:border-void-gold/50 transition-colors resize-none py-1 max-h-24 overflow-y-auto"
          style={{ lineHeight: "1.5" }}
        />

        {/* Send button */}
        <button
          ref={sendBtnRef}
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !filePreview) || isPending || !isReady}
          className="void-btn-send pb-1 disabled:opacity-30 transition-all"
        >
          {isPending ? (
            <span className="w-5 h-5 border-2 border-void-gold/30 border-t-void-gold rounded-full animate-spin block" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
