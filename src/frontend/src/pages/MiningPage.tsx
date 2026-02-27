/**
 * MiningPage — Cosmic teaser for the future VOID Token mining feature.
 * Users can register interest. Mining is not yet active.
 */
import { useState, useEffect } from 'react';
import { Zap, Lock, Cpu, TrendingUp, Star } from 'lucide-react';

// ─── Animation constants ──────────────────────────────────────────────────────
const PULSE_RING_COUNT = 4;

// ─── Pre-computed pulse rings ─────────────────────────────────────────────────
const PULSE_RINGS = Array.from({ length: PULSE_RING_COUNT }, (_, i) => ({
  id: `ring-${i}`,
  size: 120 + i * 40,
  opacity: 0.6 - i * 0.12,
  duration: 2 + i * 0.7,
  delay: i * 0.4,
}));

// ─── Static star field (seeded deterministically — no Math.random on render) ─
const STAR_POSITIONS = Array.from({ length: 40 }, (_, i) => ({
  id: `star-${i}`,
  size: (i % 3) * 0.5 + 1.2,
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 100,
  opacity: 0.1 + (i % 5) * 0.07,
  duration: 2 + (i % 5) * 0.8,
  delay: (i % 7) * 0.6,
}));

// ─── Stat card data ───────────────────────────────────────────────────────────
const STAT_CARDS = [
  {
    id: 'tokens-earned',
    iconType: 'zap' as const,
    label: 'Tokens Earned',
    value: '—',
  },
  {
    id: 'wisdom-multiplier',
    iconType: 'trending' as const,
    label: 'Wisdom Multiplier',
    value: '×1',
  },
  {
    id: 'mining-rate',
    iconType: 'cpu' as const,
    label: 'Daily Mining Rate',
    value: '—',
  },
];

function StatIcon({ type }: { type: 'zap' | 'trending' | 'cpu' }) {
  if (type === 'zap') return <Zap size={20} />;
  if (type === 'trending') return <TrendingUp size={20} />;
  return <Cpu size={20} />;
}

// ─── How mining works items ───────────────────────────────────────────────────
const HOW_ITEMS = [
  { id: 'light', icon: '☀️', text: 'Post wisdom in Light Room → earn VOID tokens' },
  { id: 'dark', icon: '🌑', text: 'Deep shadow work in Dark Room → bonus multiplier' },
  { id: 'upvote', icon: '⬆️', text: 'Receive upvotes → increase your Wisdom Score' },
  { id: 'diamond', icon: '💎', text: 'High Wisdom Score → higher daily mining rate' },
];

