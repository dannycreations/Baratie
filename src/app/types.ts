export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationMessage {
  readonly id: string;
  readonly type: NotificationType;
  readonly message: string;
  readonly title?: string;
  readonly duration?: number;
  readonly resetAt?: number;
}
