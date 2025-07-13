export interface AppTheme {
  // Accent Colors
  readonly accentBg: string;
  readonly accentText: string;
  readonly accentTextHover: string;
  readonly accentTextGroupHover: string;
  readonly accentBorder: string;
  readonly accentBorderHover: string;
  readonly ascentRing: string;
  readonly ascentTooltip: string;

  // Base & Page
  readonly pageBg: string;
  readonly pageText: string;
  readonly themeColor: string;

  // Text Colors
  readonly textPrimary: string;
  readonly textPrimaryHover: string;
  readonly textSecondary: string;
  readonly textSecondaryHover: string;
  readonly textTertiary: string;
  readonly textQuaternary: string;
  readonly textPlaceholder: string;

  // Backgrounds
  readonly cardBg: string;
  readonly cardHeaderBg: string;
  readonly itemBg: string;
  readonly itemBgActive: string;
  readonly itemBgHover: string;
  readonly itemBgMuted: string;
  readonly itemBgMutedHover: string;
  readonly itemSpiceBg: string;
  readonly textareaBg: string;
  readonly modalBackdrop: string;
  readonly modalBackdropHeavy: string;

  // Borders
  readonly border: string;
  readonly borderTransparent: string;
  readonly cardHeaderBorder: string;
  readonly itemSpiceBorder: string;
  readonly tooltipBorder: string;
  readonly tabBorder: string;

  // Inputs & Controls
  readonly inputBg: string;
  readonly inputBgHover: string;
  readonly inputText: string;
  readonly inputBooleanHandle: string;

  // Buttons
  readonly buttonPrimaryBgHover: string;
  readonly buttonPrimaryText: string;
  readonly buttonDangerBgHover: string;
  readonly buttonDangerBorder: string;
  readonly buttonDangerTextHover: string;
  readonly buttonSuccessBgHover: string;
  readonly buttonSuccessTextHover: string;
  readonly buttonWarningBgHover: string;
  readonly buttonWarningTextHover: string;
  readonly buttonOutlineBgHover: string;
  readonly buttonOutlineBorderHover: string;
  readonly buttonStealthBgHover: string;

  // Semantic States (Error, Success, Warning, Info)
  readonly errorText: string;
  readonly errorTextLight: string;
  readonly errorTextStrong: string;
  readonly errorBg: string;
  readonly errorBgLight: string;
  readonly errorBgHover: string;
  readonly errorBorder: string;
  readonly errorBorderLight: string;
  readonly errorBorderStrong: string;

  readonly successText: string;
  readonly successTextStrong: string;
  readonly successBg: string;
  readonly successBorder: string;
  readonly successBorderStrong: string;

  readonly warningText: string;
  readonly warningTextStrong: string;
  readonly warningBg: string;
  readonly warningBorder: string;
  readonly warningBorderStrong: string;

  readonly infoText: string;
  readonly infoBg: string;
  readonly infoBorder: string;

  // Other UI Elements
  readonly dropzoneAddBg: string;
  readonly dropzoneAddBorder: string;
  readonly dropzoneAddText: string;
  readonly dropzoneRecipeBg: string;
  readonly dropzoneRemoveBg: string;
  readonly dropzoneRemoveBorder: string;
  readonly dropzoneRemoveText: string;

  readonly starFavorite: string;
  readonly starFavoriteHover: string;
  readonly starNonFavoriteHover: string;

  readonly swatchErrorBg: string;
  readonly swatchSuccessBg: string;
  readonly swatchTextBg: string;

  readonly tabActiveBg: string;
  readonly tabActiveText: string;
  readonly tabInactiveBg: string;
  readonly tabInactiveText: string;

  readonly scrollbarThumb: string;
  readonly scrollbarThumbHover: string;
  readonly tooltipText: string;
  readonly transparent: string;
}

