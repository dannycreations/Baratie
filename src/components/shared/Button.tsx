import { cn } from 'cnfast';
import { AlertTriangle, Check, Copy, Loader2, Trash2 } from 'lucide-react';
import { memo, useCallback } from 'react';

import { CONFIRM_SHOW_MS, ICON_SIZES } from '../../app/constants';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useCopyAction } from '../../hooks/useCopyAction';
import { Tooltip } from './Tooltip';

import type { JSX, MouseEvent, ReactNode } from 'react';
import type { ButtonSize, ButtonVariant } from '../../app/types';
import type { TooltipProps } from './Tooltip';

interface ButtonProps {
  readonly children?: ReactNode;
  readonly icon?: ReactNode;
  readonly loading?: boolean;
  readonly size?: ButtonSize;
  readonly variant?: ButtonVariant;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly type?: 'button' | 'submit' | 'reset';
}

interface TooltipButtonProps extends ButtonProps {
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
    icon,
    loading = false,
    onClick,
    size = 'sm',
    type = 'button',
    variant = 'primary',
  }): JSX.Element => {
    const shapeClass = children ? 'rounded-md' : 'rounded-full';
    const iconMarginClass = children && icon ? 'mr-2' : '';

    let leading: ReactNode = null;
    if (loading) {
      leading = <Loader2 size={ICON_SIZES.XS} className={cn('animate-spin', iconMarginClass)} />;
    } else if (icon) {
      leading = <span className={iconMarginClass}>{icon}</span>;
    }

    return (
      <button
        type={type}
        className={cn('btn-base', shapeClass, BUTTON_VARIANT_MAP[variant], BUTTON_SIZE_MAP[size], loading && 'opacity-60', className)}
        disabled={loading || disabled}
        onClick={onClick}
      >
        {leading}
        {children}
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
      icon={isCopied ? <Check size={ICON_SIZES.SM} /> : <Copy size={ICON_SIZES.SM} />}
      size="sm"
      variant="stealth"
      className={cn(isCopied && 'text-success-fg')}
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

    const buttonClass = cn(isConfirm && 'bg-danger-bg! text-accent-fg!', className);

    return (
      <TooltipButton
        icon={
          isConfirm ? (confirmIcon ?? <AlertTriangle className="text-danger-fg" size={ICON_SIZES.SM} />) : (icon ?? <Trash2 size={ICON_SIZES.SM} />)
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
