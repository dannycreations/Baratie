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

const LIGHT_THEME: AppTheme = {
  theme: '#FFF8F1',
  backdrop: 'amber-100/70',
  ring: 'orange-400',
  contentPrimary: 'amber-900',
  contentSecondary: 'amber-800',
  contentTertiary: 'amber-600',
  contentDisabled: 'amber-500',
  surfacePrimary: 'amber-100',
  surfaceSecondary: 'amber-200',
  surfaceTertiary: 'amber-300',
  surfaceHover: 'amber-400',
  surfaceMuted: 'amber-300/50',
  borderPrimary: 'amber-400',
  borderSecondary: 'amber-500',
  accentBg: 'orange-500',
  accentBgHover: 'orange-400',
  accentFg: 'black',
  dangerBg: 'red-600/50',
  dangerBgHover: 'red-600/20',
  dangerFg: 'red-500',
  dangerBorder: 'red-600',
  warningBg: 'yellow-600/50',
  warningFg: 'yellow-500',
  warningBorder: 'yellow-600',
  successBg: 'green-600/50',
  successFg: 'green-500',
  successBorder: 'green-600',
  infoBg: 'orange-500/50',
  infoFg: 'orange-600',
  infoBorder: 'orange-500',
  scrollbarThumb: '#FCD5B2',
  scrollbarThumbHover: '#FDBA74',
  favoriteFg: 'yellow-600',
  favoriteFgHover: 'yellow-700',
};

export const APP_THEMES = [
  {
    id: 'dark',
    name: 'Baratie Dark',
    theme: DARK_THEME,
  },
  {
    id: 'light',
    name: 'Sunrise Light',
    theme: LIGHT_THEME,
  },
] as const;
