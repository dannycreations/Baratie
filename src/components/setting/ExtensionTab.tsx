import { memo, useCallback, useEffect, useState } from 'react';

import { useCopyAction } from '../../hooks/useCopyAction';
import { useExtensionStore } from '../../stores/useExtensionStore';
import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button, ConfirmButton, TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, GitMergeIcon, Loader2Icon, RefreshCwIcon } from '../shared/Icon';
import { StringInput } from '../shared/input/StringInput';
import { ItemListLayout } from '../shared/layout/ListLayout';
import { Tooltip } from '../shared/Tooltip';
import { EmptyView } from '../shared/View';

import type { ChangeEvent, JSX, KeyboardEvent } from 'react';
import type { Extension } from '../../helpers/extensionHelper';

type ExtensionItemStatusProps = Pick<Extension, 'status' | 'errors'>;

interface ExtensionItemActionHandlers {
  readonly onRefresh: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

interface ExtensionItemProps extends ExtensionItemStatusProps, ExtensionItemActionHandlers {
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

const ExtensionItem = memo<ExtensionItemProps>(({ id, displayName, status, errors, isLoading, onRefresh, onRemove }): JSX.Element => {
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

export const ExtensionTab = memo((): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const extensions = useExtensionStore((state) => state.extensions);
  const addExtension = useExtensionStore((state) => state.add);
  const removeExtension = useExtensionStore((state) => state.remove);
  const refreshExtension = useExtensionStore((state) => state.refresh);
  const openModal = useModalStore((state) => state.openModal);

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const pendingInstall = extensions.find((ext) => ext.status === 'awaiting');
    if (pendingInstall && pendingInstall.manifest) {
      openModal('extensionInstall', { id: pendingInstall.id, manifest: pendingInstall.manifest });
    }
  }, [extensions, openModal]);

  const handleAdd = useCallback(async (): Promise<void> => {
    if (!url.trim() || isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      await addExtension(url);
      setUrl('');
    } finally {
      setIsLoading(false);
    }
  }, [url, isLoading, addExtension]);

  const handleUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setUrl(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="space-y-3">
      <div>
        <p className={`text-sm text-${theme.contentTertiary}`}>
          Add external ingredients by providing a link to a public GitHub repository. The repository must contain a{' '}
          <code className={`rounded-md bg-${theme.surfaceHover} p-1 text-xs text-${theme.contentSecondary}`}>manifest.json</code> file.
        </p>
      </div>

      <div className="flex items-center gap-1">
        <StringInput
          id="extension-url-input"
          className="grow"
          value={url}
          aria-label="GitHub Repository URL"
          disabled={isLoading}
          placeholder="user/repo@branch or full GitHub URL"
          showClearButton
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
          onClear={() => setUrl('')}
        />
        <Button icon={<GitMergeIcon size={20} />} size="sm" loading={isLoading} onClick={handleAdd}>
          Add
        </Button>
      </div>

      <div>
        <h4 className={`mb-3 text-base font-medium text-${theme.contentSecondary}`}>Installed Extensions</h4>
        {extensions.length === 0 ? (
          <EmptyView>No extensions have been installed yet.</EmptyView>
        ) : (
          <ul className="space-y-2">
            {extensions.map((extension) => (
              <ExtensionItem
                key={extension.id}
                id={extension.id}
                displayName={extension.name || extension.id}
                status={extension.status}
                errors={extension.errors}
                isLoading={extension.status === 'loading'}
                onRefresh={refreshExtension}
                onRemove={removeExtension}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
