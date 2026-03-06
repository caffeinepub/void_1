/**
 * MiningPage — Full crypto dashboard teaser for the future VOID Token.
 * Shows tokenomics, proof-of-wisdom steps, user progress, and launch CTA.
 */
import { Check, Lock, Share2, X, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetWisdomScore } from "../hooks/useQueries";
import { useVoidId } from "../hooks/useVoidId";

// ─── Static star field ────────────────────────────────────────────────────────
const STAR_POSITIONS = Array.from({ length: 50 }, (_, i) => ({
  id: `star-${i}`,
  size: (i % 3) * 0.6 + 1,
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 100,
  opacity: 0.08 + (i % 5) * 0.06,
  duration: 2.5 + (i % 5) * 0.8,
  delay: (i % 7) * 0.5,
}));

// ─── Animated Orb ────────────────────────────────────────────────────────────
function CosmicOrb() {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 360, height: 360 }}
    >
      {/* Outer rings */}
      {[320, 280, 240, 200].map((size, i) => (
        <div
          key={size}
          className="absolute rounded-full border border-void-gold/10"
          style={{
            width: size,
            height: size,
            animation: `nebula-pulse ${3 + i * 0.6}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      {/* Mid purple ring */}
      <div
        className="absolute rounded-full border border-void-purple/15"
        style={{
          width: 180,
          height: 180,
          animation: "nebula-pulse 2.5s ease-in-out infinite",
          animationDelay: "0.3s",
        }}
      />

      {/* Nebula glow halo */}
      <div
        className="absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          background:
            "radial-gradient(circle, rgba(255,215,0,0.18) 0%, rgba(142,45,226,0.12) 40%, transparent 70%)",
          filter: "blur(24px)",
          animation: "nebula-pulse 3s ease-in-out infinite",
        }}
      />

      {/* Central orb */}
      <div
        className="relative rounded-full flex items-center justify-center z-10"
        style={{
          width: 140,
          height: 140,
          background:
            "radial-gradient(circle at 38% 32%, rgba(255,215,0,0.45), rgba(142,45,226,0.28) 52%, rgba(74,0,255,0.18) 100%)",
          boxShadow:
            "0 0 50px rgba(255,215,0,0.25), 0 0 100px rgba(142,45,226,0.15), inset 0 0 40px rgba(255,215,0,0.08)",
          border: "1px solid rgba(255,215,0,0.35)",
          animation: "nebula-pulse 2.2s ease-in-out infinite",
        }}
      >
        <span
          className="font-black text-4xl"
          style={{
            color: "#FFD700",
            textShadow:
              "0 0 24px rgba(255,215,0,0.9), 0 0 50px rgba(255,215,0,0.4)",
          }}
        >
          ₮
        </span>
      </div>

      {/* Orbiting particles */}
      <OrbitingParticle
        radius={155}
        speed={8}
        color="#FFD700"
        size={10}
        startAngle={0}
      />
      <OrbitingParticle
        radius={140}
        speed={12}
        color="#8e2de2"
        size={7}
        startAngle={120}
      />
      <OrbitingParticle
        radius={165}
        speed={15}
        color="#FFD700"
        size={5}
        startAngle={240}
      />
    </div>
  );
}

function OrbitingParticle({
  radius,
  speed,
  color,
  size,
  startAngle,
}: {
  radius: number;
  speed: number;
  color: string;
  size: number;
  startAngle: number;
}) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, ${color}88)`,
        boxShadow: `0 0 ${size * 1.5}px ${color}cc`,
        animation: `orbit-${startAngle} ${speed}s linear infinite`,
        transformOrigin: "center center",
        // Fallback — orbit via CSS transform in keyframes
        transform: `rotate(${startAngle}deg) translateX(${radius}px)`,
        animationName: "none", // Driven by inline style + keyframe below
      }}
    >
      <style>{`
        @keyframes orbit-${startAngle}-${radius} {
          from { transform: rotate(${startAngle}deg) translateX(${radius}px); }
          to   { transform: rotate(${startAngle + 360}deg) translateX(${radius}px); }
        }
      `}</style>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}, ${color}88)`,
          boxShadow: `0 0 ${size * 1.5}px ${color}cc`,
          animation: `orbit-${startAngle}-${radius} ${speed}s linear infinite`,
          position: "absolute",
        }}
      />
    </div>
  );
}

// ─── Tokenomics Cards ─────────────────────────────────────────────────────────
const TOKENOMICS = [
  {
    id: "supply",
    icon: "₮",
    label: "MAX SUPPLY",
    value: "21,000,000",
    sub: "VOID Tokens",
    color: "void-gold",
  },
  {
    id: "distribution",
    icon: "◎",
    label: "DISTRIBUTION",
    value: "70 / 20 / 10",
    sub: "Community / Dev / Reserve",
    color: "void-purple",
  },
  {
    id: "launch",
    icon: "🔒",
    label: "LAUNCH",
    value: "Phase 2",
    sub: "Post-MVP · Coming Soon",
    color: "white",
  },
];

// ─── Proof-of-Wisdom Steps ────────────────────────────────────────────────────
const STEPS = [
  {
    id: "post",
    num: "01",
    label: "Post Wisdom",
    desc: "Share insights in Light Room",
    active: true,
  },
  {
    id: "earn",
    num: "02",
    label: "Earn Upvotes",
    desc: "Community validates your truth",
    active: true,
  },
  {
    id: "score",
    num: "03",
    label: "Build Score",
    desc: "Wisdom Score accumulates",
    active: false,
  },
  {
    id: "mine",
    num: "04",
    label: "Mine VOID",
    desc: "Convert wisdom into tokens",
    active: false,
  },
];

// ─── Tokenomics Modal ─────────────────────────────────────────────────────────
function TokenomicsModal({ onClose }: { onClose: () => void }) {
  return (
    <dialog
      aria-label="Tokenomics details"
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-black/90 backdrop-blur-sm w-full h-full max-w-none max-h-none m-0 p-0 border-0"
      style={{ background: "rgba(0,0,0,0.9)" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      open
    >
      <div
        className="w-full max-w-sm mx-4 p-6"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,0,21,0.98), rgba(0,0,0,0.98))",
          border: "1px solid rgba(255,215,0,0.25)",
          boxShadow: "0 0 60px rgba(255,215,0,0.1)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-void-gold font-black tracking-[0.2em] text-lg">
            TOKENOMICS
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Supply */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: "rgba(255,215,0,0.06)",
              border: "1px solid rgba(255,215,0,0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-void-gold font-black text-lg">₮</span>
              <span className="text-white/50 text-xs tracking-wider uppercase font-mono">
                Max Supply
              </span>
            </div>
            <span className="text-void-gold font-black font-mono">
              21,000,000
            </span>
          </div>

          {/* Distribution */}
          <div
            className="px-4 py-3"
            style={{
              background: "rgba(142,45,226,0.06)",
              border: "1px solid rgba(142,45,226,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-void-purple/80 text-xs tracking-wider uppercase font-mono">
                Distribution
              </span>
              <span className="text-void-purple font-black font-mono">
                70 / 20 / 10
              </span>
            </div>
            <div className="space-y-1.5">
              {[
                {
                  label: "Community (Wisdom Earners)",
                  pct: 70,
                  color: "#FFD700",
                },
                { label: "Development Team", pct: 20, color: "#8e2de2" },
                {
                  label: "Reserve Fund",
                  pct: 10,
                  color: "rgba(255,255,255,0.4)",
                },
              ].map(({ label, pct, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/8 relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${pct}%`,
                        background: color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono w-6 text-right"
                    style={{ color }}
                  >
                    {pct}%
                  </span>
                  <span className="text-white/30 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Royalties */}
          <div
            className="px-4 py-3"
            style={{
              background: "rgba(255,215,0,0.04)",
              border: "1px solid rgba(255,215,0,0.12)",
            }}
          >
            <span className="text-void-gold/60 text-xs tracking-wider uppercase font-mono block mb-2">
              NFT Royalties
            </span>
            <p className="text-white/40 text-xs leading-relaxed">
              3% of every NFT resale flows to the original creator forever. 1%
              supports the VOID ecosystem. Fully automated on-chain.
            </p>
          </div>

          {/* Launch */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Lock size={14} className="text-white/25 shrink-0" />
            <div>
              <span className="text-white/40 text-xs tracking-wider uppercase font-mono block">
                Launch
              </span>
              <span className="text-white/60 text-xs">
                Phase 2 · Post-MVP · Coming Soon
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs font-mono mt-6 tracking-widest uppercase">
          Wisdom is the proof of work.
          <br />
          Truth is the currency.
        </p>
      </div>
    </dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MiningPage() {
  const voidId = useVoidId();
  const { data: wisdomScore } = useGetWisdomScore(voidId ?? "");
  const [notified, setNotified] = useState(() => {
    return localStorage.getItem("miningNotify") === "true";
  });
  const [justRegistered, setJustRegistered] = useState(false);
  const [showTokenomicsModal, setShowTokenomicsModal] = useState(false);

  const score = wisdomScore ? Number(wisdomScore) : 0;
  const miningThreshold = 1000;
  const progressPct = Math.min((score / miningThreshold) * 100, 100);

  const handleNotify = () => {
    localStorage.setItem("miningNotify", "true");
    setNotified(true);
    setJustRegistered(true);
    setTimeout(() => setJustRegistered(false), 3000);
  };

  const handleShare = () => {
    const text = "Earn VOID tokens by sharing wisdom. Mining launches soon.";
    if (navigator.share) {
      navigator
        .share({ title: "VOID Token", text, url: window.location.href })
        .catch(() => {});
    } else {
      navigator.clipboard
        .writeText(`${text} ${window.location.href}`)
        .then(() => {
          toast.success("Link copied to clipboard");
        })
        .catch(() => {});
    }
  };

  return (
    <div className="min-h-full void-bg flex flex-col items-center justify-start pb-16 pt-8 px-4 overflow-x-hidden relative">
      {/* Background stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STAR_POSITIONS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-void-gold"
            style={{
              width: `${star.size}px`,
              height: `${star.size}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              opacity: star.opacity,
              animation: `nebula-pulse ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
        {/* Nebula blobs */}
        <div
          className="absolute"
          style={{
            top: "10%",
            left: "60%",
            width: 400,
            height: 300,
            background:
              "radial-gradient(ellipse, rgba(142,45,226,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "-10%",
            width: 350,
            height: 250,
            background:
              "radial-gradient(ellipse, rgba(255,215,0,0.05) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* ── Status Badge ── */}
      <div className="relative z-10 mb-6 nebula-fade-in">
        <div
          className="inline-flex items-center gap-2 px-5 py-2 border border-void-gold/30 bg-void-gold/8"
          style={{ background: "rgba(255,215,0,0.06)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-void-gold animate-pulse" />
          <span className="text-void-gold text-xs tracking-[0.25em] uppercase font-mono font-semibold">
            Phase 2 · Coming Soon
          </span>
        </div>
      </div>

      {/* ── Hero Title ── */}
      <div className="relative z-10 text-center mb-10 nebula-fade-in">
        <h1 className="void-glow-text text-6xl md:text-8xl font-black tracking-[0.25em] mb-3 leading-none">
          VOID TOKEN
        </h1>
        <p className="text-white/45 text-base md:text-lg font-mono tracking-[0.1em]">
          The currency of wisdom
        </p>
      </div>

      {/* ── Animated Orb ── */}
      <div className="relative z-10 mb-10 flex items-center justify-center">
        <CosmicOrb />
      </div>

      {/* ── Tokenomics Grid ── */}
      <div className="relative z-10 w-full max-w-2xl mb-10 px-2">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-white/25 text-xs tracking-[0.25em] uppercase font-mono">
            Tokenomics
          </div>
          <button
            type="button"
            data-ocid="mining.secondary_button"
            onClick={() => setShowTokenomicsModal(true)}
            className="text-void-gold/40 text-xs tracking-wider hover:text-void-gold/70 transition-colors font-mono border border-void-gold/15 px-2 py-0.5 hover:border-void-gold/30"
          >
            Details →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOKENOMICS.map((card) => (
            <div
              key={card.id}
              className="relative border border-void-gold/10 bg-void-deep/60 backdrop-blur-sm p-5 flex flex-col items-center gap-2 group overflow-hidden hover:border-void-gold/20 transition-colors"
            >
              {/* Corner lock */}
              <div className="absolute top-2.5 right-2.5">
                <Lock size={11} className="text-white/15" />
              </div>

              {/* Hover glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "radial-gradient(ellipse at top, rgba(255,215,0,0.04), transparent 70%)",
                }}
              />

              {/* Icon */}
              <div
                className="text-2xl font-black"
                style={{
                  color:
                    card.color === "void-gold"
                      ? "#FFD700"
                      : card.color === "void-purple"
                        ? "#8e2de2"
                        : "rgba(255,255,255,0.4)",
                  textShadow:
                    card.color === "void-gold"
                      ? "0 0 16px rgba(255,215,0,0.5)"
                      : card.color === "void-purple"
                        ? "0 0 16px rgba(142,45,226,0.5)"
                        : "none",
                }}
              >
                {card.icon}
              </div>

              {/* Label */}
              <div className="text-white/30 text-xs tracking-[0.2em] uppercase font-mono text-center">
                {card.label}
              </div>

              {/* Value */}
              <div
                className="font-black font-mono text-xl text-center"
                style={{
                  color:
                    card.color === "void-gold"
                      ? "rgba(255,215,0,0.9)"
                      : card.color === "void-purple"
                        ? "rgba(142,45,226,0.9)"
                        : "rgba(255,255,255,0.6)",
                }}
              >
                {card.value}
              </div>

              {/* Sub */}
              <div className="text-white/25 text-xs text-center leading-snug">
                {card.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Proof of Wisdom Timeline ── */}
      <div className="relative z-10 w-full max-w-2xl mb-10 px-2">
        <div className="text-white/25 text-xs tracking-[0.25em] uppercase font-mono text-center mb-5">
          Proof of Wisdom
        </div>

        {/* Desktop: horizontal scroll; Mobile: stacked */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-0 sm:overflow-x-auto sm:pb-2">
          {STEPS.map((step, idx) => (
            <div
              key={step.id}
              className="flex sm:flex-col items-center sm:items-start flex-1 min-w-0"
            >
              {/* Step card */}
              <div
                className={`flex-1 sm:w-full border p-4 transition-colors ${
                  step.active
                    ? "border-void-gold/25 bg-void-gold/5"
                    : "border-white/8 bg-void-deep/40"
                }`}
              >
                <div
                  className={`text-xs font-mono tracking-widest mb-1 ${step.active ? "text-void-gold/60" : "text-white/20"}`}
                >
                  {step.num}
                </div>
                <div
                  className={`font-semibold text-sm tracking-wide mb-1 ${step.active ? "text-white/90" : "text-white/35"}`}
                >
                  {step.label}
                </div>
                <div
                  className={`text-xs leading-relaxed ${step.active ? "text-white/45" : "text-white/20"}`}
                >
                  {step.desc}
                </div>
              </div>

              {/* Arrow connector (not after last item) */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`sm:flex hidden items-center justify-center px-1 pt-6 shrink-0 ${
                    STEPS[idx + 1].active
                      ? "text-void-gold/40"
                      : "text-white/15"
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    role="presentation"
                  >
                    <title>Next step</title>
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Your Progress ── */}
      <div className="relative z-10 w-full max-w-2xl mb-10 px-2">
        <div className="border border-void-gold/10 bg-void-deep/60 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-white/25 text-xs tracking-[0.25em] uppercase font-mono">
              Your Progress
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-void-gold font-black font-mono text-xl">
                {score.toLocaleString()}
              </span>
              <span className="text-white/30 text-xs font-mono">WS</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-white/8 rounded-none overflow-hidden mb-3">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #DAA520, #FFD700)",
                boxShadow:
                  progressPct > 5 ? "0 0 12px rgba(255,215,0,0.4)" : "none",
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-white/25 font-mono">
              {score.toLocaleString()} / {miningThreshold.toLocaleString()} WS
              required
            </span>
            <span className="text-white/25 font-mono">
              {progressPct.toFixed(0)}%
            </span>
          </div>

          {score === 0 ? (
            <p className="text-white/30 text-xs mt-3 leading-relaxed border-t border-white/5 pt-3">
              Start sharing wisdom in the Light Room to begin your journey.
            </p>
          ) : score >= miningThreshold ? (
            <p className="text-void-gold/70 text-xs mt-3 leading-relaxed border-t border-void-gold/10 pt-3 flex items-center gap-1.5">
              <Check size={12} />
              Mining threshold reached — you'll be first in line.
            </p>
          ) : (
            <p className="text-white/30 text-xs mt-3 leading-relaxed border-t border-white/5 pt-3">
              {(miningThreshold - score).toLocaleString()} more Wisdom Score
              needed to start mining.
            </p>
          )}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 mb-8">
        {!notified ? (
          <button
            type="button"
            onClick={handleNotify}
            className="void-btn-primary px-8 py-4 text-sm tracking-[0.2em] uppercase font-mono flex items-center gap-2"
            style={{ boxShadow: "0 0 30px rgba(255,215,0,0.12)" }}
          >
            <Zap size={16} />
            Notify Me at Launch
          </button>
        ) : (
          <div
            className="px-8 py-4 border border-void-gold/30 bg-void-gold/10 flex items-center gap-2"
            style={{ boxShadow: "0 0 20px rgba(255,215,0,0.08)" }}
          >
            <span className="text-void-gold text-lg">✦</span>
            <span className="text-void-gold text-sm tracking-wider font-mono">
              {justRegistered
                ? "You'll be the first to know"
                : "Registered for launch"}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 px-6 py-4 border border-white/15 text-white/40 hover:text-white/70 hover:border-white/25 transition-colors text-sm tracking-wider font-mono"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>

      {/* Manifesto quote */}
      <p
        className="relative z-10 text-center text-white/20 text-xs tracking-[0.2em] uppercase font-mono max-w-xs"
        style={{ textShadow: "0 0 10px rgba(255,215,0,0.08)" }}
      >
        Wisdom is the proof of work.
        <br />
        Truth is the currency.
      </p>

      {/* Tokenomics modal */}
      {showTokenomicsModal && (
        <TokenomicsModal onClose={() => setShowTokenomicsModal(false)} />
      )}
    </div>
  );
}
