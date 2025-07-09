import { create } from 'zustand';

import type { NotificationMessage } from '../app/constants';

interface NotificationState {
  readonly notifications: readonly NotificationMessage[];
  readonly setNotifications: (notifications: readonly NotificationMessage[]) => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],

  setNotifications(notifications: readonly NotificationMessage[]): void {
    set({ notifications });
  },
}));