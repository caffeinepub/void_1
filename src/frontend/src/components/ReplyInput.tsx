import { Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { MessageType } from "../backend";
import { useEncryption } from "../hooks/useEncryption";
import { usePostMessage } from "../hooks/useQueries";
import { triggerGoldDust } from "../lib/goldDustAnimation";

interface ReplyInputProps {
  parentMessageId: string;
  parentText: string;
  channel: string;
  channelType: "lightRoom" | "darkRoom" | "dm";
  currentVoidId: string;
  onClose: () => void;
}

export default function ReplyInput({
  parentMessageId,
  parentText,
  channel,
  currentVoidId,
  onClose,
}: ReplyInputProps) {
  const [text, setText] = useState("");
  const { encryptForSend, isReady } = useEncryption();
  const { mutateAsync: postMessage, isPending } = usePostMessage();
  const sendBtnRef = useRef<HTMLButtonElement>(null);

  const handleSend = async () => {
    if (!text.trim() || !isReady) return;
    const ciphertext = await encryptForSend(text.trim());
    await postMessage({
      channel,
      ciphertext,
      senderVoidId: currentVoidId,
      messageType: MessageType.text,
      replyTo: parentMessageId,
    });
    if (sendBtnRef.current) triggerGoldDust(sendBtnRef.current);
    setText("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="bg-void-black/80 border border-void-gold/15 p-3">
      {/* Parent context */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <span>↩ Replying to:</span>
          <span className="italic text-white/50 truncate max-w-[200px]">
            &ldquo;{parentText.slice(0, 60)}
            {parentText.length > 60 ? "..." : ""}&rdquo;
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/30 hover:text-white/60 ml-2"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your reply..."
          className="flex-1 bg-transparent border-b border-void-gold/20 text-white/80 text-sm placeholder:text-white/20 focus:outline-none focus:border-void-gold/50 py-1 transition-colors"
        />
        <button
          type="button"
          ref={sendBtnRef}
          onClick={handleSend}
          disabled={!text.trim() || isPending || !isReady}
          className="text-void-gold/60 hover:text-void-gold disabled:opacity-30 transition-colors"
        >
          {isPending ? (
            <span className="w-4 h-4 border border-void-gold/30 border-t-void-gold rounded-full animate-spin block" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
    </div>
  );
}
