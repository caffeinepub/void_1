/**
 * VOID Service Worker
 * Handles Web Push notifications and PWA lifecycle.
 */

const CACHE_NAME = "void-sw-v1";

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // Skip waiting so the new service worker activates immediately
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Claim all open clients immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      }),
    ]),
  );
});

// ─── Push Notification ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let body = "You have a new message in VOID";

  try {
    if (event.data) {
      body = event.data.text();
    }
  } catch {
    // keep default body
  }

  const options = {
    body,
    icon: "/assets/generated/void-logo.dim_256x256.png",
    badge: "/assets/generated/void-logo.dim_256x256.png",
    tag: "void-message",
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: "/dms",
      timestamp: Date.now(),
    },
    actions: [
      { action: "open", title: "Open VOID" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("VOID", options),
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing window if one is already open
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // Open a new window/tab if none found
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

// ─── Fetch (pass-through — no offline caching for now) ───────────────────────

self.addEventListener("fetch", (_event) => {
  // Pass-through: no caching strategy implemented.
  // Add offline support here when needed.
});
