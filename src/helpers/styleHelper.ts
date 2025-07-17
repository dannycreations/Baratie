import type { AppTheme } from '../app/themes';

export function getConfirmClasses(theme: Readonly<AppTheme>): string {
  return `border border-${theme.dangerBorder} bg-${theme.dangerBg} text-${theme.accentFg} hover:bg-${theme.dangerBgHover}`;
}
