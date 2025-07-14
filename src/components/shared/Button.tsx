import { memo, useCallback, useEffect, useState } from 'react';

import { COPY_SUCCESS_MS } from '../../app/constants';
import { errorHandler } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { CheckIcon, CopyIcon } from './Icon';
import { Tooltip } from './Tooltip';

import type { ButtonHTMLAttributes, JSX, MouseEvent, ReactNode } from 'react';
import type { AppTheme } from '../../app/themes';
import type { TooltipProps } from './Tooltip';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'stealth' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export type ButtonProps = {
  readonly children?: ReactNode;
  readonly fullWidth?: boolean;
  readonly icon?: ReactNode;
  readonly iconPosition?: 'left' | 'right';
  readonly loading?: boolean;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export interface TooltipButtonProps extends ButtonProps {
  readonly tooltipClassName?: string;
  readonly tooltipContent: ReactNode;
  readonly tooltipDisabled?: boolean;
  readonly tooltipPosition?: TooltipProps['position'];
}

interface CopyButtonProps {
  readonly textToCopy: string;
  readonly tooltipPosition?: TooltipProps['position'];
}

const TEXT_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const ICON_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'p-1',
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
};

const getVariantClasses = (variant: ButtonVariant, theme: AppTheme): string => {
  const variantMap: Record<ButtonVariant, string> = {
    primary: `border-transparent bg-${theme.accentBg} text-${theme.accentFg} hover:bg-${theme.accentBgHover}`,
    secondary: `bg-${theme.surfaceTertiary} text-${theme.contentSecondary} hover:bg-${theme.surfaceHover} hover:text-${theme.contentPrimary}`,
    danger: `border-${theme.dangerBorder} bg-transparent text-${theme.dangerFg} hover:bg-${theme.dangerBgHover}`,
    stealth: `border-transparent bg-transparent text-${theme.contentTertiary} hover:bg-${theme.surfaceMuted} hover:text-${theme.infoFg}`,
    outline: `border-${theme.borderPrimary} bg-transparent text-${theme.contentSecondary} hover:border-${theme.borderSecondary} hover:bg-${theme.surfaceMuted}`,
  };
  return variantMap[variant] || variantMap.primary;
};

export const Button = memo<ButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    className = '',
    disabled = false,
    type = 'button',
    onClick,
    ...props
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      },
      [disabled, loading, onClick],
    );

    const baseClasses = `inline-flex items-center justify-center border font-medium transition-all duration-150 ease-in-out outline-none focus:ring-2 focus:ring-${theme.ring} disabled:cursor-not-allowed disabled:opacity-50`;
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const loadingClass = loading ? 'opacity-60' : '';
    const variantClass = getVariantClasses(variant, theme);
    const sizeClass = children ? TEXT_SIZE_MAP[size] : ICON_SIZE_MAP[size];
    const widthClass = fullWidth ? 'w-full' : '';

    const finalClassName = [baseClasses, shapeClass, loadingClass, variantClass, sizeClass, widthClass, className].filter(Boolean).join(' ');

    const iconMarginClass = children && icon ? (iconPosition === 'left' ? 'mr-1.5' : 'ml-1.5') : '';
    const loadingSpinner = (
      <svg
        aria-hidden="true"
        className={`h-4 w-4 animate-spin ${iconMarginClass}`}
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
      </svg>
    );

    const showIconLeft = iconPosition === 'left';
    const showIconRight = iconPosition === 'right';

    return (
      <button type={type} className={finalClassName.trim()} disabled={loading || disabled} onClick={handleClick} {...props}>
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
  const [isCopied, setIsCopied] = useState(false);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (!isCopied) return;
    const timer = window.setTimeout(() => setIsCopied(false), COPY_SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!textToCopy) return;
    const { error } = await errorHandler.attemptAsync(() => navigator.clipboard.writeText(textToCopy), 'Clipboard Copy');
    if (!error) setIsCopied(true);
  }, [textToCopy]);

  return (
    <TooltipButton
      aria-label={isCopied ? 'Result Copied to Clipboard' : 'Copy Result to Clipboard'}
      className={isCopied ? `text-${theme.successFg} hover:!bg-${theme.successBg}` : ''}
      disabled={!textToCopy || isCopied}
      icon={isCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
      onClick={handleCopy}
      size="sm"
      tooltipContent={isCopied ? 'Copied!' : 'Copy Result'}
      tooltipPosition={tooltipPosition}
      variant="stealth"
    />
  );
});

export const TooltipButton = memo<TooltipButtonProps>(
  ({ tooltipContent, tooltipPosition, tooltipClassName, tooltipDisabled, ...buttonProps }): JSX.Element => {
    return (
      <Tooltip
        content={tooltipContent}
        disabled={tooltipDisabled || buttonProps.disabled}
        position={tooltipPosition}
        tooltipClassName={tooltipClassName}
      >
        <Button {...buttonProps} />
      </Tooltip>
    );
  },
);
