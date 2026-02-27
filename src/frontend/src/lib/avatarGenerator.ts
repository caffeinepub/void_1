/**
 * Deterministic cosmic avatar generator for VOID IDs.
 * Produces SVG-based sacred geometry avatars from a hash of the VOID ID.
 */

function hashVoidId(voidId: string): number[] {
  const hashes: number[] = [];
  let h = 5381;
  for (let i = 0; i < voidId.length; i++) {
    h = ((h << 5) + h) ^ voidId.charCodeAt(i);
    h = h & h;
  }
  // Generate multiple hash values for different visual properties
  for (let seed = 0; seed < 8; seed++) {
    let v = h ^ (seed * 2654435761);
    v = ((v >>> 16) ^ v) * 0x45d9f3b;
    v = ((v >>> 16) ^ v) * 0x45d9f3b;
    v = (v >>> 16) ^ v;
    hashes.push(Math.abs(v));
  }
  return hashes;
}

const COSMIC_COLORS = [
  "#FFD700", // gold
  "#DAA520", // dark gold
  "#8e2de2", // purple
  "#4a00ff", // deep purple
  "#c084fc", // light purple
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#60a5fa", // blue
];

export function generateAvatar(voidId: string): string {
  const hashes = hashVoidId(voidId);
  const size = 64;
  const cx = size / 2;
  const cy = size / 2;

  const primaryColor = COSMIC_COLORS[hashes[0] % COSMIC_COLORS.length];
  const secondaryColor = COSMIC_COLORS[hashes[1] % COSMIC_COLORS.length];
  const accentColor = COSMIC_COLORS[hashes[2] % COSMIC_COLORS.length];

  const numPoints = 5 + (hashes[3] % 4); // 5-8 points
  const outerR = 24 + (hashes[4] % 6);
  const innerR = 10 + (hashes[5] % 6);
  const rotation = (hashes[6] % 360) * (Math.PI / 180);

  // Generate star polygon points
  const starPoints: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints + rotation;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle - Math.PI / 2);
    const y = cy + r * Math.sin(angle - Math.PI / 2);
    starPoints.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  // Concentric circles for sacred geometry feel
  const ring1R = 28 + (hashes[7] % 4);
  const ring2R = 18 + (hashes[0] % 4);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="bg_${hashes[0]}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#0a0015" stop-opacity="1"/>
      </radialGradient>
      <filter id="glow_${hashes[0]}">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${cx}" fill="url(#bg_${hashes[0]})"/>
    <circle cx="${cx}" cy="${cy}" r="${ring1R}" fill="none" stroke="${secondaryColor}" stroke-width="0.5" opacity="0.4"/>
    <circle cx="${cx}" cy="${cy}" r="${ring2R}" fill="none" stroke="${accentColor}" stroke-width="0.5" opacity="0.4"/>
    <polygon points="${starPoints.join(" ")}" fill="${primaryColor}" opacity="0.85" filter="url(#glow_${hashes[0]})"/>
    <circle cx="${cx}" cy="${cy}" r="4" fill="${accentColor}" opacity="0.9"/>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Cache to avoid regeneration
const avatarCache = new Map<string, string>();

export function getCachedAvatar(voidId: string): string {
  if (!avatarCache.has(voidId)) {
    avatarCache.set(voidId, generateAvatar(voidId));
  }
  return avatarCache.get(voidId)!;
}
