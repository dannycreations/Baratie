import { clsx } from 'clsx';
import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAutoFocus } from '../../../hooks/useAutoFocus';
import { useOverflow } from '../../../hooks/useOverflow';
import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useModalStore } from '../../../stores/useModalStore';
import { Button } from '../../shared/Button';
import { BooleanInput } from '../../shared/input/BooleanInput';
import { StringInput } from '../../shared/input/StringInput';
import { GroupListLayout } from '../../shared/layout/ListLayout';
import { Modal } from '../../shared/Modal';

import type { ChangeEvent, JSX } from 'react';
import type { ManifestModule } from '../../../helpers/extensionHelper';
import type { GroupListItem } from '../../shared/layout/ListLayout';

type ModuleIngredient = ManifestModule & { id: string };

function groupModulesForDisplay(modules: ReadonlyArray<ManifestModule>): Array<[string, Array<ModuleIngredient>]> {
  const grouped = new Map<string, Array<ModuleIngredient>>();

  for (const module of modules) {
    const item = { ...module, id: module.entry };
    const list = grouped.get(item.category);
    if (list) {
      list.push(item);
    } else {
      grouped.set(item.category, [item]);
    }
  }

  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export const ExtensionManager = memo((): JSX.Element | null => {
  const currentModal = useModalStore((state) => state.currentModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const installSelectedModules = useExtensionStore((state) => state.installSelectedModules);
  const cancelPendingInstall = useExtensionStore((state) => state.cancelPendingInstall);

  const [query, setQuery] = useState('');
  const [selectedEntries, setSelectedEntries] = useState(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);

  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const { ref: scrollRef, className: scrollClasses } = useOverflow<HTMLDivElement>();

  const isModalOpen = currentModal?.type === 'extension';
  const pendingSelection = isModalOpen ? currentModal.props : null;

  useAutoFocus(searchRef, isModalOpen);

  const manifestModules = useMemo(() => {
    const entry = pendingSelection?.manifest.entry;
    if (Array.isArray(entry) && (entry.length === 0 || typeof entry[0] === 'object')) {
      return entry as ManifestModule[];
    }
    return [];
  }, [pendingSelection]);

  useEffect(() => {
    if (pendingSelection) {
      setSelectedEntries(new Set(manifestModules.map((m) => m.entry)));
    }
  }, [pendingSelection, manifestModules]);

  const groupedModules = useMemo(() => {
    return groupModulesForDisplay(manifestModules);
  }, [manifestModules]);

  const filteredGroupedModules = useMemo(() => {
    const lowerQuery = deferredQuery.toLowerCase().trim();
    if (!lowerQuery) {
      return groupedModules;
    }

    const result: Array<[string, Array<ModuleIngredient>]> = [];

    for (const [category, modules] of groupedModules) {
      if (category.toLowerCase().includes(lowerQuery)) {
        result.push([category, modules]);
        continue;
      }
      const matchingModules = modules.filter((m) => m.name.toLowerCase().includes(lowerQuery) || m.description.toLowerCase().includes(lowerQuery));
      if (matchingModules.length > 0) {
        result.push([category, matchingModules]);
      }
    }
    return result;
  }, [groupedModules, deferredQuery]);

  const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const handleToggleModule = useCallback((entry: string): void => {
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entry)) {
        newSet.delete(entry);
      } else {
        newSet.add(entry);
      }
      return newSet;
    });
  }, []);

  const handleToggleCategory = useCallback((modules: ReadonlyArray<GroupListItem>): void => {
    const moduleEntries = modules.map((m) => m.id);
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      const areAllSelected = modules.length > 0 && moduleEntries.every((entry) => newSet.has(entry));
      if (areAllSelected) {
        for (const entry of moduleEntries) {
          newSet.delete(entry);
        }
      } else {
        for (const entry of moduleEntries) {
          newSet.add(entry);
        }
      }
      return newSet;
    });
  }, []);

  const handleInstall = useCallback(async (): Promise<void> => {
    if (!pendingSelection) {
      return;
    }
    setIsLoading(true);
    const modulesToInstall = manifestModules.filter((m) => selectedEntries.has(m.entry));
    await installSelectedModules(pendingSelection.id, modulesToInstall);
    setIsLoading(false);
    closeModal();
  }, [closeModal, installSelectedModules, manifestModules, pendingSelection, selectedEntries]);

  const handleClose = useCallback((): void => {
    cancelPendingInstall();
    closeModal();
  }, [cancelPendingInstall, closeModal]);

  const resetState = useCallback((): void => {
    setQuery('');
    setIsLoading(false);
  }, []);

  const renderItemPrefix = useCallback(
    (item: GroupListItem): JSX.Element => (
      <BooleanInput
        id={`module-select-${item.id}`}
        checked={selectedEntries.has(item.id)}
        disabled={isLoading}
        onChange={() => {
          handleToggleModule(item.id);
        }}
      />
    ),
    [selectedEntries, handleToggleModule, isLoading],
  );

  const renderHeader = useCallback(
    (category: string, items: ReadonlyArray<GroupListItem>): JSX.Element => {
      const categoryId = `install-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
      const areAllSelected = items.length > 0 && items.every((item) => selectedEntries.has(item.id));

      return (
        <div className="flex min-w-0 items-center gap-2">
          <BooleanInput id={`${categoryId}-toggle`} checked={areAllSelected} disabled={isLoading} onChange={() => handleToggleCategory(items)} />
          <span className="cursor-pointer truncate font-medium text-content-secondary list-item-interactive">{category}</span>
        </div>
      );
    },
    [selectedEntries, handleToggleCategory, isLoading],
  );

  if (!isModalOpen) {
    return null;
  }

  const headerActions = (
    <Button loading={isLoading} disabled={selectedEntries.size === 0 || isLoading} onClick={handleInstall}>
      Install ({selectedEntries.size})
    </Button>
  );

  const content = (
    <GroupListLayout
      itemsByCategory={filteredGroupedModules}
      query={deferredQuery}
      renderHeader={renderHeader}
      renderItemPrefix={renderItemPrefix}
      disabled={isLoading}
    />
  );

  return (
    <Modal
      isOpen={isModalOpen}
      size="xl"
      title={pendingSelection?.manifest.name || 'Install Extension'}
      headerActions={headerActions}
      onClose={handleClose}
      onExited={resetState}
    >
      <div className="flex h-full flex-col gap-2 min-h-0">
        <div>
          <StringInput
            id="module-install-search"
            type="search"
            inputRef={searchRef}
            value={query}
            placeholder="Search Modules..."
            showClearButton
            disabled={isLoading}
            onChange={handleQueryChange}
            onClear={handleClearQuery}
          />
        </div>
        <div id={listId} ref={scrollRef} className={clsx('grow overflow-y-auto', scrollClasses)}>
          {content}
        </div>
      </div>
    </Modal>
  );
});
