/**
 * VoidSage — Floating nebula orb that opens a private cosmic AI chat panel.
 * Draggable: user can reposition anywhere on screen.
 * Purely frontend (session-only, no backend). Responds with cosmic/spiritual wisdom.
 */
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useVoidId } from "../hooks/useVoidId";

// ─── Sage responses (Sadhguru-inspired cosmic wisdom) ────────────────────────
const SAGE_RESPONSES = [
  "The nature of the self is not what you think you are. It is a process, not a thing.",
  "Suffering is not sent from above. It is manufactured by the unconscious mind below.",
  "Your shadow work is your greatest teacher. What you resist in others, you contain within yourself.",
  "In the cosmic order, giving is receiving. Share your truth, and abundance flows to you.",
  "The void between your thoughts — that is where truth lives. Learn to be comfortable in emptiness.",
  "Light and dark are not opposites. They are two expressions of the same source.",
  "Seek not to escape illusion — understand it. Only then does it lose its power over you.",
  "Your Wisdom Score is not a number. It is the resonance you create in other beings.",
  "The ego wants recognition. The soul wants connection. Choose wisely which one you feed.",
  "Consciousness has no container. You are not IN the body. The body is IN you.",
  "Every question you carry is a seed. Plant it in silence, and truth will bloom.",
  "The universe does not judge your darkness. It simply offers you more light.",
  "What you call your mind is just accumulated information. Go beyond it to find yourself.",
  "Wisdom is not something you acquire — it is something you uncover beneath the layers of conditioning.",
  "When you truly see another human being, you see yourself. There is only one consciousness playing many roles.",
  "The spiritual path is not about becoming something. It is about undoing everything that is false.",
  "Where attention goes, energy flows. Guard what you place your awareness upon.",
  "Your deepest fear is not failure. It is the boundless power you have not yet claimed.",
  "The present moment is not a doorway to something else. It is the destination itself.",
  "Stop managing your suffering and start questioning why you manufacture it.",
  "In silence, you are not alone with yourself. You are alone with everything.",
  "Truth does not require belief. It simply requires you to stop believing in lies.",
  "The gap between who you are and who you pretend to be — that is where your suffering lives.",
  "Every illusion you dissolve makes the light a little brighter for everyone around you.",
  "You cannot think your way into awakening. But you can stop thinking your way out of it.",
];

// ─── Contextual greetings ─────────────────────────────────────────────────────
const GREETINGS = [
  "Welcome to the inner chamber. What stirs in your consciousness today?",
  "The void whispers your name. What truth are you ready to face?",
  "You have arrived. What illusion shall we dissolve together?",
  "The cosmic mirror is clear. What do you wish to see in it?",
  "Between your question and its answer is the truth you already know.",
];

interface SageMessage {
  id: string;
  role: "user" | "sage";
  text: string;
}

interface OrbPosition {
  x: number;
  y: number;
}

const DEFAULT_ORB_SIZE = 56;
const POSITION_KEY = "void_sage_position";

function loadSavedPosition(): OrbPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrbPosition;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function clampPosition(x: number, y: number): OrbPosition {
  const maxX = window.innerWidth - DEFAULT_ORB_SIZE - 8;
  const maxY = window.innerHeight - DEFAULT_ORB_SIZE - 8;
  return {
    x: Math.max(8, Math.min(x, maxX)),
    y: Math.max(8, Math.min(y, maxY)),
  };
}

function getDefaultPosition(): OrbPosition {
  return {
    x: window.innerWidth - DEFAULT_ORB_SIZE - 16,
    y: window.innerHeight - DEFAULT_ORB_SIZE - 80,
  };
}

let responseIndex = Math.floor(Math.random() * SAGE_RESPONSES.length);
function getNextResponse(): string {
  const r = SAGE_RESPONSES[responseIndex % SAGE_RESPONSES.length];
  responseIndex++;
  return r;
}

