import { clsx } from 'clsx';
import { memo, useCallback } from 'react';

import { CONFIRM_SHOW_MS, ICON_SIZES } from '../../app/constants';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useCopyAction } from '../../hooks/useCopyAction';
import { AlertTriangleIcon, CheckIcon, CopyIcon, Loader2Icon, Trash2Icon } from './Icon';
import { Tooltip } from './Tooltip';

import type { JSX, MouseEvent, ReactNode } from 'react';
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

const BUTTON_VARIANT_MAP: Readonly<Record<ButtonVariant, string>> = {
  danger: 'btn-danger',
  outline: 'btn-outline',
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  stealth: 'btn-stealth',
};

const BUTTON_SIZE_MAP: Readonly<Record<ButtonSize, string>> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  lg: 'btn-lg',
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
    variant = 'primary',
  }): JSX.Element => {
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const variantClass = BUTTON_VARIANT_MAP[variant] || BUTTON_VARIANT_MAP.primary;
    const sizeClass = BUTTON_SIZE_MAP[size] || BUTTON_SIZE_MAP.sm;

    const iconMarginClass = children && icon ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : '';
    const loadingSpinner = <Loader2Icon size={ICON_SIZES.XS} className={clsx('animate-spin', iconMarginClass)} />;

    const showIconLeft = iconPosition === 'left';
    const showIconRight = iconPosition === 'right';

    return (
      <button
        type={type}
        className={clsx('btn-base', shapeClass, variantClass, sizeClass, loading && 'opacity-60', fullWidth && 'w-full', className)}
        disabled={loading || disabled}
        onClick={onClick}
      >
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

  const handleCopy = useCallback(async (): Promise<void> => {
    await copy(textToCopy);
  }, [copy, textToCopy]);

  return (
    <TooltipButton
      icon={isCopied ? <CheckIcon size={ICON_SIZES.SM} /> : <CopyIcon size={ICON_SIZES.SM} />}
      size="sm"
      variant="stealth"
      className={clsx(isCopied && 'text-success-fg')}
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
    const { isConfirm, trigger } = useConfirmAction(onConfirm, CONFIRM_SHOW_MS);

    const tooltipContent = isConfirm ? (customConfirmTooltip ?? `Confirm ${actionName}`) : (customTooltip ?? `${actionName} ${itemType}`);

    const buttonClass = clsx(isConfirm && 'bg-danger-bg! text-accent-fg!', className);

    return (
      <TooltipButton
        icon={
          isConfirm
            ? (confirmIcon ?? <AlertTriangleIcon className="text-danger-fg" size={ICON_SIZES.SM} />)
            : (icon ?? <Trash2Icon size={ICON_SIZES.SM} />)
        }
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
