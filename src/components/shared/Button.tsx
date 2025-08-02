import { memo, useCallback } from 'react';

import { CONFIRM_SHOW_MS } from '../../app/constants';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useCopyAction } from '../../hooks/useCopyAction';
import { useThemeStore } from '../../stores/useThemeStore';
import { AlertTriangleIcon, CheckIcon, CopyIcon, Loader2Icon, Trash2Icon } from './Icon';
import { Tooltip } from './Tooltip';

import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react';
import type { AppTheme } from '../../app/themes';
import type { TooltipProps } from './Tooltip';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'stealth' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children?: ReactNode;
  readonly fullWidth?: boolean;
  readonly icon?: ReactNode;
  readonly iconPosition?: 'left' | 'right';
  readonly loading?: boolean;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
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

const ICON_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'p-1',
  sm: 'p-2',
  lg: 'p-3',
};

const TEXT_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'p-1 text-xs',
  sm: 'p-2 text-sm',
  lg: 'p-3 text-base',
};

const getVariantClasses = (variant: ButtonVariant, theme: AppTheme): string => {
  const variantMap: Record<ButtonVariant, string> = {
    danger: `border-${theme.dangerBorder} bg-transparent text-${theme.dangerFg} hover:bg-${theme.dangerBgHover}`,
    outline: `border-${theme.borderPrimary} bg-transparent text-${theme.contentSecondary} hover:border-${theme.borderSecondary} hover:bg-${theme.surfaceMuted}`,
    primary: `border-transparent bg-${theme.accentBg} text-${theme.accentFg} hover:bg-${theme.accentBgHover}`,
    secondary: `border-transparent bg-${theme.surfaceTertiary} text-${theme.contentSecondary} hover:bg-${theme.surfaceHover} hover:text-${theme.contentPrimary}`,
    stealth: `border-transparent bg-transparent text-${theme.contentTertiary} hover:bg-${theme.surfaceMuted} hover:text-${theme.contentPrimary}`,
  };
  return variantMap[variant];
};

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
    ...props
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const finalVariant = variant ?? 'primary';

    const baseClass = `inline-flex items-center justify-center font-medium border outline-none transition-all duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-${theme.ring}`;
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const variantClass = getVariantClasses(finalVariant, theme);
    const sizeClass = children ? TEXT_SIZE_MAP[size] : ICON_SIZE_MAP[size];
    const finalClassName =
      `${baseClass} ${shapeClass} ${variantClass} ${sizeClass} ${loading ? ' opacity-60' : ''} ${fullWidth ? ' w-full' : ''} ${className}`.trim();
    const iconMarginClass = children && icon ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : '';
    const loadingSpinner = <Loader2Icon size={16} aria-hidden="true" className={`animate-spin ${iconMarginClass}`} />;
    const showIconLeft = iconPosition === 'left';
    const showIconRight = iconPosition === 'right';

    return (
      <button type={type} className={finalClassName.trim()} disabled={loading || disabled} onClick={onClick} {...props}>
        {loading && showIconLeft && loadingSpinner}
        {icon && showIconLeft && <span className={iconMarginClass}>{icon}</span>}
        {children}
        {icon && showIconRight && <span className={iconMarginClass}>{icon}</span>}
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
      icon={isCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
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
      <Tooltip content={tooltipContent} position={tooltipPosition} tooltipClasses={tooltipClasses} disabled={tooltipDisabled || buttonProps.disabled}>
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

    const buttonClass = `${className} ${isConfirm ? `bg-${theme.dangerBg} text-${theme.accentFg}` : ''}`.trim();

    const defaultIcon = icon ?? <Trash2Icon size={18} />;
    const defaultConfirmIcon = confirmIcon ?? <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={18} />;

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
