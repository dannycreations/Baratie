export interface AppTheme {
  readonly theme: string;
  readonly backdrop: string;
  readonly ring: string;
  readonly contentPrimary: string;
  readonly contentSecondary: string;
  readonly contentTertiary: string;
  readonly contentDisabled: string;
  readonly surfacePrimary: string;
  readonly surfaceSecondary: string;
  readonly surfaceTertiary: string;
  readonly surfaceHover: string;
  readonly surfaceMuted: string;
  readonly borderPrimary: string;
  readonly borderSecondary: string;
  readonly accentBg: string;
  readonly accentBgHover: string;
  readonly accentFg: string;
  readonly dangerBg: string;
  readonly dangerBgHover: string;
  readonly dangerFg: string;
  readonly dangerBorder: string;
  readonly warningBg: string;
  readonly warningFg: string;
  readonly warningBorder: string;
  readonly successBg: string;
  readonly successFg: string;
  readonly successBorder: string;
  readonly infoBg: string;
  readonly infoFg: string;
  readonly infoBorder: string;
  readonly scrollbarThumb: string;
  readonly scrollbarThumbHover: string;
  readonly favoriteFg: string;
  readonly favoriteFgHover: string;
  readonly highlightBg: string;
  readonly highlightFg: string;
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
  highlightBg: 'yellow-500/30',
  highlightFg: 'yellow-200',
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
  highlightBg: 'amber-400/40',
  highlightFg: 'amber-950',
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
