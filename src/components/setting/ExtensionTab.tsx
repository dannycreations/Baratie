import { memo, useCallback, useState } from 'react';

import { CONFIRM_TIMEOUT_MS } from '../../app/constants';
import { addExtension, removeExtension } from '../../helpers/extensionHelper';
import { getConfirmClasses } from '../../helpers/styleHelper';
import { useConditionalTimer } from '../../hooks/useConditionalTimer';
import { useExtensionStore } from '../../stores/useExtensionStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { Button, TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, CheckIcon, GitMergeIcon, Loader2Icon, Trash2Icon } from '../shared/Icon';
import { StringInput } from '../shared/input/StringInput';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { Tooltip } from '../shared/Tooltip';
import { EmptyView } from '../shared/View';

import type { ChangeEvent, JSX, KeyboardEvent } from 'react';
import type { Extension } from '../../stores/useExtensionStore';

interface ExtensionItemStatusProps {
  readonly status: Extension['status'];
  readonly errors?: readonly string[];
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
      <Tooltip content={`Errors:\n${errorList}`} position="top" tooltipClassName="max-w-sm whitespace-pre-line">
        {content}
      </Tooltip>
    );
  }

  return content;
});

interface ExtensionItemProps {
  readonly extension: Extension;
  readonly onDelete: (id: string) => void;
  readonly deletingId: string | null;
}

const ExtensionItem = memo<ExtensionItemProps>(({ extension, onDelete, deletingId }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const isDeleting = deletingId === extension.id;

  const handleDeleteClick = (): void => {
    onDelete(extension.id);
  };

  const deleteButtonTip = isDeleting ? 'Confirm Deletion' : 'Remove Extension';
  const deleteButtonLabel = isDeleting ? `Confirm removal of extension ${extension.name}` : `Remove extension ${extension.name}`;
  const deleteButtonClasses = isDeleting ? getConfirmClasses(theme) : undefined;

  const leftContent = (
    <div className="flex flex-col">
      <span className={`font-medium text-${theme.contentPrimary}`}>{extension.name}</span>
      <span className={`text-xs text-${theme.contentTertiary}`}>{extension.id}</span>
    </div>
  );

  const rightContent = (
    <div className="flex items-center gap-4">
      <ExtensionItemStatus status={extension.status} errors={extension.errors} />
      <TooltipButton
        aria-label={deleteButtonLabel}
        className={deleteButtonClasses}
        icon={isDeleting ? <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={18} /> : <Trash2Icon size={18} />}
        size="sm"
        tooltipContent={deleteButtonTip}
        variant="danger"
        onClick={handleDeleteClick}
      />
    </div>
  );

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 rounded-md bg-${theme.surfaceTertiary} p-3 text-sm transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
        leftContent={leftContent}
        leftClass="grow min-w-0 mr-2"
        rightContent={rightContent}
        rightClass="flex shrink-0 items-center"
      />
    </li>
  );
});

export const ExtensionTab = memo((): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const extensions = useExtensionStore((state) => state.extensions);

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetDeleting = useCallback(() => {
    setDeletingId(null);
  }, []);

  useConditionalTimer({
    state: deletingId ? 'running' : 'stopped',
    callback: resetDeleting,
    duration: CONFIRM_TIMEOUT_MS,
  });

  const handleAdd = useCallback(async () => {
    if (!url.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await addExtension(url);
      setUrl('');
    } finally {
      setIsLoading(false);
    }
  }, [url, isLoading]);

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

  const handleDelete = useCallback(
    (extensionId: string) => {
      if (deletingId === extensionId) {
        removeExtension(extensionId);
        setDeletingId(null);
      } else {
        setDeletingId(extensionId);
      }
    },
    [deletingId],
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
          ariaLabel="GitHub Repository URL"
          className="grow"
          disabled={isLoading}
          placeholder="https://github.com/user/repository"
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
              <ExtensionItem key={extension.id} extension={extension} deletingId={deletingId} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
