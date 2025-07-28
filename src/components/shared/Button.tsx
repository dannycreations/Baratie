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
  readonly tooltipClasses?: string;
  readonly tooltipContent: ReactNode;
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
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly itemName: string;
  readonly itemType: string;
  readonly onConfirm: () => void;
  readonly tooltipPosition?: TooltipProps['position'];
}

const ICON_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'p-1',
  sm: 'p-2',
  lg: 'p-3',
};

const TEXT_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2 py-2 text-sm',
  lg: 'px-3 py-3 text-base',
};

const getVariantClasses = (variant: ButtonVariant, theme: AppTheme): string => {
  const variantMap: Record<ButtonVariant, string> = {
    danger: `border-${theme.dangerBorder} bg-transparent text-${theme.dangerFg} hover:bg-${theme.dangerBgHover}`,
    outline: `border-${theme.borderPrimary} bg-transparent text-${theme.contentSecondary} hover:border-${theme.borderSecondary} hover:bg-${theme.surfaceMuted}`,
    primary: `border-transparent bg-${theme.accentBg} text-${theme.accentFg} hover:bg-${theme.accentBgHover}`,
    secondary: `border-transparent bg-${theme.surfaceTertiary} text-${theme.contentSecondary} hover:bg-${theme.surfaceHover} hover:text-${theme.contentPrimary}`,
    stealth: `border-transparent bg-transparent text-${theme.contentTertiary} hover:bg-${theme.surfaceMuted} hover:text-${theme.infoFg}`,
  };
  return variantMap[variant];
};

function getConfirmClasses(theme: Readonly<AppTheme>): string {
  return `border border-${theme.dangerBorder} bg-${theme.dangerBg} text-${theme.accentFg} hover:bg-${theme.dangerBgHover}`;
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
    ...props
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const finalVariant = variant ?? 'primary';

    const baseClass = `
      inline-flex items-center justify-center border font-medium outline-none
      transition-all duration-150 ease-in-out focus:ring-2
      focus:ring-${theme.ring} disabled:cursor-not-allowed disabled:opacity-50
    `;
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const variantClass = getVariantClasses(finalVariant, theme);
    const sizeClass = children ? TEXT_SIZE_MAP[size] : ICON_SIZE_MAP[size];

    const finalClassName = `
      ${baseClass} ${shapeClass} ${variantClass} ${sizeClass}
      ${loading ? ' opacity-60' : ''}
      ${fullWidth ? ' w-full' : ''}
      ${className}
    `.trim();

    const iconMarginClass = children && icon ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : '';
    const loadingSpinner = <Loader2Icon aria-hidden="true" className={`h-4 w-4 animate-spin ${iconMarginClass}`} />;

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
      aria-label={isCopied ? 'Result Copied to Clipboard' : 'Copy Result to Clipboard'}
      className={isCopied ? `text-${theme.successFg} hover:!bg-${theme.successBg}` : ''}
      disabled={!textToCopy || isCopied}
      icon={isCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
      size="sm"
      tooltipContent={isCopied ? 'Copied!' : 'Copy Result'}
      tooltipPosition={tooltipPosition}
      variant="stealth"
      onClick={handleCopy}
    />
  );
});

export const TooltipButton = memo<TooltipButtonProps>(
  ({ tooltipContent, tooltipPosition, tooltipClasses, tooltipDisabled, ...buttonProps }): JSX.Element => {
    return (
      <Tooltip content={tooltipContent} disabled={tooltipDisabled || buttonProps.disabled} position={tooltipPosition} tooltipClasses={tooltipClasses}>
        <Button {...buttonProps} />
      </Tooltip>
    );
  },
);

export const ConfirmButton = memo<ConfirmButtonProps>(
  ({
    onConfirm,
    itemName,
    itemType,
    actionName = 'Delete',
    tooltipPosition = 'top',
    className = '',
    disabled = false,
    icon,
    confirmIcon,
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const { isConfirm, trigger } = useConfirmAction(onConfirm, CONFIRM_SHOW_MS);

    const tooltipContent = isConfirm ? `Confirm ${actionName}` : `${actionName} ${itemType}`;
    const ariaLabel = isConfirm ? `Confirm ${actionName.toLowerCase()} of ${itemName}` : `${actionName} ${itemType}: ${itemName}`;
    const buttonClass = `${className} ${isConfirm ? getConfirmClasses(theme) : ''}`.trim();

    const defaultIcon = icon ?? <Trash2Icon size={18} />;
    const defaultConfirmIcon = confirmIcon ?? <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={18} />;

    return (
      <TooltipButton
        aria-label={ariaLabel}
        className={buttonClass}
        disabled={disabled}
        icon={isConfirm ? defaultConfirmIcon : defaultIcon}
        size="sm"
        tooltipContent={tooltipContent}
        tooltipPosition={tooltipPosition}
        variant="danger"
        onClick={trigger}
      />
    );
  },
);
