/**
 * Gold dust particle animation — triggered on message send.
 * Uses CSS-injected particles for performance.
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
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: radial-gradient(circle, #FFD700, #DAA520);
      box-shadow: 0 0 6px 2px #FFD70088;
      pointer-events: none;
      z-index: 9999;
      animation: goldDustFloat 0.9s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}

export function triggerGoldDust(element: HTMLElement) {
  injectStyles();
  const rect = element.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const count = 12;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.className = "gold-dust-particle";

    const angle = (i / count) * 2 * Math.PI + Math.random() * 0.5;
    const distance = 30 + Math.random() * 50;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - 20; // bias upward

    particle.style.left = `${originX - 3}px`;
    particle.style.top = `${originY - 3}px`;
    particle.style.setProperty("--dx", `${dx}px`);
    particle.style.setProperty("--dy", `${dy}px`);
    particle.style.animationDelay = `${Math.random() * 0.15}s`;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1100);
  }
}
