import { GitMerge } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ICON_SIZES } from '../../../app/constants';
import { parseGitHubUrl } from '../../../helpers/extensionHelper';
import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useModalStore } from '../../../stores/useModalStore';
import { Button } from '../../shared/Button';
import { StringInput } from '../../shared/input/StringInput';
import { ScrollArea } from '../../shared/ScrollArea';
import { EmptyView } from '../../shared/View';
import { ExtensionItem } from './ExtensionItem';

import type { JSX, KeyboardEvent } from 'react';

export const ExtensionTab = memo((): JSX.Element => {
  const extensions = useExtensionStore((state) => state.extensions);
  const addExtension = useExtensionStore((state) => state.add);
  const removeExtension = useExtensionStore((state) => state.remove);
  const refreshExtension = useExtensionStore((state) => state.refresh);
  const openModal = useModalStore((state) => state.openModal);

  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const pendingInstall = extensions.find((ext) => ext.status === 'awaiting' && ext.manifest);
    const manifest = pendingInstall?.manifest;
    if (pendingInstall && manifest && useModalStore.getState().currentModal?.type !== 'extension') {
      openModal({
        type: 'extension',
        props: {
          id: pendingInstall.id,
          manifest,
        },
      });
    }
  }, [extensions, openModal]);

  const validationStatus = useMemo<'empty' | 'valid' | 'invalid'>(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      return 'empty';
    }
    return parseGitHubUrl(trimmedUrl) ? 'valid' : 'invalid';
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
  }, [addExtension, isLoading, url, validationStatus]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter') {
        handleAdd();
      }
    },
    [handleAdd],
  );

  const listContent = useMemo(
    () =>
      extensions.length > 0 ? (
        <ul className="list-container">
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
      ) : (
        <EmptyView>No extensions have been installed yet.</EmptyView>
      ),
    [extensions, refreshExtension, removeExtension],
  );

  return (
    <>
      <div className="stack-h-small">
        <StringInput
          id="extension-url-input"
          className="flex-1-min-0"
          value={url}
          disabled={isLoading}
          placeholder="user/repo@branch or full GitHub URL"
          showClearButton
          onChange={setUrl}
          onKeyDown={handleKeyDown}
          onClear={() => setUrl('')}
        />
        <Button icon={<GitMerge size={ICON_SIZES.MD} />} size="sm" loading={isLoading} disabled={validationStatus !== 'valid'} onClick={handleAdd}>
          Add
        </Button>
      </div>

      <div className="flex-col-gap-2">
        <h4 className="label-base mb-1 !text-base">Installed Extensions</h4>
        <ScrollArea className="flex-1-overflow-auto">{listContent}</ScrollArea>
      </div>
    </>
  );
});
