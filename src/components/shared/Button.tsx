import { memo, useCallback } from 'react';

import { CONFIRM_SHOW_MS, ICON_SIZES } from '../../app/constants';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useCopyAction } from '../../hooks/useCopyAction';
import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../utilities/styleUtil';
import { AlertTriangleIcon, CheckIcon, CopyIcon, Loader2Icon, Trash2Icon } from './Icon';
import { Tooltip } from './Tooltip';

import type { JSX, MouseEvent, ReactNode } from 'react';
import type { AppTheme } from '../../app/themes';
import type { ButtonSize, ButtonVariant } from '../../app/types';
import type { TooltipProps } from './Tooltip';

export interface ButtonProps {
  readonly children?: ReactNode;
  readonly fullWidth?: boolean;
  readonly icon?: ReactNode;
  readonly iconPosition?: 'left' | 'right';
  readonly loading?: boolean;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly type?: 'button' | 'submit' | 'reset';
}

export interface TooltipButtonProps extends ButtonProps {
  readonly tooltipContent: ReactNode;
  readonly tooltipClasses?: string;
  readonly tooltipDisabled?: boolean;
  readonly tooltipPosition?: TooltipProps['position'];
}

interface CopyButtonProps {
  readonly textToCopy: string;
  readonly tooltipPosition?: TooltipProps['position'];
}

interface ConfirmButtonProps {
  readonly actionName?: string;
  readonly className?: string;
  readonly confirmIcon?: ReactNode;
  readonly confirmTooltip?: ReactNode;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly itemType: string;
  readonly onConfirm: () => void;
  readonly tooltip?: ReactNode;
  readonly tooltipPosition?: TooltipProps['position'];
}

const PADDING_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'p-1',
  sm: 'p-2',
  lg: 'p-3',
} as const;

const TEXT_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'text-xs',
  sm: 'text-sm',
  lg: 'text-base',
} as const;

function getVariantMap(theme: AppTheme): Record<ButtonVariant, string> {
  return {
    danger: `border-${theme.dangerBorder} bg-transparent text-${theme.dangerFg} hover:bg-${theme.dangerBgHover}`,
    outline: `border-${theme.borderPrimary} bg-transparent text-${theme.contentSecondary} hover:border-${theme.borderSecondary} hover:bg-${theme.surfaceMuted}`,
    primary: `border-transparent bg-${theme.accentBg} text-${theme.accentFg} hover:bg-${theme.accentBgHover}`,
    secondary: `border-transparent bg-${theme.surfaceTertiary} text-${theme.contentSecondary} hover:bg-${theme.surfaceHover} hover:text-${theme.contentPrimary}`,
    stealth: `border-transparent bg-transparent text-${theme.contentTertiary} hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary}`,
  };
}

export const Button = memo<ButtonProps>(
  ({
    children,
    className = '',
    disabled = false,
    fullWidth = false,
    icon,
    iconPosition = 'left',
    loading = false,
    onClick,
    size = 'sm',
    type = 'button',
    variant,
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const finalVariant = variant ?? 'primary';

    const baseClass = `inline-flex items-center justify-center font-medium border outline-none transition-all duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-50`;
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const variantMap = getVariantMap(theme);
    const variantClass = variantMap[finalVariant];
    const sizeClass = children ? cn(PADDING_MAP[size], TEXT_SIZE_MAP[size]) : PADDING_MAP[size];
    const finalClassName = cn(baseClass, shapeClass, variantClass, sizeClass, loading && 'opacity-60', fullWidth && 'w-full', className);

    const iconMarginClass = children && icon ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : '';
    const loadingSpinner = <Loader2Icon size={ICON_SIZES.XS} className={cn('animate-spin', iconMarginClass)} />;

    const showIconLeft = iconPosition === 'left';
    const showIconRight = iconPosition === 'right';

    return (
      <button type={type} className={finalClassName} disabled={loading || disabled} onClick={onClick}>
        {loading && showIconLeft && loadingSpinner}
        {icon && showIconLeft && <span className={cn(iconMarginClass)}>{icon}</span>}
        {children}
        {icon && showIconRight && <span className={cn(iconMarginClass)}>{icon}</span>}
        {loading && (showIconRight || !children) && loadingSpinner}
      </button>
    );
  },
);

export const CopyButton = memo<CopyButtonProps>(({ textToCopy, tooltipPosition = 'top' }): JSX.Element => {
  const { isCopied, copy } = useCopyAction();
  const theme = useThemeStore((state) => state.theme);

  const handleCopy = useCallback(async (): Promise<void> => {
    await copy(textToCopy);
  }, [copy, textToCopy]);

  return (
    <TooltipButton
      icon={isCopied ? <CheckIcon size={ICON_SIZES.SM} /> : <CopyIcon size={ICON_SIZES.SM} />}
      size="sm"
      variant="stealth"
      className={isCopied ? `text-${theme.successFg}` : ''}
      disabled={!textToCopy || isCopied}
      tooltipContent={isCopied ? 'Copied!' : 'Copy'}
      tooltipPosition={tooltipPosition}
      onClick={handleCopy}
    />
  );
});

export const TooltipButton = memo<TooltipButtonProps>(
  ({ tooltipContent, tooltipPosition, tooltipClasses, tooltipDisabled, ...buttonProps }): JSX.Element => {
    return (
      <Tooltip content={tooltipContent} position={tooltipPosition} tooltipClasses={tooltipClasses} disabled={tooltipDisabled}>
        <Button {...buttonProps} />
      </Tooltip>
    );
  },
);

export const ConfirmButton = memo<ConfirmButtonProps>(
  ({
    onConfirm,
    itemType,
    actionName = 'Delete',
    tooltipPosition = 'top',
    className = '',
    disabled = false,
    icon,
    confirmIcon,
    tooltip: customTooltip,
    confirmTooltip: customConfirmTooltip,
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const { isConfirm, trigger } = useConfirmAction(onConfirm, CONFIRM_SHOW_MS);

    const defaultTooltip = `${actionName} ${itemType}`;
    const defaultConfirmTooltip = `Confirm ${actionName}`;
    const tooltipContent = isConfirm ? (customConfirmTooltip ?? defaultConfirmTooltip) : (customTooltip ?? defaultTooltip);

    const buttonClass = cn(className, isConfirm && `bg-${theme.dangerBg} text-${theme.accentFg}`);

    const defaultIcon = icon ?? <Trash2Icon size={ICON_SIZES.SM} />;
    const defaultConfirmIcon = confirmIcon ?? <AlertTriangleIcon className={cn(`text-${theme.dangerFg}`)} size={ICON_SIZES.SM} />;

    return (
      <TooltipButton
        icon={isConfirm ? defaultConfirmIcon : defaultIcon}
        size="sm"
        variant="danger"
        className={buttonClass}
        disabled={disabled}
        tooltipContent={tooltipContent}
        tooltipPosition={tooltipPosition}
        onClick={trigger}
      />
    );
  },
);
