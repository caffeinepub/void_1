import { memo, useEffect, useRef } from "react";

// Generates a stable random number from a seed (so stars don't move on re-render)
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface Star {
  id: string;
  x: number; // % from left
  y: number; // % from top
  size: number; // px
  opacity: number; // base opacity
  duration: number; // twinkle duration seconds
  delay: number; // animation delay seconds
  driftDuration: number;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `star-${i}`,
    x: seededRandom(i * 7) * 100,
    y: seededRandom(i * 13) * 100,
    size: seededRandom(i * 3) < 0.6 ? 1 : seededRandom(i * 3) < 0.9 ? 1.5 : 2,
    opacity: 0.2 + seededRandom(i * 5) * 0.6,
    duration: 2 + seededRandom(i * 11) * 5,
    delay: seededRandom(i * 17) * 6,
    driftDuration: 8 + seededRandom(i * 19) * 10,
  }));
}

const STARS = generateStars(160);

// A single star element rendered as an inline-styled div
function StarDot({ star }: { star: Star }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: `${star.size}px`,
        height: `${star.size}px`,
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        opacity: star.opacity,
        animation: `starTwinkle ${star.duration}s ease-in-out infinite ${star.delay}s, starDrift ${star.driftDuration}s ease-in-out infinite ${star.delay * 0.5}s`,
        willChange: "opacity, transform",
      }}
    />
  );
}

// Shooting star canvas layer
function ShootingStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    interface Shooter {
      x: number;
      y: number;
      len: number;
      speed: number;
      angle: number;
      opacity: number;
      life: number;
      maxLife: number;
    }

    const shooters: Shooter[] = [];
    let frameCount = 0;

    function spawnShooter() {
      shooters.push({
        x: Math.random() * width * 0.7,
        y: Math.random() * height * 0.4,
        len: 80 + Math.random() * 120,
        speed: 6 + Math.random() * 8,
        angle: Math.PI / 6 + (Math.random() - 0.5) * 0.3,
        opacity: 0.8 + Math.random() * 0.2,
        life: 0,
        maxLife: 40 + Math.random() * 30,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      frameCount++;
      // Spawn a shooting star roughly every 3–6 seconds
      if (frameCount % (180 + Math.floor(Math.random() * 180)) === 0) {
        spawnShooter();
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.life++;
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;

        const progress = s.life / s.maxLife;
        const alpha = s.opacity * Math.sin(Math.PI * progress);

        // Gradient tail
        const gx = s.x - Math.cos(s.angle) * s.len;
        const gy = s.y - Math.sin(s.angle) * s.len;
        const grad = ctx!.createLinearGradient(gx, gy, s.x, s.y);
        grad.addColorStop(0, "rgba(255, 215, 0, 0)");
        grad.addColorStop(0.7, `rgba(255, 215, 0, ${alpha * 0.3})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

        ctx!.beginPath();
        ctx!.moveTo(gx, gy);
        ctx!.lineTo(s.x, s.y);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        // Head glow
        const headGrad = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, 3);
        headGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        headGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = headGrad;
        ctx!.fill();

        if (s.life >= s.maxLife) shooters.splice(i, 1);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    draw();

    function handleResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.7,
      }}
    />
  );
}

// ─── Star Dust Particles ──────────────────────────────────────────────────────
interface DustParticle {
  id: string;
  x: number; // % from left
  y: number; // % from top
  size: number; // px
  color: string; // gold or purple
  opacity: number;
  duration: number; // seconds for full roam cycle
  delay: number; // animation delay
  rx1: number;
  ry1: number;
  rx2: number;
  ry2: number;
  rx3: number;
  ry3: number;
}

function generateDustParticles(count: number): DustParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `dust-${i}`,
    x: seededRandom(i * 31 + 7) * 100,
    y: seededRandom(i * 13 + 2) * 100,
    size: 3 + seededRandom(i * 17 + 3) * 4,
    color: seededRandom(i * 23 + 11) < 0.75 ? "#FFD700" : "#8e2de2",
    opacity: 0.35 + seededRandom(i * 41 + 5) * 0.4,
    duration: 20 + seededRandom(i * 37 + 9) * 20,
    delay: seededRandom(i * 29 + 13) * -30,
    rx1: (seededRandom(i * 43 + 1) - 0.5) * 120,
    ry1: (seededRandom(i * 47 + 2) - 0.5) * 120,
    rx2: (seededRandom(i * 53 + 3) - 0.5) * 120,
    ry2: (seededRandom(i * 59 + 4) - 0.5) * 120,
    rx3: (seededRandom(i * 61 + 5) - 0.5) * 120,
    ry3: (seededRandom(i * 67 + 6) - 0.5) * 120,
  }));
}

const DUST_PARTICLES = generateDustParticles(120);

// 4-pointed cross-star clip path
const STAR_CLIP =
  "polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)";

function StarDustLayer() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {DUST_PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            clipPath: STAR_CLIP,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            opacity: p.opacity,
            ["--rx1" as string]: `${p.rx1}px`,
            ["--ry1" as string]: `${p.ry1}px`,
            ["--rx2" as string]: `${p.rx2}px`,
            ["--ry2" as string]: `${p.ry2}px`,
            ["--rx3" as string]: `${p.rx3}px`,
            ["--ry3" as string]: `${p.ry3}px`,
            animation: `starDriftRoam ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

/**
 * CosmicBackground — renders behind everything:
 *  • Solid void-black base
 *  • Animated nebula blobs (CSS)
 *  • 160 twinkling CSS stars
 *  • Canvas shooting-star layer
 *  • Star dust floating particles
 */
const CosmicBackground = memo(function CosmicBackground() {
  return (
    <>
      {/* Hard black base — prevents any white flash */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#000000",
          zIndex: -2,
        }}
      />

      {/* Nebula shimmer blobs */}
      <div className="nebula-shimmer-layer" style={{ zIndex: -1 }}>
        <div className="nebula-blob-1" />
        <div className="nebula-blob-2" />
        <div className="nebula-blob-3" />
      </div>

      {/* Star field */}
      <div className="star-field-layer" style={{ zIndex: -1 }}>
        {STARS.map((star) => (
          <StarDot key={star.id} star={star} />
        ))}
      </div>

      {/* Shooting stars canvas */}
      <ShootingStars />

      {/* Star dust floating particles */}
      <StarDustLayer />
    </>
  );
});

export default CosmicBackground;
