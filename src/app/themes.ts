export interface AppTheme {
  readonly accentBg: string;
  readonly accentBgChecked: string;
  readonly accentBorder: string;
  readonly accentBorderHover: string;
  readonly accentRing: string;
  readonly accentText: string;
  readonly accentTextGroupHover: string;
  readonly accentTextHover: string;
  readonly borderTransparent: string;
  readonly cardBg: string;
  readonly cardHeaderBg: string;
  readonly cardHeaderBorder: string;
  readonly dangerButtonBgHover: string;
  readonly dangerButtonBorder: string;
  readonly dangerButtonTextHover: string;
  readonly dropzoneAddBg: string;
  readonly dropzoneAddBorder: string;
  readonly dropzoneAddText: string;
  readonly dropzoneRecipeBg: string;
  readonly dropzoneRemoveBg: string;
  readonly dropzoneRemoveBorder: string;
  readonly dropzoneRemoveText: string;
  readonly errorBg: string;
  readonly errorBgHover: string;
  readonly errorBgLighter: string;
  readonly errorBorder: string;
  readonly errorBorderLight: string;
  readonly errorBorderRecipe: string;
  readonly errorHoverDark: string;
  readonly errorText: string;
  readonly errorTextDark: string;
  readonly errorTextLight: string;
  readonly groupHoverSecondary: string;
  readonly infoBg: string;
  readonly infoBorder: string;
  readonly infoText: string;
  readonly inputBg: string;
  readonly inputBgHover: string;
  readonly inputBorder: string;
  readonly inputBooleanFocusRing: string;
  readonly inputBooleanHandle: string;
  readonly inputCheckedHandle: string;
  readonly inputFocusNoBorder: string;
  readonly inputFocusRing: string;
  readonly inputText: string;
  readonly itemBg: string;
  readonly itemBgHover: string;
  readonly itemBgHovered: string;
  readonly itemBgMuted: string;
  readonly itemBgMutedHover: string;
  readonly itemBgMutedLight: string;
  readonly itemBorder: string;
  readonly itemSpiceBg: string;
  readonly itemSpiceBorder: string;
  readonly linedGutterBorder: string;
  readonly linedGutterText: string;
  readonly menuRing: string;
  readonly modalBackdrop: string;
  readonly modalBackdropHeavy: string;
  readonly outlineButtonBgHover: string;
  readonly outlineButtonBorderHover: string;
  readonly pageBg: string;
  readonly pageText: string;
  readonly primaryButtonBgHover: string;
  readonly primaryButtonText: string;
  readonly scrollbarThumb: string;
  readonly scrollbarThumbHover: string;
  readonly shadow: string;
  readonly shadow2xl: string;
  readonly shadowHoverLg: string;
  readonly shadowLg: string;
  readonly shadowNoneDisabled: string;
  readonly shadowXl: string;
  readonly starFavorite: string;
  readonly starFavoriteHover: string;
  readonly starNonFavoriteHover: string;
  readonly stealthButtonBgHover: string;
  readonly successBg: string;
  readonly successBorder: string;
  readonly successBorderRecipe: string;
  readonly successButtonBgHover: string;
  readonly successButtonTextHover: string;
  readonly successText: string;
  readonly successTextDark: string;
  readonly swatchErrorBg: string;
  readonly swatchSuccessBg: string;
  readonly swatchTextBg: string;
  readonly tabActiveBg: string;
  readonly tabActiveText: string;
  readonly tabBorder: string;
  readonly tabInactiveBg: string;
  readonly tabInactiveText: string;
  readonly textareaBg: string;
  readonly textareaLinedBg: string;
  readonly textPlaceholder: string;
  readonly textPrimary: string;
  readonly textPrimaryHover: string;
  readonly textQuaternary: string;
  readonly textSecondary: string;
  readonly textSecondaryHover: string;
  readonly textTertiary: string;
  readonly tooltipArrowBottom: string;
  readonly tooltipArrowLeft: string;
  readonly tooltipArrowRight: string;
  readonly tooltipArrowTop: string;
  readonly tooltipBg: string;
  readonly tooltipBorder: string;
  readonly tooltipText: string;
  readonly transparent: string;
  readonly warningBg: string;
  readonly warningBorder: string;
  readonly warningBorderRecipe: string;
  readonly warningButtonBgHover: string;
  readonly warningButtonTextHover: string;
  readonly warningText: string;
  readonly warningTextDark: string;
}

