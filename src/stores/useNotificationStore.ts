import { create } from 'zustand';

import { NOTIFICATION_SHOW_MS } from '../app/constants';

import type { NotificationMessage, NotificationType } from '../components/main/NotificationPanel';

interface NotificationState {
  readonly order: ReadonlyArray<string>;
  readonly map: ReadonlyMap<string, NotificationMessage>;
  readonly dedupeMap: ReadonlyMap<string, string>;
  readonly add: (notification: NotificationMessage) => void;
  readonly clear: () => void;
  readonly remove: (id: string) => void;
  readonly show: (message: string, type?: NotificationType, title?: string, duration?: number) => void;
  readonly update: (id: string, duration: number, resetAt: number) => void;
}

function getDedupeKey(n: Pick<NotificationMessage, 'type' | 'title' | 'message'>): string {
  return [n.type, n.title || '', n.message].join('|');
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  order: [],
  map: new Map(),
  dedupeMap: new Map(),
  add: (notification) => {
    set((state) => {
      const newMap = new Map(state.map);
      newMap.set(notification.id, notification);
      const newOrder = [...state.order, notification.id];
      const newDedupeMap = new Map(state.dedupeMap);
      newDedupeMap.set(getDedupeKey(notification), notification.id);
      return { map: newMap, order: newOrder, dedupeMap: newDedupeMap };
    });
  },
  clear: () => {
    set({
      order: [],
      map: new Map(),
      dedupeMap: new Map(),
    });
  },
  remove: (id) => {
    set((state) => {
      const notification = state.map.get(id);
      if (!notification) {
        return {};
      }
      const newMap = new Map(state.map);
      newMap.delete(id);
      const newOrder = state.order.filter((i) => i !== id);
      const newDedupeMap = new Map(state.dedupeMap);
      const currentId = newDedupeMap.get(getDedupeKey(notification));
      if (currentId === id) {
        newDedupeMap.delete(getDedupeKey(notification));
      }
      return { map: newMap, order: newOrder, dedupeMap: newDedupeMap };
    });
  },
  show: (message, type = 'info', title, duration) => {
    const { add, update, dedupeMap } = get();
    const details = { message, title, type };
    const key = getDedupeKey(details);
    const existingId = dedupeMap.get(key);

    if (existingId) {
      update(existingId, duration ?? NOTIFICATION_SHOW_MS, Date.now());
    } else {
      const newNotification: NotificationMessage = {
        ...details,
        id: crypto.randomUUID(),
        duration: duration ?? NOTIFICATION_SHOW_MS,
      };
      add(newNotification);
    }
  },
  update: (id, duration, resetAt) => {
    set((state) => {
      const notification = state.map.get(id);
      if (!notification) {
        return {};
      }
      const newMap = new Map(state.map);
      newMap.set(id, { ...notification, duration, resetAt });
      return { map: newMap };
    });
  },
}));
