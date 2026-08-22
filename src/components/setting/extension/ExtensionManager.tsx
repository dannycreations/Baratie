import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { filterGroupedList, groupListByCategory } from '../../../helpers/listHelper';
import { useAutoFocus } from '../../../hooks/useAutoFocus';
import { useSearch } from '../../../hooks/useSearch';
import { useExtensionStore } from '../../../stores/useExtensionStore';
import { useModalStore } from '../../../stores/useModalStore';
import { Button } from '../../shared/Button';
import { BooleanInput } from '../../shared/input/BooleanInput';
import { SearchInput } from '../../shared/input/SearchInput';
import { GroupListLayout } from '../../shared/layout/ListLayout';
import { Modal } from '../../shared/Modal';
import { ScrollArea } from '../../shared/ScrollArea';

import type { JSX } from 'react';
import type { ManifestModule } from '../../../helpers/extensionHelper';
import type { GroupListItem } from '../../shared/layout/ListLayout';

type ModuleIngredient = ManifestModule & { id: string };

export const ExtensionManager = memo((): JSX.Element | null => {
  const currentModal = useModalStore((state) => state.currentModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const installSelectedModules = useExtensionStore((state) => state.installSelectedModules);
  const cancelPendingInstall = useExtensionStore((state) => state.cancelPendingInstall);

  const [selectedEntries, setSelectedEntries] = useState(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);

  const { query, deferredQuery, onQueryChange, onClear } = useSearch();

  const searchRef = useRef<HTMLInputElement>(null);

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
    const modulesWithIds: Array<ModuleIngredient> = manifestModules.map((module) => ({ ...module, id: module.entry }));
    return groupListByCategory(modulesWithIds, (module) => module.category);
  }, [manifestModules]);

  const filteredGroupedModules = useMemo(() => {
    const query = deferredQuery.toLowerCase().trim();

    return filterGroupedList(
      groupedModules,
      query,
      (module) => module.name.toLowerCase().includes(query) || module.description.toLowerCase().includes(query),
    );
  }, [groupedModules, deferredQuery]);

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
    onClear();
    setIsLoading(false);
    setSelectedEntries(new Set());
  }, [onClear]);

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
        <div className="flex-y-center min-w-0 gap-2">
          <BooleanInput id={`${categoryId}-toggle`} checked={areAllSelected} disabled={isLoading} onChange={() => handleToggleCategory(items)} />
          <span className="cursor-pointer truncate font-medium text-content-secondary list-item-interactive">{category}</span>
        </div>
      );
    },
    [selectedEntries, handleToggleCategory, isLoading],
  );

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
      <div className="flex-col-gap-2 h-full">
        <SearchInput
          id="module-install-search"
          inputRef={searchRef}
          value={query}
          placeholder="Search Modules..."
          disabled={isLoading}
          onChange={onQueryChange}
          onClear={onClear}
        />
        <ScrollArea className="flex-1-overflow-auto">{content}</ScrollArea>
      </div>
    </Modal>
  );
});
