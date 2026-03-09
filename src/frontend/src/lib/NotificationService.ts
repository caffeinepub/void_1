/**
 * NotificationService — Web Push notification management for VOID.
 *
 * Handles:
 * - Requesting browser notification permission
 * - Subscribing to VAPID push via service worker
 * - Sending local browser notifications (fallback when app is open)
 * - Persisting notification enabled state in localStorage
 */

// Test VAPID public key (replace with real VAPID key in production)
const VAPID_PUBLIC_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZEXHktsrfn56Zw_WgFDiICQ";

const NOTIFICATION_ENABLED_KEY = "void_notifications_enabled";

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Request browser notification permission.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// ─── Service Worker Registration ─────────────────────────────────────────────

/**
 * Convert a URL-safe base64 VAPID public key to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

/**
 * Subscribe to push notifications via the service worker + VAPID.
 * Registers /service-worker.js if not already registered.
 * Returns the PushSubscription, or null if any step fails.
 */
export async function subscribeToVAPID(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    // Register service worker if not already registered
    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        {
          scope: "/",
        },
      );
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Subscribe to push
    const applicationServerKeyArr = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    // Copy to plain ArrayBuffer for browser API compatibility
    const applicationServerKey = applicationServerKeyArr.buffer.slice(
      applicationServerKeyArr.byteOffset,
      applicationServerKeyArr.byteOffset + applicationServerKeyArr.byteLength,
    ) as ArrayBuffer;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    return subscription;
  } catch (err) {
    console.warn("[NotificationService] Push subscription failed:", err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  } catch (err) {
    console.warn("[NotificationService] Unsubscribe failed:", err);
  }
}

// ─── Local Notification ───────────────────────────────────────────────────────

/**
 * Show a local browser notification (fallback when the app is open in foreground).
 * Only fires if permission has been granted.
 */
export function sendLocalNotification(title: string, body: string): void {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    // Use service worker notification if available for better UX
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "/assets/generated/void-logo.dim_256x256.png",
            badge: "/assets/generated/void-logo.dim_256x256.png",
            tag: "void-message",
          });
        })
        .catch(() => {
          // Fallback to basic Notification API
          new Notification(title, { body });
        });
    } else {
      new Notification(title, { body });
    }
  } catch {
    // Notification might fail in some contexts — fail silently
  }
}

// ─── Preference Persistence ───────────────────────────────────────────────────

/** Persist whether notifications are enabled in localStorage */
export function setNotificationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled));
  } catch {
    // fail silently
  }
}

/** Read whether notifications are enabled from localStorage */
export function isNotificationEnabled(): boolean {
  try {
    const stored = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return stored ? JSON.parse(stored) === true : false;
  } catch {
    return false;
  }
}
