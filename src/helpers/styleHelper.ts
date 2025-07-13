import type { AppTheme } from '../app/themes';

export function getConfirmClasses(theme: AppTheme): string {
  return ['border', theme.errorBorderLight, theme.errorBgLight, theme.errorTextLight, theme.errorBgHover].join(' ');
}
