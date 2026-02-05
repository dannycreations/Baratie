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

function getButtonVariantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'danger':
      return 'border-danger-border bg-transparent text-danger-fg hover:bg-danger-bg-hover';
    case 'outline':
      return 'border-border-primary bg-transparent text-content-secondary hover:border-border-secondary hover:bg-surface-muted';
    case 'primary':
      return 'border-transparent bg-accent-bg text-accent-fg hover:bg-accent-bg-hover';
    case 'secondary':
      return 'border-transparent bg-surface-tertiary text-content-secondary hover:bg-surface-hover hover:text-content-primary';
    case 'stealth':
      return 'border-transparent bg-transparent text-content-tertiary hover:bg-surface-muted hover:text-content-primary';
    default:
      return 'border-transparent bg-accent-bg text-accent-fg hover:bg-accent-bg-hover';
  }
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
    variant = 'primary',
  }): JSX.Element => {
    const baseClass = `inline-flex items-center justify-center font-medium border outline-none transition-all duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-50`;
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const variantClass = getButtonVariantClass(variant as ButtonVariant);
    const sizeClass = children ? clsx(PADDING_MAP[size], TEXT_SIZE_MAP[size]) : PADDING_MAP[size];
    const finalClassName = clsx(baseClass, shapeClass, variantClass, sizeClass, loading && 'opacity-60', fullWidth && 'w-full', className);

    const iconMarginClass = children && icon ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : '';
    const loadingSpinner = <Loader2Icon size={ICON_SIZES.XS} className={clsx('animate-spin', iconMarginClass)} />;

    const showIconLeft = iconPosition === 'left';
    const showIconRight = iconPosition === 'right';

    return (
      <button type={type} className={finalClassName} disabled={loading || disabled} onClick={onClick}>
        {loading && showIconLeft && loadingSpinner}
        {icon && showIconLeft && <span className={clsx(iconMarginClass)}>{icon}</span>}
        {children}
        {icon && showIconRight && <span className={clsx(iconMarginClass)}>{icon}</span>}
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
      className={isCopied ? 'text-success-fg' : ''}
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

    const defaultTooltip = `${actionName} ${itemType}`;
    const defaultConfirmTooltip = `Confirm ${actionName}`;
    const tooltipContent = isConfirm ? (customConfirmTooltip ?? defaultConfirmTooltip) : (customTooltip ?? defaultTooltip);

    const buttonClass = clsx(className, isConfirm && 'bg-danger-bg text-accent-fg');

    const defaultIcon = icon ?? <Trash2Icon size={ICON_SIZES.SM} />;
    const defaultConfirmIcon = confirmIcon ?? <AlertTriangleIcon className="text-danger-fg" size={ICON_SIZES.SM} />;

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
