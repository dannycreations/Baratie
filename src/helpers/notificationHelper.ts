import { NOTIFY_DURATION_MS } from '../app/constants';
import { useNotificationStore } from '../stores/useNotificationStore';
import { debounce } from '../utilities/appUtil';

import type { NotificationMessage, NotificationType } from '../app/constants';

const DEBOUNCE_DELAY_MS = 300;

export function clearNotifications(): void {
  useNotificationStore.getState().setNotifications([]);
}

export function removeNotification(id: string): void {
  const { notifications, setNotifications } = useNotificationStore.getState();
  setNotifications(notifications.filter((notification) => notification.id !== id));
}

const debouncedShowNotification = debounce((message: string, type: NotificationType = 'info', title?: string, duration?: number): void => {
  const { notifications, setNotifications } = useNotificationStore.getState();

  const details: Omit<NotificationMessage, 'id' | 'resetAt'> = {
    duration: duration ?? NOTIFY_DURATION_MS,
    message,
    title,
    type,
  };

  const existing = notifications.find((n) => n.title === details.title && n.message === details.message && n.type === details.type);

  if (existing) {
    const newNotifications = notifications.map((n) =>
      n.id === existing.id ? { ...n, duration: details.duration ?? NOTIFY_DURATION_MS, resetAt: Date.now() } : n,
    );
    setNotifications(newNotifications);
  } else {
    const id = crypto.randomUUID();
    const newNotification: NotificationMessage = { ...details, id };
    setNotifications([...notifications, newNotification]);
  }
}, DEBOUNCE_DELAY_MS);

export function showNotification(message: string, type: NotificationType = 'info', title?: string, duration?: number): void {
  debouncedShowNotification(message, type, title, duration);
}