export default function MiningPage() {
  const [notified, setNotified] = useState(() => {
    return localStorage.getItem('miningNotify') === 'true';
  });
  const [justRegistered, setJustRegistered] = useState(false);
  const [orbPhase, setOrbPhase] = useState(0);

  // Animate orb phase for cosmic breathing effect
  useEffect(() => {
    const interval = setInterval(() => {
      setOrbPhase((p) => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleNotify = () => {
    localStorage.setItem('miningNotify', 'true');
    setNotified(true);
    setJustRegistered(true);
    setTimeout(() => setJustRegistered(false), 3000);
  };

  return (
    <div className="min-h-full void-bg flex flex-col items-center justify-start pb-8 pt-8 px-4 overflow-hidden relative">
      {/* Background star field */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STAR_POSITIONS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-void-gold"
            style={{
              width: star.size + 'px',
              height: star.size + 'px',
              left: star.left + '%',
              top: star.top + '%',
              opacity: star.opacity,
              animation: `nebula-pulse ${star.duration}s ease-in-out infinite`,
              animationDelay: star.delay + 's',
            }}
          />
        ))}
      </div>

      {/* Page header */}
      <div className="relative z-10 text-center mb-10 nebula-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-void-gold/20 bg-void-gold/5 mb-6">
          <Zap size={12} className="text-void-gold" />
          <span className="text-void-gold/60 text-xs tracking-[0.2em] uppercase font-mono">
            Future Feature
          </span>
        </div>

        <h1 className="void-glow-text text-5xl md:text-7xl font-black tracking-[0.3em] mb-3">
          VOID TOKEN
        </h1>
        <p className="text-white/50 text-base md:text-lg max-w-md mx-auto leading-relaxed">
          Mine VOID tokens by sharing wisdom and staying present in Light &amp; Dark rooms.
        </p>
      </div>

      {/* Nebula Orb */}
      <div className="relative z-10 flex items-center justify-center mb-12" style={{ width: 280, height: 280 }}>
        {/* Pulsing rings */}
        {PULSE_RINGS.map((ring) => (
          <div
            key={ring.id}
            className="absolute rounded-full border border-void-gold/20"
            style={{
              width: ring.size + 'px',
              height: ring.size + 'px',
              opacity: ring.opacity,
              animation: `nebula-pulse ${ring.duration}s ease-in-out infinite`,
              animationDelay: `${ring.delay}s`,
            }}
          />
        ))}

        {/* Inner nebula glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            background: `radial-gradient(circle, rgba(255,215,0,0.25) 0%, rgba(142,45,226,0.15) 40%, transparent 70%)`,
            filter: 'blur(20px)',
            animation: 'nebula-pulse 3s ease-in-out infinite',
          }}
        />

        {/* Central orb */}
        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            width: 120,
            height: 120,
            background: 'radial-gradient(circle at 40% 35%, rgba(255,215,0,0.4), rgba(142,45,226,0.3) 50%, rgba(74,0,255,0.2) 100%)',
            boxShadow: '0 0 40px rgba(255,215,0,0.3), 0 0 80px rgba(142,45,226,0.2), inset 0 0 30px rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.4)',
            animation: 'nebula-pulse 2s ease-in-out infinite',
          }}
        >
          {/* Token symbol */}
          <span
            className="font-black text-3xl tracking-widest"
            style={{
              color: '#FFD700',
              textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.4)',
              transform: `rotate(${Math.sin((orbPhase * Math.PI) / 180) * 3}deg)`,
              transition: 'transform 0.1s ease',
            }}
          >
            ₮
          </span>
        </div>

        {/* Orbiting star */}
        <div
          className="absolute w-3 h-3 rounded-full"
          style={{
            background: 'radial-gradient(circle, #FFD700, #DAA520)',
            boxShadow: '0 0 8px rgba(255,215,0,0.8)',
            transform: `rotate(${orbPhase}deg) translateX(130px)`,
            transformOrigin: 'center center',
          }}
        />
        <div
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: 'radial-gradient(circle, #8e2de2, #4a00ff)',
            boxShadow: '0 0 6px rgba(142,45,226,0.8)',
            transform: `rotate(${orbPhase * 1.5 + 120}deg) translateX(110px)`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* Locked stat cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-10 nebula-fade-in px-2">
        {STAT_CARDS.map((card, idx) => (
          <div
            key={card.id}
            className="relative border border-void-gold/10 bg-void-deep/60 backdrop-blur-sm p-5 flex flex-col items-center gap-3 group overflow-hidden"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            {/* Subtle nebula gradient */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(ellipse at top, rgba(255,215,0,0.04), transparent 70%)',
              }}
            />

            {/* Lock overlay */}
            <div className="absolute top-3 right-3">
              <Lock size={12} className="text-white/20" />
            </div>

            {/* Icon */}
            <div className="text-void-gold/30"><StatIcon type={card.iconType} /></div>

            {/* Label */}
            <div className="text-white/30 text-xs tracking-wider text-center uppercase font-mono">
              {card.label}
            </div>

            {/* Value */}
            <div className="text-white/20 text-2xl font-bold font-mono">{card.value}</div>

            {/* Coming Soon badge */}
            <div className="mt-auto px-3 py-1 border border-void-gold/15 bg-void-gold/5">
              <span className="text-void-gold/40 text-xs tracking-[0.2em] uppercase font-mono">
                Coming Soon
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="relative z-10 max-w-lg w-full mb-10 px-2">
        <div className="border border-void-gold/10 bg-void-deep/40 p-6">
          <h3 className="text-void-gold/60 text-xs tracking-[0.2em] uppercase font-mono mb-4 flex items-center gap-2">
            <Star size={12} />
            How Mining Will Work
          </h3>
          <div className="space-y-3">
            {HOW_ITEMS.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-base mt-0.5 shrink-0">{item.icon}</span>
                <span className="text-white/40 text-sm leading-relaxed">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notify Me button */}
      <div className="relative z-10 flex flex-col items-center gap-4 nebula-fade-in">
        {!notified ? (
          <button
            type="button"
            onClick={handleNotify}
            className="void-btn-primary px-10 py-4 text-sm tracking-[0.2em] uppercase font-mono"
            style={{
              boxShadow: '0 0 30px rgba(255,215,0,0.15)',
            }}
          >
            <Zap size={16} className="mr-2 inline-block" />
            Notify Me at Launch
          </button>
        ) : (
          <div
            className="px-10 py-4 border border-void-gold/30 bg-void-gold/10 flex items-center gap-3"
            style={{ boxShadow: '0 0 20px rgba(255,215,0,0.1)' }}
          >
            <span className="text-void-gold text-lg">✦</span>
            <span className="text-void-gold text-sm tracking-wider font-mono">
              {justRegistered ? "You'll be the first to know" : 'Registered for launch'}
            </span>
          </div>
        )}

        {/* Manifesto quote */}
        <p
          className="text-center text-white/25 text-xs tracking-[0.15em] uppercase font-mono max-w-xs"
          style={{ textShadow: '0 0 10px rgba(255,215,0,0.1)' }}
        >
          Wisdom is the proof of work.<br />Truth is the currency.
        </p>
      </div>
    </div>
  );
}
