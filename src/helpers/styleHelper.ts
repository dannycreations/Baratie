import type { AppTheme } from '../app/themes';

export function getConfirmClasses(theme: AppTheme): string {
  return ['border', `border-${theme.dangerBorder}`, `bg-${theme.dangerBg}`, `text-${theme.dangerFg}`, `hover:bg-${theme.dangerBgHover}`].join(' ');
}
