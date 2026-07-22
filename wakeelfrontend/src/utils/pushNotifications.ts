import { apiService } from '../services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function ensureWebPushSubscribed(): Promise<
  | { ok: true; status: 'subscribed' | 'already-granted' }
  | { ok: false; reason: string }
> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no-window' };
  if (!('Notification' in window)) return { ok: false, reason: 'no-notification-api' };
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no-service-worker' };
  if (!('PushManager' in window)) return { ok: false, reason: 'no-push-manager' };

  const perm = Notification.permission;
  if (perm === 'denied') return { ok: false, reason: 'permission-denied' };

  // Important: browsers may block permission prompt without user gesture.
  const permission = perm === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'permission-not-granted' };

  const { publicKey } = await apiService.getWebPushVapidPublicKey();
  if (!publicKey) return { ok: false, reason: 'missing-vapid-public-key' };

  const swUrl = `${process.env.PUBLIC_URL || ''}/push-sw.js`;
  const reg = await navigator.serviceWorker.register(swUrl);

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await apiService.subscribeWebPush({
    subscription: subscription.toJSON() as any,
    userAgent: navigator.userAgent,
  });

  return { ok: true, status: existing ? 'already-granted' : 'subscribed' };
}

