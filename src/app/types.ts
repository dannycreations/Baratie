export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'stealth' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'lg';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';
export type DropZoneMode = 'overlay' | 'placeholder';
export type DropZoneVariant = 'add' | 'remove';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationMessage {
  readonly id: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly title?: string;
  readonly duration?: number;
  readonly resetAt?: number;
}
