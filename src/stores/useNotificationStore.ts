import { create } from 'zustand';

import { NOTIFICATION_SHOW_MS } from '../app/constants';

import type { NotificationMessage, NotificationType } from '../app/types';

interface NotificationState {
  readonly map: ReadonlyMap<string, NotificationMessage>;
  readonly dedupeMap: ReadonlyMap<string, string>;
  readonly clear: () => void;
  readonly remove: (id: string) => void;
  readonly show: (message: string, type?: NotificationType, title?: string, duration?: number) => void;
}

const getDedupeKey = (notification: Readonly<Pick<NotificationMessage, 'type' | 'title' | 'message'>>): string => {
  return [notification.type, notification.title || '', notification.message].join('|');
};

export const useNotificationStore = create<NotificationState>()((set) => ({
  map: new Map(),
  dedupeMap: new Map(),

  clear: () => {
    set({ map: new Map(), dedupeMap: new Map() });
  },

  remove: (id) => {
    set((state) => {
      const notification = state.map.get(id);
      if (!notification) {
        return state;
      }

      const map = new Map(state.map);
      map.delete(id);

      const dedupeKey = getDedupeKey(notification);
      let dedupeMap = state.dedupeMap;
      if (dedupeMap.get(dedupeKey) === id) {
        const next = new Map(dedupeMap);
        next.delete(dedupeKey);
        dedupeMap = next;
      }

      return { map, dedupeMap };
    });
  },

  show: (message, type, title, duration) => {
    set((state) => {
      const details = { message, title, type: type ?? ('info' as const) };
      const dedupeKey = getDedupeKey(details);
      const finalDuration = duration ?? NOTIFICATION_SHOW_MS;
      const existingId = state.dedupeMap.get(dedupeKey);
      const existing = existingId ? state.map.get(existingId) : undefined;

      // A duplicate message restarts the visible timer instead of stacking.
      if (existing) {
        const map = new Map(state.map);
        map.set(existing.id, { ...existing, duration: finalDuration, resetAt: Date.now() });
        return { map };
      }

      const id = crypto.randomUUID();
      const map = new Map(state.map);
      map.set(id, { ...details, id, duration: finalDuration });

      const dedupeMap = new Map(state.dedupeMap);
      dedupeMap.set(dedupeKey, id);

      return { map, dedupeMap };
    });
  },
}));
