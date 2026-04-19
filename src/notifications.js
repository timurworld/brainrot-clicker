// Browser-notification helpers.
// Phase 1: foreground notifications — fired from the page when realtime
// admin events arrive. Works while the tab is open or backgrounded
// (system OS notification center). Doesn't fire when the tab is fully closed
// (that needs Web Push + VAPID, planned for Phase 2).

const SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;
const SW_SUPPORTED = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
const PROMPT_DISMISSED_KEY = 'brainrot_notif_dismissed_at';

export function notificationsSupported() {
  return SUPPORTED;
}

export function notificationPermission() {
  return SUPPORTED ? Notification.permission : 'unsupported';
}

/** Should we show the in-game opt-in prompt? */
export function shouldOfferOptIn() {
  if (!SUPPORTED) return false;
  if (Notification.permission !== 'default') return false;
  const dismissedAt = parseInt(localStorage.getItem(PROMPT_DISMISSED_KEY) || '0', 10);
  // Re-prompt at most once per 7 days
  return Date.now() - dismissedAt > 7 * 24 * 60 * 60 * 1000;
}

export function rememberOptInDismissed() {
  try { localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now())); } catch (e) { /* ignore */ }
}

export async function requestPermission() {
  if (!SUPPORTED) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    if (result !== 'granted') rememberOptInDismissed();
    return result;
  } catch (e) {
    return 'denied';
  }
}

/** Register the service worker once on app load. */
export async function registerServiceWorker() {
  if (!SW_SUPPORTED) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    return null;
  }
}

/** Show a notification through the SW (better backgrounding) or fall back to direct API. */
export async function notify(title, opts = {}) {
  if (!SUPPORTED || Notification.permission !== 'granted') return false;
  const options = {
    body: opts.body || '',
    icon: opts.icon || '/characters/01_noobini_lovini.png',
    badge: opts.badge || '/characters/01_noobini_lovini.png',
    tag: opts.tag,
    data: opts.data,
    vibrate: opts.vibrate || [200, 100, 200],
    silent: false,
  };
  try {
    const reg = SW_SUPPORTED && (await navigator.serviceWorker.getRegistration());
    if (reg && reg.showNotification) {
      await reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
    return true;
  } catch (e) {
    return false;
  }
}