const DARK_THEME: AppTheme = {
  // Accent Colors
  accentBg: 'bg-sky-500',
  accentBorder: 'border-sky-500',
  accentBorderHover: 'hover:border-sky-400',
  accentText: 'text-sky-400',
  accentTextHover: 'hover:text-sky-400',
  accentTextGroupHover: 'group-hover:text-sky-400',
  ascentRing: 'ring-sky-600',
  ascentTooltip: 'slate-950/80',

  // Base & Page
  pageBg: 'bg-slate-900',
  pageText: 'text-slate-200',
  themeColor: '#0f172a',

  // Text Colors
  textPrimary: 'text-slate-100',
  textPrimaryHover: 'hover:text-slate-100',
  textSecondary: 'text-slate-200',
  textSecondaryHover: 'hover:text-slate-100',
  textTertiary: 'text-slate-400',
  textQuaternary: 'text-slate-500',
  textPlaceholder: 'placeholder-slate-400',

  // Backgrounds
  cardBg: 'bg-slate-800',
  cardHeaderBg: 'bg-slate-700',
  itemBg: 'bg-slate-700',
  itemBgActive: 'bg-slate-600',
  itemBgHover: 'hover:bg-slate-600',
  itemBgMuted: 'bg-slate-700/50',
  itemBgMutedHover: 'hover:bg-slate-600/50',
  itemSpiceBg: 'bg-slate-600',
  textareaBg: 'bg-slate-800',
  modalBackdrop: 'bg-slate-900/70',
  modalBackdropHeavy: 'bg-slate-900/80',

  // Borders
  border: 'border-slate-600',
  borderTransparent: 'border-transparent',
  cardHeaderBorder: 'border-b border-slate-600',
  itemSpiceBorder: 'border-slate-500',
  tooltipBorder: 'border-slate-700',
  tabBorder: 'border-b-2 border-sky-500',

  // Inputs & Controls
  inputBg: 'bg-slate-700',
  inputBgHover: 'hover:bg-slate-600',
  inputText: 'text-slate-200',
  inputBooleanHandle: 'after:border-slate-300 after:bg-white',

  // Buttons
  buttonPrimaryBgHover: 'hover:bg-sky-600',
  buttonPrimaryText: 'text-white',
  buttonDangerBgHover: 'hover:bg-red-500/10',
  buttonDangerBorder: 'border-red-400',
  buttonDangerTextHover: 'hover:text-red-300',
  buttonSuccessBgHover: 'hover:!bg-green-500/10',
  buttonSuccessTextHover: 'hover:!text-green-300',
  buttonWarningBgHover: 'hover:!bg-yellow-500/10',
  buttonWarningTextHover: 'hover:text-yellow-300',
  buttonOutlineBgHover: 'hover:bg-slate-700/50',
  buttonOutlineBorderHover: 'hover:border-slate-500',
  buttonStealthBgHover: 'hover:bg-slate-700/50',

  // Semantic States
  errorText: 'text-red-400',
  errorTextLight: 'text-red-300',
  errorTextStrong: 'text-red-500',
  errorBg: 'bg-red-500/50',
  errorBgLight: 'bg-red-500/20',
  errorBgHover: 'hover:bg-red-500/30',
  errorBorder: 'border-red-500',
  errorBorderLight: 'border-red-500/30',
  errorBorderStrong: 'border-l-4 border-red-500/80',

  successText: 'text-green-400',
  successTextStrong: 'text-green-500',
  successBg: 'bg-green-500/50',
  successBorder: 'border-green-500',
  successBorderStrong: 'border-l-4 border-green-500/80',

  warningText: 'text-yellow-400',
  warningTextStrong: 'text-yellow-500',
  warningBg: 'bg-yellow-500/50',
  warningBorder: 'border-yellow-500',
  warningBorderStrong: 'border-l-4 border-yellow-500/80',

  infoText: 'text-sky-500',
  infoBg: 'bg-sky-500/50',
  infoBorder: 'border-sky-500',

  // Other UI Elements
  dropzoneAddBg: 'bg-sky-500/10',
  dropzoneAddBorder: 'border-sky-500',
  dropzoneAddText: 'text-sky-300',
  dropzoneRecipeBg: 'bg-slate-600/30',
  dropzoneRemoveBg: 'bg-red-500/10',
  dropzoneRemoveBorder: 'border-red-400',
  dropzoneRemoveText: 'text-red-300',

  starFavorite: 'text-yellow-400',
  starFavoriteHover: 'hover:text-yellow-300',
  starNonFavoriteHover: 'hover:text-yellow-400',

  swatchErrorBg: 'bg-red-400',
  swatchSuccessBg: 'bg-green-400',
  swatchTextBg: 'bg-slate-100',

  tabActiveBg: 'bg-slate-700/50',
  tabActiveText: 'text-sky-400',
  tabInactiveBg: 'hover:bg-slate-700/30',
  tabInactiveText: 'text-slate-400 hover:text-slate-200',

  scrollbarThumb: '#475569',
  scrollbarThumbHover: '#64748b',
  tooltipText: 'text-white',
  transparent: 'bg-transparent',
};

export const APP_THEMES = [
  {
    id: 'dark',
    name: 'Baratie Dark',
    theme: DARK_THEME,
  },
] as const;
