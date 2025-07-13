export interface AppTheme {
  theme: string;
  backdrop: string;
  ring: string;
  contentPrimary: string;
  contentSecondary: string;
  contentTertiary: string;
  contentDisabled: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceHover: string;
  surfaceMuted: string;
  borderPrimary: string;
  borderSecondary: string;
  accentBg: string;
  accentBgHover: string;
  accentFg: string;
  dangerBg: string;
  dangerBgHover: string;
  dangerFg: string;
  dangerBorder: string;
  warningBg: string;
  warningFg: string;
  warningBorder: string;
  successBg: string;
  successFg: string;
  successBorder: string;
  infoBg: string;
  infoFg: string;
  infoBorder: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  favoriteFg: string;
  favoriteFgHover: string;
}

const DARK_THEME: AppTheme = {
  theme: '#0f172a',
  backdrop: 'slate-900/70',
  ring: 'sky-600',
  contentPrimary: 'slate-100',
  contentSecondary: 'slate-200',
  contentTertiary: 'slate-400',
  contentDisabled: 'slate-500',
  surfacePrimary: 'slate-900',
  surfaceSecondary: 'slate-800',
  surfaceTertiary: 'slate-700',
  surfaceHover: 'slate-600',
  surfaceMuted: 'slate-700/50',
  borderPrimary: 'slate-600',
  borderSecondary: 'slate-500',
  accentBg: 'sky-500',
  accentBgHover: 'sky-600',
  accentFg: 'white',
  dangerBg: 'red-500/50',
  dangerBgHover: 'red-500/20',
  dangerFg: 'red-400',
  dangerBorder: 'red-500',
  warningBg: 'yellow-500/50',
  warningFg: 'yellow-400',
  warningBorder: 'yellow-500',
  successBg: 'green-500/50',
  successFg: 'green-400',
  successBorder: 'green-500',
  infoBg: 'sky-500/50',
  infoFg: 'sky-400',
  infoBorder: 'sky-500',
  scrollbarThumb: '#475569',
  scrollbarThumbHover: '#64748b',
  favoriteFg: 'yellow-400',
  favoriteFgHover: 'yellow-300',
};

export const APP_THEMES = [
  {
    id: 'dark',
    name: 'Baratie Dark',
    theme: DARK_THEME,
  },
] as const;
