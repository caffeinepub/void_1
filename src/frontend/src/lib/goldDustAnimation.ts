/**
 * Gold dust particle animation — triggered on message send.
 * Uses CSS-injected particles for performance.
 * 24 particles, bigger explosion burst with gold + white sparkle mix.
 */

let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes goldDustFloat {
      0% { transform: translate(0, 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
    }
    .gold-dust-particle {
      position: fixed;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: radial-gradient(circle, #FFD700, #DAA520);
      box-shadow: 0 0 8px 3px #FFD70099;
      pointer-events: none;
      z-index: 9999;
      animation: goldDustFloat 1.0s ease-out forwards;
    }
    .gold-dust-white {
      background: radial-gradient(circle, #ffffff, #FFD700);
      box-shadow: 0 0 8px 3px #ffffff88;
    }
  `;
  document.head.appendChild(style);
}

export function triggerGoldDust(element: HTMLElement) {
  injectStyles();
  const rect = element.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const count = 24;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className =
      i % 4 === 0 ? "gold-dust-particle gold-dust-white" : "gold-dust-particle";

    const angle = (i / count) * 2 * Math.PI + Math.random() * 0.8;
    const distance = 40 + Math.random() * 80;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 30; // bias upward

    particle.style.left = `${originX - 4}px`;
    particle.style.top = `${originY - 4}px`;
    particle.style.setProperty("--dx", `${dx}px`);
    particle.style.setProperty("--dy", `${dy}px`);
    particle.style.animationDelay = `${Math.random() * 0.1}s`;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1200);
  }
}
