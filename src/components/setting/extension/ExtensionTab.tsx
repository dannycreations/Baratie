import { memo, useCallback, useEffect, useState } from 'react';

import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useModalStore } from '../../../stores/useModalStore';
import { useThemeStore } from '../../../stores/useThemeStore';
import { Button } from '../../shared/Button';
import { GitMergeIcon } from '../../shared/Icon';
import { StringInput } from '../../shared/input/StringInput';
import { EmptyView } from '../../shared/View';
import { ExtensionItem } from './ExtensionItem';

import type { ChangeEvent, JSX, KeyboardEvent } from 'react';

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
      openModal('extension', { id: pendingInstall.id, manifest: pendingInstall.manifest });
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
