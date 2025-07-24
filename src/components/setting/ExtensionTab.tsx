import { memo, useCallback, useState } from 'react';

import { useExtensionStore } from '../../stores/useExtensionStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button, ConfirmButton, TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, GitMergeIcon, Loader2Icon, RefreshCwIcon } from '../shared/Icon';
import { StringInput } from '../shared/input/StringInput';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
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
  };

  const current = statusMap[status] || statusMap.error;
  const content = (
    <div className={`flex items-center gap-1.5 text-xs font-medium text-${current.color}`}>
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

  const handleConfirmDelete = useCallback(() => {
    onRemove(id);
  }, [onRemove, id]);

  const handleRefresh = useCallback(() => {
    onRefresh(id);
  }, [onRefresh, id]);

  const leftContent = (
    <div className="flex flex-col">
      <span className={`font-medium text-${theme.contentPrimary}`}>{displayName}</span>
      <span className={`text-xs text-${theme.contentTertiary}`}>{id}</span>
    </div>
  );

  const rightContent = (
    <div className="flex items-center gap-2">
      <ExtensionItemStatus errors={errors} status={status} />
      <TooltipButton
        aria-label={`Refresh extension: ${displayName}`}
        disabled={isLoading}
        icon={<RefreshCwIcon size={18} />}
        size="sm"
        tooltipContent="Refresh & Check for Updates"
        variant="stealth"
        onClick={handleRefresh}
      />
      <ConfirmButton actionName="Remove" itemName={displayName} itemType="Extension" onConfirm={handleConfirmDelete} />
    </div>
  );

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 rounded-md bg-${theme.surfaceTertiary} p-3 text-sm transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
        leftContent={leftContent}
        leftClasses="grow min-w-0 mr-2"
        rightContent={rightContent}
        rightClasses="flex shrink-0 items-center"
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
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = useCallback(async () => {
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

  const handleUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className={`text-sm text-${theme.contentTertiary}`}>
          Add external ingredients by providing a link to a public GitHub repository. The repository must contain a{' '}
          <code className={`rounded-md bg-${theme.surfaceHover} p-1 text-xs text-${theme.contentSecondary}`}>manifest.json</code> file.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <StringInput
          id="extension-url-input"
          aria-label="GitHub Repository URL"
          className="grow"
          disabled={isLoading}
          placeholder="user/repo@branch or full GitHub URL"
          value={url}
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
        />
        <Button icon={<GitMergeIcon size={20} />} loading={isLoading} size="md" onClick={handleAdd}>
          Add
        </Button>
      </div>

      <div>
        <h4 className={`mb-2 text-base font-medium text-${theme.contentSecondary}`}>Installed Extensions</h4>
        {extensions.length === 0 ? (
          <EmptyView>No extensions have been installed yet.</EmptyView>
        ) : (
          <ul className="space-y-1.5">
            {extensions.map((extension) => (
              <ExtensionItem
                key={extension.id}
                id={extension.id}
                displayName={extension.name || extension.id}
                errors={extension.errors}
                isLoading={extension.status === 'loading'}
                status={extension.status}
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
