export const CATEGORY_FAVORITES = Symbol('⭐ Favorites');
export const CATEGORY_FLOW = Symbol('Flow Control');
export const KEY_CUSTOM_INPUT = Symbol('CUSTOM_INPUT');
export const KEY_CUSTOM_OUTPUT = Symbol('CUSTOM_OUTPUT');
export const KEY_REPEAT_STEP = Symbol('REPEAT_STEP');

export const STORAGE_COOKBOOK = 'baratie-cookbook';
export const STORAGE_FAVORITES = 'baratie-favorite';
export const STORAGE_CATEGORIES = 'baratie-categories';
export const STORAGE_INGREDIENTS = 'baratie-ingredients';
export const STORAGE_EXTENSIONS = 'baratie-extensions';
export const STORAGE_THEME = 'baratie-theme';

export const ANIMATION_EXIT_MS = 400;
export const ANIMATION_MODAL_MS = 200;
export const NOTIFY_DURATION_MS = 5000;
export const CONFIRM_TIMEOUT_MS = 3000;
export const COPY_SUCCESS_MS = 1500;

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationMessage {
  readonly id: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly title?: string;
  readonly duration?: number;
  readonly resetAt?: number;
}
