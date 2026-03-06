/**
 * PolarityGarden — A CSS-only garden that blooms based on the user's Wisdom Score.
 * Golden lotuses = Light wisdom. Purple night flowers = Dark shadow work.
 */

interface GardenFlower {
  id: string;
  type: "lotus" | "night";
  x: number; // % from left
  delay: number; // animation delay seconds
  scale: number; // size scale
  glowing: boolean;
}

function generateFlowers(wisdomScore: number): GardenFlower[] {
  const flowers: GardenFlower[] = [];

  if (wisdomScore <= 0) return flowers;

  // Determine how many flowers based on WS tiers
  let count = 0;
  if (wisdomScore >= 500) count = 9;
  else if (wisdomScore >= 200) count = 7;
  else if (wisdomScore >= 100) count = 5;
  else if (wisdomScore >= 50) count = 3;
  else if (wisdomScore >= 10) count = 2;
  else count = 1;

  for (let i = 0; i < count; i++) {
    const r = Math.sin(i * 7.3 + 3) * 0.5 + 0.5; // deterministic 0–1
    const r2 = Math.sin(i * 13.7 + 5) * 0.5 + 0.5;
    flowers.push({
      id: `flower-${i}`,
      type: i % 3 === 0 ? "night" : "lotus",
      x: 10 + r * 80, // 10%–90%
      delay: r2 * 2,
      scale: 0.6 + r * 0.5,
      glowing: wisdomScore >= 100 && i % 2 === 0,
    });
  }
  return flowers;
}

interface LotusProps {
  scale: number;
  glowing: boolean;
}

function LotusFlower({ scale, glowing }: LotusProps) {
  const s = scale * 24; // base size in px
  const color = "#FFD700";
  const glowStyle = glowing
    ? `0 0 ${s * 0.8}px rgba(255,215,0,0.5), 0 0 ${s * 1.5}px rgba(255,215,0,0.2)`
    : "none";

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: s * 2, height: s * 2.5 }}
    >
      {/* Petals */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <div
          key={angle}
          className="absolute"
          style={{
            width: s * 0.6,
            height: s * 1.1,
            borderRadius: "50% 50% 0 50%",
            background: `radial-gradient(ellipse at 40% 30%, rgba(255,230,50,0.9), ${color}88)`,
            boxShadow: glowStyle,
            top: "50%",
            left: "50%",
            transformOrigin: "0% 100%",
            transform: `rotate(${angle}deg) translateY(-100%)`,
            opacity: 0.85,
          }}
        />
      ))}
      {/* Center */}
      <div
        className="absolute"
        style={{
          width: s * 0.7,
          height: s * 0.7,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,255,100,0.95), ${color})`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: glowStyle,
          zIndex: 2,
        }}
      />
      {/* Stem */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 2,
          height: s * 0.8,
          background: "rgba(100,180,80,0.6)",
        }}
      />
    </div>
  );
}

function NightFlower({ scale, glowing }: LotusProps) {
  const s = scale * 20;
  const color = "#8e2de2";
  const glowStyle = glowing
    ? `0 0 ${s * 0.8}px rgba(142,45,226,0.6), 0 0 ${s * 1.5}px rgba(74,0,255,0.2)`
    : "none";

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: s * 2, height: s * 2.5 }}
    >
      {/* Petals — 6 elongated */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <div
          key={angle}
          className="absolute"
          style={{
            width: s * 0.45,
            height: s * 1.2,
            borderRadius: "50% 50% 50% 0",
            background: `radial-gradient(ellipse at 30% 20%, rgba(178,102,255,0.9), ${color}aa)`,
            boxShadow: glowStyle,
            top: "50%",
            left: "50%",
            transformOrigin: "0% 100%",
            transform: `rotate(${angle}deg) translateY(-100%)`,
            opacity: 0.9,
          }}
        />
      ))}
      {/* Center */}
      <div
        className="absolute"
        style={{
          width: s * 0.55,
          height: s * 0.55,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(200,150,255,0.95), ${color})`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: glowStyle,
          zIndex: 2,
        }}
      />
      {/* Stem */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 2,
          height: s * 0.7,
          background: "rgba(100,80,140,0.5)",
        }}
      />
    </div>
  );
}

