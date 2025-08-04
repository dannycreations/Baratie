import { memo, useCallback, useEffect, useState } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { parseGitHubUrl } from '../../../helpers/extensionHelper';
import { useOverflow } from '../../../hooks/useOverflow';
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
  const [validationStatus, setValidationStatus] = useState<'empty' | 'valid' | 'invalid'>('empty');

  const { ref: listScrollRef, hasOverflowY } = useOverflow<HTMLDivElement>();

  useEffect(() => {
    const pendingInstall = extensions.find((ext) => ext.status === 'awaiting');
    if (pendingInstall && pendingInstall.manifest) {
      openModal({
        type: 'extension',
        props: {
          id: pendingInstall.id,
          manifest: pendingInstall.manifest,
        },
      });
    }
  }, [extensions, openModal]);

  useEffect(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setValidationStatus('empty');
      return;
    }
    const isValid = parseGitHubUrl(trimmedUrl);
    setValidationStatus(isValid ? 'valid' : 'invalid');
  }, [url]);

  const handleAdd = useCallback(async (): Promise<void> => {
    if (!url.trim() || isLoading || validationStatus !== 'valid') {
      return;
    }
    setIsLoading(true);
    try {
      await addExtension(url);
      setUrl('');
    } finally {
      setIsLoading(false);
    }
  }, [url, isLoading, addExtension, validationStatus]);

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
    <div className="flex h-full flex-col gap-3">
      <p className={`text-sm text-${theme.contentTertiary}`}>
        Add external ingredients by providing a link to a public GitHub repository. The repository must contain a{' '}
        <code className={`p-1 rounded-md bg-${theme.surfaceHover} text-xs text-${theme.contentSecondary}`}>manifest.json</code> file.
      </p>
      <div className="flex items-center gap-2">
        <StringInput
          id="extension-url-input"
          className="grow"
          value={url}
          disabled={isLoading}
          placeholder="user/repo@branch or full GitHub URL"
          showClearButton
          onChange={handleUrlChange}
          onKeyDown={handleKeyDown}
          onClear={() => setUrl('')}
        />
        <Button
          icon={<GitMergeIcon size={ICON_SIZES.MD} />}
          size="sm"
          loading={isLoading}
          disabled={validationStatus !== 'valid'}
          onClick={handleAdd}
        >
          Add
        </Button>
      </div>

      <div className="flex flex-1 flex-col min-h-0">
        <h4 className={`mb-3 font-medium text-base text-${theme.contentSecondary}`}>Installed Extensions</h4>
        <div ref={listScrollRef} className={`grow overflow-y-auto ${hasOverflowY ? 'pr-1' : ''}`}>
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
    </div>
  );
});
