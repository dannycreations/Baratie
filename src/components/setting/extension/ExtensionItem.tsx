import { memo, useCallback, useMemo } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { useCopyAction } from '../../../hooks/useCopyAction';
import { useThemeStore } from '../../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../../shared/Button';
import { AlertTriangleIcon, CheckIcon, Loader2Icon, RefreshCwIcon } from '../../shared/Icon';
import { ItemListLayout } from '../../shared/layout/ListLayout';
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
  const theme = useThemeStore((state) => state.theme);

  const statusMap = {
    loading: { icon: <Loader2Icon className="animate-spin" size={ICON_SIZES.XS} />, text: 'Loading...', color: theme.contentTertiary },
    loaded: { icon: <CheckIcon size={ICON_SIZES.XS} />, text: 'Loaded', color: theme.successFg },
    error: { icon: <AlertTriangleIcon size={ICON_SIZES.XS} />, text: 'Error', color: theme.dangerFg },
    partial: { icon: <AlertTriangleIcon size={ICON_SIZES.XS} />, text: 'Partial', color: theme.warningFg },
    awaiting: { icon: <Loader2Icon className="animate-spin" size={ICON_SIZES.XS} />, text: 'Awaiting Install...', color: theme.infoFg },
  };

  const current = statusMap[status] || statusMap.error;
  const content = (
    <div className={`flex items-center gap-2 font-medium text-xs text-${current.color}`}>
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
    onRefresh(id, { context: 'refresh' });
  }, [onRefresh, id]);

  const leftContent = useMemo(
    () => (
      <div className="flex flex-col">
        <h3 className={`font-medium text-${theme.contentPrimary} cursor-default`}>{displayName}</h3>
        <Tooltip content={isCopied ? 'Copied URL!' : 'Click to copy URL'} position="top">
          <button
            className={`rounded-sm text-left text-xs text-${theme.contentTertiary} cursor-pointer transition-colors duration-150 hover:bg-${theme.surfaceMuted} hover:text-${theme.infoFg}`}
            onClick={handleCopyId}
          >
            {id}
          </button>
        </Tooltip>
      </div>
    ),
    [theme, displayName, isCopied, handleCopyId, id],
  );

  const rightContent = useMemo(
    () => (
      <div className="flex items-center gap-2">
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
      </div>
    ),
    [status, errors, isLoading, handleRefresh, handleConfirmDelete],
  );

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 p-2 text-sm rounded-md bg-${theme.surfaceTertiary} transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
        leftClasses="min-w-0 grow mr-2"
        leftContent={leftContent}
        rightClasses="flex shrink-0 items-center"
        rightContent={rightContent}
      />
    </li>
  );
});
