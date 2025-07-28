import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useExtensionStore } from '../../stores/useExtensionStore';
import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { IngredientList } from '../ingredient/IngredientList';
import { Button } from '../shared/Button';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchListLayout } from '../shared/layout/ListLayout';
import { Modal } from '../shared/Modal';

import type { JSX } from 'react';
import type { ExtensionManifest, ManifestModule } from '../../helpers/extensionHelper';
import type { BaseListItem } from '../ingredient/IngredientList';

type ModuleIngredient = ManifestModule & { id: string };

export interface ExtensionListProps {
  id: string;
  manifest: ExtensionManifest;
}

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

export const ExtensionList = memo((): JSX.Element | null => {
  const activeModal = useModalStore((state) => state.activeModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const modalProps = useModalStore((state) => state.modalProps as ExtensionListProps | null);
  const installSelectedModules = useExtensionStore((state) => state.installSelectedModules);
  const cancelPendingInstall = useExtensionStore((state) => state.cancelPendingInstall);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState('');
  const [selectedEntries, setSelectedEntries] = useState(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);

  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);

  const isModalOpen = activeModal === 'extensionInstall';
  const pendingSelection = isModalOpen ? modalProps : null;

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

  const handleToggleCategory = useCallback((modules: ReadonlyArray<BaseListItem>): void => {
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
  }, [pendingSelection, selectedEntries, manifestModules, installSelectedModules, closeModal]);

  const handleClose = useCallback((): void => {
    cancelPendingInstall();
    closeModal();
  }, [cancelPendingInstall, closeModal]);

  const resetState = useCallback((): void => {
    setQuery('');
    setIsLoading(false);
  }, []);

  const renderItemPrefix = useCallback(
    (item: BaseListItem): JSX.Element => (
      <BooleanInput
        id={`module-select-${item.id}`}
        checked={selectedEntries.has(item.id)}
        onChange={() => {
          handleToggleModule(item.id);
        }}
      />
    ),
    [selectedEntries, handleToggleModule],
  );

  const renderHeader = useCallback(
    (category: string, items: ReadonlyArray<BaseListItem>): JSX.Element => {
      const categoryId = `install-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
      const areAllSelected = items.length > 0 && items.every((item) => selectedEntries.has(item.id));

      return (
        <div className="flex min-w-0 items-center gap-2">
          <BooleanInput id={`${categoryId}-toggle`} checked={areAllSelected} onChange={() => handleToggleCategory(items)} />
          <label className={`truncate cursor-pointer font-medium text-${theme.contentSecondary}`}>{category}</label>
        </div>
      );
    },
    [selectedEntries, handleToggleCategory, theme],
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
    <IngredientList itemsByCategory={filteredGroupedModules} query={deferredQuery} renderHeader={renderHeader} renderItemPrefix={renderItemPrefix} />
  );

  return (
    <Modal
      isOpen={isModalOpen}
      size="xl"
      title={pendingSelection?.manifest.name || 'Install Extension'}
      bodyClasses="p-3"
      contentClasses="flex max-h-[80vh] flex-col"
      headerActions={headerActions}
      onClose={handleClose}
      onExited={resetState}
    >
      <SearchListLayout
        listId={listId}
        listContent={content}
        search={{
          query,
          onQueryChange: setQuery,
          id: 'module-install-search',
          inputRef: searchRef,
          ariaLabel: 'Search modules to install',
          placeholder: 'Search Modules...',
        }}
      />
    </Modal>
  );
});
