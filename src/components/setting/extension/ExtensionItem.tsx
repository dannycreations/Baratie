import { clsx } from 'clsx';
import { memo, useCallback } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { useCopyAction } from '../../../hooks/useCopyAction';
import { ConfirmButton, TooltipButton } from '../../shared/Button';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, RefreshCwIcon } from '../../shared/Icon';
import { Tooltip } from '../../shared/Tooltip';

import type { JSX } from 'react';
import type { Extension } from '../../../helpers/extensionHelper';
import type { ExtensionState } from '../../../stores/useExtensionStore';

type ExtensionItemStatusProps = Pick<Extension, 'status' | 'errors'>;

interface ExtensionItemActionHandlers {
  readonly onRefresh: ExtensionState['refresh'];
  readonly onRemove: ExtensionState['remove'];
}

export interface ExtensionItemProps extends ExtensionItemStatusProps, ExtensionItemActionHandlers {
  readonly id: string;
  readonly displayName: string;
  readonly isLoading: boolean;
}

const ExtensionItemStatus = memo<ExtensionItemStatusProps>(({ status, errors }): JSX.Element => {
  const statusMap = {
    loading: { icon: <Loader2Icon className="animate-spin" size={ICON_SIZES.XS} />, text: 'Loading...', colorClass: 'text-content-tertiary' },
    loaded: { icon: <CheckIcon size={ICON_SIZES.XS} />, text: 'Loaded', colorClass: 'text-success-fg' },
    error: { icon: <AlertTriangleIcon size={ICON_SIZES.XS} />, text: 'Error', colorClass: 'text-danger-fg' },
    partial: { icon: <AlertTriangleIcon size={ICON_SIZES.XS} />, text: 'Partial', colorClass: 'text-warning-fg' },
    awaiting: { icon: <Loader2Icon className="animate-spin" size={ICON_SIZES.XS} />, text: 'Awaiting Install...', colorClass: 'text-info-fg' },
  };

  const current = statusMap[status] || statusMap.error;
  const content = (
    <div className={clsx('flex items-center gap-2 text-xs font-medium', current.colorClass)}>
      {current.icon}
      <span>{current.text}</span>
    </div>
  );

  const hasErrors = errors && errors.length > 0;
  if (hasErrors) {
    const errorList = errors.join('\n');
    return (
      <Tooltip content={`Errors:\n${errorList}`} position="top" tooltipClasses="max-w-sm whitespace-pre-line">
        {content}
      </Tooltip>
    );
  }

  return content;
});

export const ExtensionItem = memo<ExtensionItemProps>(({ id, displayName, status, errors, isLoading, onRefresh, onRemove }): JSX.Element => {
  const { isCopied, copy } = useCopyAction();

  const handleCopyId = useCallback(async (): Promise<void> => {
    await copy(id);
  }, [copy, id]);

  const handleConfirmDelete = useCallback((): void => {
    onRemove(id);
  }, [id, onRemove]);

  const handleRefresh = useCallback((): void => {
    onRefresh(id, { context: 'refresh' });
  }, [id, onRefresh]);

  const leftContent = (
    <div className="flex flex-col">
      <h3 className="list-item-title font-medium text-content-primary">{displayName}</h3>
      <Tooltip content={isCopied ? 'Copied URL!' : 'Click to copy URL'} position="top">
        <button
          className="cursor-pointer rounded-sm text-left text-xs text-content-tertiary transition-colors duration-150 hover:bg-surface-muted hover:text-info-fg"
          onClick={handleCopyId}
        >
          {id}
        </button>
      </Tooltip>
    </div>
  );

  const rightContent = (
    <>
      <ExtensionItemStatus status={status} errors={errors} />
      <TooltipButton
        icon={<RefreshCwIcon size={ICON_SIZES.SM} />}
        size="sm"
        variant="stealth"
        disabled={isLoading}
        tooltipContent="Refresh"
        onClick={handleRefresh}
      />
      <ConfirmButton actionName="Remove" itemType="Extension" onConfirm={handleConfirmDelete} />
    </>
  );

  return (
    <li className="list-item-container h-16 transition-colors duration-150 hover:bg-surface-muted">
      <div className="mr-2 flex-1-min-0">{leftContent}</div>
      <div className="list-item-actions">{rightContent}</div>
    </li>
  );
});
