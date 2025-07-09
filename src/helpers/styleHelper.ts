import type { AppTheme } from '../app/themes';

export function getConfirmClasses(theme: AppTheme): string {
  return ['border', theme.errorBorderLight, theme.errorBgLighter, theme.errorTextLight, theme.errorBgHover].join(' ');
}
