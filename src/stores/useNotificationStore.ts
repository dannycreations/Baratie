import { create } from 'zustand';

import type { NotificationMessage } from '../components/main/NotificationPanel';

interface NotificationState {
  readonly notifications: readonly NotificationMessage[];
  readonly setNotifications: (notifications: readonly NotificationMessage[]) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],

  setNotifications(notifications) {
    set({ notifications });
  },
}));