interface PolarityGardenProps {
  wisdomScore: number;
}

export default function PolarityGarden({ wisdomScore }: PolarityGardenProps) {
  const flowers = generateFlowers(wisdomScore);
  const isBlossoming = wisdomScore >= 500;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-void-gold/60 text-xs uppercase tracking-widest">
          Polarity Garden ✦
        </span>
        {isBlossoming && (
          <span
            className="text-xs tracking-wide px-2 py-0.5"
            style={{
              background: "rgba(255,215,0,0.1)",
              border: "1px solid rgba(255,215,0,0.3)",
              color: "rgba(255,215,0,0.8)",
            }}
          >
            In Full Bloom
          </span>
        )}
      </div>

      {/* Garden container */}
      <div
        className="relative overflow-hidden"
        style={{
          width: "100%",
          height: "180px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(5,0,15,0.9) 70%, rgba(10,5,0,0.95) 100%)",
          border: "1px solid rgba(255,215,0,0.1)",
          boxShadow: isBlossoming
            ? "inset 0 0 30px rgba(255,215,0,0.05), inset 0 0 60px rgba(142,45,226,0.04)"
            : "none",
        }}
      >
        {/* Ground */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "20px",
            background:
              "linear-gradient(180deg, transparent, rgba(20,10,0,0.8))",
          }}
        />

        {/* Soil glow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            height: "8px",
            background:
              wisdomScore > 0
                ? "radial-gradient(ellipse, rgba(255,215,0,0.1) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(100,80,50,0.15) 0%, transparent 70%)",
            filter: "blur(4px)",
          }}
        />

        {/* Seed glow (0 WS state) */}
        {wisdomScore === 0 && (
          <div
            className="absolute"
            style={{
              bottom: "16px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "rgba(255,215,0,0.3)",
              boxShadow: "0 0 12px rgba(255,215,0,0.2)",
              animation: "nebula-pulse 3s ease-in-out infinite",
            }}
          />
        )}

        {/* Flowers */}
        {flowers.map((flower) => (
          <div
            key={flower.id}
            className="polarity-flower polarity-flower-bloom absolute"
            style={{
              left: `${flower.x}%`,
              bottom: "20px",
              transform: "translateX(-50%)",
              animationDelay: `${flower.delay}s, ${flower.delay * 0.3}s`,
            }}
          >
            {flower.type === "lotus" ? (
              <LotusFlower scale={flower.scale} glowing={flower.glowing} />
            ) : (
              <NightFlower scale={flower.scale} glowing={flower.glowing} />
            )}
          </div>
        ))}

        {/* Ambient nebula glow for high WS */}
        {wisdomScore >= 200 && (
          <>
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: "20%",
                width: "100px",
                height: "60px",
                background:
                  "radial-gradient(ellipse, rgba(255,215,0,0.05), transparent)",
                filter: "blur(20px)",
                animation: "nebula-pulse 4s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "15%",
                width: "80px",
                height: "50px",
                background:
                  "radial-gradient(ellipse, rgba(142,45,226,0.06), transparent)",
                filter: "blur(20px)",
                animation: "nebula-pulse 5s ease-in-out infinite 1s",
              }}
            />
          </>
        )}

        {/* WS label */}
        <div
          className="absolute top-2 right-2 text-xs font-mono"
          style={{ color: "rgba(255,215,0,0.3)" }}
        >
          {wisdomScore} WS
        </div>
      </div>

      <p className="text-white/25 text-xs mt-2 text-center leading-relaxed">
        {wisdomScore === 0
          ? "Plant your first seed — share wisdom in the rooms."
          : wisdomScore < 10
            ? `${10 - wisdomScore} WS until first bloom.`
            : wisdomScore < 50
              ? `${50 - wisdomScore} WS until next bloom.`
              : wisdomScore < 100
                ? `${100 - wisdomScore} WS until your garden awakens.`
                : wisdomScore < 200
                  ? `${200 - wisdomScore} WS until deeper bloom.`
                  : wisdomScore < 500
                    ? `${500 - wisdomScore} WS until Full Bloom — and NFT minting unlocks.`
                    : "Your garden blooms in full radiance. NFT minting unlocked. ✦"}
      </p>
    </div>
  );
}