const DARK_THEME: AppTheme = {
  accentBg: 'bg-sky-500',
  accentBgChecked: 'peer-checked:bg-sky-500',
  accentBorder: 'border-sky-500',
  accentBorderHover: 'hover:border-sky-400',
  accentRing: 'focus:ring-sky-500',
  accentText: 'text-sky-400',
  accentTextGroupHover: 'group-hover:text-sky-400',
  accentTextHover: 'hover:text-sky-400',
  borderTransparent: 'border-transparent',
  cardBg: 'bg-slate-800',
  cardHeaderBg: 'bg-slate-700',
  cardHeaderBorder: 'border-b border-slate-600',
  dangerButtonBgHover: 'hover:bg-red-500/10',
  dangerButtonBorder: 'border-red-400',
  dangerButtonTextHover: 'hover:text-red-300',
  dropzoneAddBg: 'bg-sky-500/10',
  dropzoneAddBorder: 'border-sky-500',
  dropzoneAddText: 'text-sky-300',
  dropzoneRecipeBg: 'bg-slate-600/30',
  dropzoneRemoveBg: 'bg-red-500/10',
  dropzoneRemoveBorder: 'border-red-400',
  dropzoneRemoveText: 'text-red-300',
  errorBg: 'bg-red-500/50',
  errorBgHover: 'hover:bg-red-500/30',
  errorBgLighter: 'bg-red-500/20',
  errorBorder: 'border-red-500',
  errorBorderLight: 'border-red-500/30',
  errorBorderRecipe: 'border-l-4 border-red-500/80',
  errorHoverDark: 'hover:text-red-400',
  errorText: 'text-red-400',
  errorTextDark: 'text-red-500',
  errorTextLight: 'text-red-300',
  groupHoverSecondary: 'group-hover:text-slate-200',
  infoBg: 'bg-sky-500/50',
  infoBorder: 'border-sky-500',
  infoText: 'text-sky-500',
  inputBg: 'bg-slate-700',
  inputBgHover: 'hover:bg-slate-600',
  inputBorder: 'border-slate-600',
  inputBooleanFocusRing: 'peer-focus:ring-offset-slate-900',
  inputBooleanHandle: 'after:border-slate-300 after:bg-white',
  inputCheckedHandle: 'peer-checked:after:translate-x-full peer-checked:after:border-white',
  inputFocusNoBorder: 'focus:border-transparent',
  inputFocusRing: 'focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500',
  inputText: 'text-slate-200',
  itemBg: 'bg-slate-700',
  itemBgHover: 'hover:bg-slate-600',
  itemBgHovered: 'bg-slate-600',
  itemBgMuted: 'bg-slate-700/50',
  itemBgMutedHover: 'hover:bg-slate-600/50',
  itemBgMutedLight: 'hover:bg-slate-700/30',
  itemBorder: 'border-l-2 border-slate-700',
  itemSpiceBg: 'bg-slate-600',
  itemSpiceBorder: 'border-slate-500',
  linedGutterBorder: 'border-r border-slate-700',
  linedGutterText: 'text-slate-500',
  menuRing: 'ring-1 ring-white ring-opacity-5',
  modalBackdrop: 'bg-slate-900/70',
  modalBackdropHeavy: 'bg-slate-900/80',
  outlineButtonBgHover: 'hover:bg-slate-700/50',
  outlineButtonBorderHover: 'hover:border-slate-500',
  pageBg: 'bg-slate-900',
  pageText: 'text-slate-200',
  primaryButtonBgHover: 'hover:bg-sky-600',
  primaryButtonText: 'text-white',
  scrollbarThumb: '#475569',
  scrollbarThumbHover: '#64748b',
  shadow: 'shadow',
  shadow2xl: 'shadow-2xl',
  shadowHoverLg: 'hover:shadow-lg',
  shadowLg: 'shadow-lg',
  shadowNoneDisabled: 'disabled:shadow-none',
  shadowXl: 'shadow-xl',
  starFavorite: 'text-yellow-400',
  starFavoriteHover: 'hover:text-yellow-300',
  starNonFavoriteHover: 'hover:text-yellow-400',
  stealthButtonBgHover: 'hover:bg-slate-700/50',
  successBg: 'bg-green-500/50',
  successBorder: 'border-green-500',
  successBorderRecipe: 'border-l-4 border-green-500/80',
  successButtonBgHover: 'hover:!bg-green-500/10',
  successButtonTextHover: 'hover:!text-green-300',
  successText: 'text-green-400',
  successTextDark: 'text-green-500',
  swatchErrorBg: 'bg-red-400',
  swatchSuccessBg: 'bg-green-400',
  swatchTextBg: 'bg-slate-100',
  tabActiveBg: 'bg-slate-700/50',
  tabActiveText: 'text-sky-400',
  tabBorder: 'border-b-2 border-sky-500',
  tabInactiveBg: 'hover:bg-slate-700/30',
  tabInactiveText: 'text-slate-400 hover:text-slate-200',
  textareaBg: 'bg-slate-800',
  textareaLinedBg: 'bg-transparent',
  textPlaceholder: 'placeholder-slate-400',
  textPrimary: 'text-slate-100',
  textPrimaryHover: 'hover:text-slate-100',
  textQuaternary: 'text-slate-500',
  textSecondary: 'text-slate-200',
  textSecondaryHover: 'hover:text-slate-100',
  textTertiary: 'text-slate-400',
  tooltipArrowBottom: 'border-b-slate-950/80',
  tooltipArrowLeft: 'border-l-slate-950/80',
  tooltipArrowRight: 'border-r-slate-950/80',
  tooltipArrowTop: 'border-t-slate-950/80',
  tooltipBg: 'bg-slate-950/80',
  tooltipBorder: 'border-slate-700',
  tooltipText: 'text-white',
  transparent: 'bg-transparent',
  warningBg: 'bg-yellow-500/50',
  warningBorder: 'border-yellow-500',
  warningBorderRecipe: 'border-l-4 border-yellow-500/80',
  warningButtonBgHover: 'hover:!bg-yellow-500/10',
  warningButtonTextHover: 'hover:text-yellow-300',
  warningText: 'text-yellow-400',
  warningTextDark: 'text-yellow-500',
};

export const APP_THEMES = [
  {
    id: 'dark',
    name: 'Baratie Dark',
    theme: DARK_THEME,
  },
] as const;