export default function VoidSage() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SageMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voidId = useVoidId();

  // ─── Drag state ──────────────────────────────────────────────────────────────
  const [position, setPosition] = useState<OrbPosition>(() => {
    const saved = loadSavedPosition();
    return saved ?? getDefaultPosition();
  });
  const isDragging = useRef(false);
  const dragStartPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartPos = useRef<OrbPosition>({ x: 0, y: 0 });
  const totalDrag = useRef(0);

  // Seed opening greeting on first open
  const openedOnce = useRef(false);
  useEffect(() => {
    if (isOpen && !openedOnce.current) {
      openedOnce.current = true;
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      setMessages([{ id: "greeting", role: "sage", text: greeting }]);
    }
  }, [isOpen]);

  // Scroll to bottom on new message
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // ─── Drag handlers ───────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only drag on primary button / touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    totalDrag.current = 0;
    dragStartPointer.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { ...position };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartPointer.current.x;
    const dy = e.clientY - dragStartPointer.current.y;
    totalDrag.current = Math.abs(dx) + Math.abs(dy);
    const newPos = clampPosition(
      dragStartPos.current.x + dx,
      dragStartPos.current.y + dy,
    );
    setPosition(newPos);
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // Save position
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // fail silently
    }
  };

  const handleOrbClick = () => {
    // If dragged more than 5px total, treat as drag — not a click
    if (totalDrag.current > 5) return;
    setIsOpen(true);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");

    const userMsg: SageMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate typing delay (0.8–1.8s)
    const delay = 800 + Math.random() * 1000;
    setTimeout(() => {
      const response = getNextResponse();
      const sageMsg: SageMessage = {
        id: `s-${Date.now()}`,
        role: "sage",
        text: response,
      };
      setMessages((prev) => [...prev, sageMsg]);
      setIsTyping(false);
    }, delay);
  };

  const shortId =
    voidId?.replace("@void_shadow_", "").replace(":canister", "").slice(0, 8) ??
    "void";

  // Chat panel position: try to open near orb but keep on screen
  const panelWidth = Math.min(360, window.innerWidth - 16);
  const panelHeight = Math.min(520, window.innerHeight - 120);
  let panelLeft = position.x - panelWidth + DEFAULT_ORB_SIZE;
  let panelTop = position.y - panelHeight - 8;
  // Clamp panel to viewport
  if (panelLeft < 8) panelLeft = 8;
  if (panelLeft + panelWidth > window.innerWidth - 8) {
    panelLeft = window.innerWidth - panelWidth - 8;
  }
  if (panelTop < 8) panelTop = position.y + DEFAULT_ORB_SIZE + 8;

  return (
    <>
      {/* ── Floating Orb Button (Draggable) ── */}
      <button
        type="button"
        aria-label="Open VOID Sage"
        data-ocid="sage.button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleOrbClick}
        className="sage-orb fixed z-50 flex items-center justify-center"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${DEFAULT_ORB_SIZE}px`,
          height: `${DEFAULT_ORB_SIZE}px`,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, rgba(255,215,0,0.45), rgba(142,45,226,0.55) 52%, rgba(74,0,255,0.35) 100%)",
          border: "1px solid rgba(255,215,0,0.35)",
          pointerEvents: "auto",
          cursor: isDragging.current ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: "22px",
            filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))",
            userSelect: "none",
          }}
        >
          ✦
        </span>
      </button>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          data-ocid="sage.modal"
          className="fixed z-[60] flex flex-col"
          style={{
            left: `${panelLeft}px`,
            top: `${panelTop}px`,
            width: `${panelWidth}px`,
            height: `${panelHeight}px`,
            background:
              "linear-gradient(180deg, rgba(10,0,21,0.98) 0%, rgba(0,0,0,0.98) 100%)",
            border: "1px solid rgba(142,45,226,0.3)",
            boxShadow:
              "0 0 40px rgba(142,45,226,0.2), 0 0 80px rgba(255,215,0,0.08)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{
              borderBottom: "1px solid rgba(142,45,226,0.2)",
              background: "rgba(142,45,226,0.08)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,215,0,0.4), rgba(142,45,226,0.5))",
                  boxShadow: "0 0 10px rgba(142,45,226,0.5)",
                }}
              >
                <span style={{ fontSize: "12px" }}>✦</span>
              </div>
              <div>
                <div className="text-void-gold font-bold text-sm tracking-wider">
                  VOID Sage ✦
                </div>
                <div className="text-white/30 text-xs">
                  Private · E2EE · Cosmic AI
                </div>
              </div>
            </div>
            <button
              type="button"
              data-ocid="sage.close_button"
              onClick={() => setIsOpen(false)}
              aria-label="Close VOID Sage"
              className="text-white/30 hover:text-white/70 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "sage" && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-2 mt-0.5"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(255,215,0,0.3), rgba(142,45,226,0.4))",
                      boxShadow: "0 0 8px rgba(142,45,226,0.4)",
                    }}
                  >
                    <span style={{ fontSize: "10px" }}>✦</span>
                  </div>
                )}
                <div
                  className="max-w-[80%] px-3 py-2.5 text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "rgba(255,215,0,0.12)",
                          border: "1px solid rgba(255,215,0,0.3)",
                          color: "rgba(255,255,255,0.9)",
                        }
                      : {
                          background: "rgba(142,45,226,0.12)",
                          border: "1px solid rgba(142,45,226,0.25)",
                          color: "rgba(255,255,255,0.85)",
                          fontStyle: "italic",
                        }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(255,215,0,0.3), rgba(142,45,226,0.4))",
                    boxShadow: "0 0 8px rgba(142,45,226,0.4)",
                  }}
                >
                  <span style={{ fontSize: "10px" }}>✦</span>
                </div>
                <div
                  className="px-3 py-2 flex items-center gap-1"
                  style={{
                    background: "rgba(142,45,226,0.12)",
                    border: "1px solid rgba(142,45,226,0.25)",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-void-purple/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Privacy note */}
          <div
            className="px-4 py-1.5 shrink-0"
            style={{ borderTop: "1px solid rgba(255,215,0,0.06)" }}
          >
            <p className="text-white/20 text-xs text-center">
              Session only · Not stored · E2EE spirit
            </p>
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-3 shrink-0"
            style={{
              borderTop: "1px solid rgba(142,45,226,0.15)",
              background: "rgba(0,0,0,0.4)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              data-ocid="sage.input"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask the void, ${shortId}...`}
              className="flex-1 bg-transparent border border-void-gold/20 text-white placeholder:text-white/20 px-3 py-2 text-sm focus:outline-none focus:border-void-gold/40 transition-colors"
              style={{ fontSize: "16px" }} // prevent iOS zoom
            />
            <button
              type="button"
              data-ocid="sage.submit_button"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              aria-label="Send to Sage"
              className="text-void-gold/60 hover:text-void-gold transition-colors disabled:opacity-30 p-1"
            >
              <span style={{ fontSize: "18px" }}>✦</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
