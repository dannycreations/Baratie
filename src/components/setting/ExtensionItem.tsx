import { memo, useCallback } from 'react';

import { useCopyAction } from '../../hooks/useCopyAction';
import { useThemeStore } from '../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, RefreshCwIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ListLayout';
import { Tooltip } from '../shared/Tooltip';

import type { JSX } from 'react';
import type { Extension } from '../../helpers/extensionHelper';

type ExtensionItemStatusProps = Pick<Extension, 'status' | 'errors'>;

interface ExtensionItemActionHandlers {
  readonly onRefresh: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

export interface ExtensionItemProps extends ExtensionItemStatusProps, ExtensionItemActionHandlers {
  readonly id: string;
  readonly displayName: string;
  readonly isLoading: boolean;
}

const ExtensionItemStatus = memo<ExtensionItemStatusProps>(({ status, errors }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const statusMap = {
    loading: { icon: <Loader2Icon className="animate-spin" size={16} />, text: 'Loading...', color: theme.contentTertiary },
    loaded: { icon: <CheckIcon size={16} />, text: 'Loaded', color: theme.successFg },
    error: { icon: <AlertTriangleIcon size={16} />, text: 'Error', color: theme.dangerFg },
    partial: { icon: <AlertTriangleIcon size={16} />, text: 'Partial', color: theme.warningFg },
    awaiting: { icon: <Loader2Icon className="animate-spin" size={16} />, text: 'Awaiting Install...', color: theme.infoFg },
  };

  const current = statusMap[status] || statusMap.error;
  const content = (
    <div className={`flex items-center gap-2 text-xs font-medium text-${current.color}`}>
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
  const theme = useThemeStore((state) => state.theme);
  const { isCopied, copy } = useCopyAction();

  const handleCopyId = useCallback(async (): Promise<void> => {
    await copy(id);
  }, [copy, id]);

  const handleConfirmDelete = useCallback((): void => {
    onRemove(id);
  }, [onRemove, id]);

  const handleRefresh = useCallback((): void => {
    onRefresh(id);
  }, [onRefresh, id]);

  const leftContent = (
    <div className="flex flex-col">
      <span className={`font-medium text-${theme.contentPrimary}`}>{displayName}</span>
      <Tooltip content={isCopied ? 'Copied URL!' : 'Click to copy URL'} position="top">
        <button
          className={`
            cursor-pointer rounded-sm p-1 text-left text-xs
            text-${theme.contentTertiary} transition-colors
            duration-150 hover:bg-${theme.surfaceMuted} hover:text-${theme.infoFg}
            focus:outline-none
          `}
          onClick={handleCopyId}
        >
          {id}
        </button>
      </Tooltip>
    </div>
  );

  const rightContent = (
    <div className="flex items-center gap-2">
      <ExtensionItemStatus status={status} errors={errors} />
      <TooltipButton
        icon={<RefreshCwIcon size={18} />}
        size="sm"
        variant="stealth"
        disabled={isLoading}
        aria-label={`Refresh extension: ${displayName}`}
        tooltipContent="Refresh & Check for Updates"
        onClick={handleRefresh}
      />
      <ConfirmButton actionName="Remove" itemName={displayName} itemType="Extension" onConfirm={handleConfirmDelete} />
    </div>
  );

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 rounded-md bg-${theme.surfaceTertiary} p-2 text-sm transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
        leftClasses="grow min-w-0 mr-2"
        leftContent={leftContent}
        rightClasses="flex shrink-0 items-center"
        rightContent={rightContent}
      />
    </li>
  );
});
