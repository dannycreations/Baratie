import { NOTIFICATION_SHOW_MS } from '../app/constants';
import { useNotificationStore } from '../stores/useNotificationStore';

import type { NotificationMessage, NotificationType } from '../components/main/NotificationPanel';

function getDedupeKey(details: { readonly message: string; readonly type: NotificationType; readonly title?: string }): string {
  return [details.type, details.title || '', details.message].join('|');
}

export function showNotification(message: string, type: NotificationType = 'info', title?: string, duration?: number): void {
  const { add, update, dedupeMap } = useNotificationStore.getState();
  const details = { message, title, type };
  const key = getDedupeKey(details);
  const existingId = dedupeMap.get(key);

  if (existingId) {
    update(existingId, duration ?? NOTIFICATION_SHOW_MS, Date.now());
  } else {
    const newNotification: NotificationMessage = { ...details, id: crypto.randomUUID(), duration: duration ?? NOTIFICATION_SHOW_MS };
    add(newNotification);
  }
}

export function removeNotification(id: string): void {
  useNotificationStore.getState().remove(id);
}

export function clearNotifications(): void {
  useNotificationStore.getState().clear();
}
