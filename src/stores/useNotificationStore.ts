import { create } from 'zustand';

import { NOTIFICATION_SHOW_MS } from '../app/constants';
import { createMapHandlers, createStackHandlers } from '../utilities/storeUtil';

import type { NotificationMessage, NotificationType } from '../app/types';

interface NotificationState {
  readonly order: ReadonlyArray<string>;
  readonly map: ReadonlyMap<string, NotificationMessage>;
  readonly dedupeMap: ReadonlyMap<string, string>;
  readonly add: (notification: Readonly<NotificationMessage>) => void;
  readonly clear: () => void;
  readonly remove: (id: string) => void;
  readonly show: (message: string, type?: NotificationType, title?: string, duration?: number) => void;
  readonly update: (id: string, duration: number, resetAt: number) => void;
}

const getDedupeKey = (notification: Readonly<Pick<NotificationMessage, 'type' | 'title' | 'message'>>): string => {
  return [notification.type, notification.title || '', notification.message].join('|');
};

export const useNotificationStore = create<NotificationState>()((set, get) => {
  const mapHandlers = createMapHandlers<NotificationState, 'map', string, NotificationMessage>(set, 'map');
  const dedupeHandlers = createMapHandlers<NotificationState, 'dedupeMap', string, string>(set, 'dedupeMap');
  const orderHandlers = createStackHandlers<NotificationState, 'order', string>(set, 'order');

  return {
    order: [],
    map: new Map(),
    dedupeMap: new Map(),

    add: (notification) => {
      mapHandlers.set(notification.id, notification);
      dedupeHandlers.set(getDedupeKey(notification), notification.id);
      orderHandlers.push(notification.id);
    },

    clear: () => {
      mapHandlers.clear();
      dedupeHandlers.clear();
      orderHandlers.clear();
    },

    remove: (id) => {
      const { map, dedupeMap, order } = get();
      const notification = map.get(id);
      if (!notification) return;

      mapHandlers.remove(id);
      if (dedupeMap.get(getDedupeKey(notification)) === id) {
        dedupeHandlers.remove(getDedupeKey(notification));
      }
      set({ order: order.filter((item) => item !== id) });
    },

    show: (message, type, title, duration) => {
      const { add, update, dedupeMap } = get();
      const details = {
        message,
        title,
        type: type ?? 'info',
      };
      const existingId = dedupeMap.get(getDedupeKey(details));

      if (existingId) {
        update(existingId, duration ?? NOTIFICATION_SHOW_MS, Date.now());
      } else {
        add({
          ...details,
          id: crypto.randomUUID(),
          duration: duration ?? NOTIFICATION_SHOW_MS,
        });
      }
    },

    update: (id, duration, resetAt) => {
      const { map } = get();
      const existing = map.get(id);
      if (!existing) return;

      mapHandlers.set(id, { ...existing, duration, resetAt });
    },
  };
});
