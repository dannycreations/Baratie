import { memo, useCallback, useDeferredValue, useEffect, useId, useMemo, useState } from 'react';

import { useExtensionStore } from '../../stores/useExtensionStore';
import { useModalStore } from '../../stores/useModalStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { IngredientList } from '../ingredient/IngredientList';
import { Button } from '../shared/Button';
import { BooleanInput } from '../shared/input/BooleanInput';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { Modal } from '../shared/Modal';

import type { JSX } from 'react';
import type { ExtensionManifest, ManifestModule } from '../../helpers/extensionHelper';
import type { BaseListItem } from '../ingredient/IngredientList';

type ModuleIngredient = ManifestModule & { id: string };

export interface ExtensionModalProps {
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

export const ExtensionModal = memo((): JSX.Element | null => {
  const activeModal = useModalStore((state) => state.activeModal);
  const modalProps = useModalStore((state) => state.modalProps as ExtensionModalProps | null);

  const isModalOpen = activeModal === 'extensionInstall';
  const pendingSelection = isModalOpen ? modalProps : null;

  const installSelectedModules = useExtensionStore((state) => state.installSelectedModules);
  const cancelPendingInstall = useExtensionStore((state) => state.cancelPendingInstall);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState('');
  const [selectedEntries, setSelectedEntries] = useState(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);
  const listId = useId();
  const deferredQuery = useDeferredValue(query);

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

  const handleToggleModule = useCallback((entry: string) => {
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

  const handleToggleCategory = useCallback((modules: ReadonlyArray<BaseListItem>) => {
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

  const handleInstall = useCallback(async () => {
    if (!pendingSelection) {
      return;
    }
    setIsLoading(true);
    const modulesToInstall = manifestModules.filter((m) => selectedEntries.has(m.entry));
    await installSelectedModules(pendingSelection.id, modulesToInstall);
    setIsLoading(false);
  }, [pendingSelection, selectedEntries, manifestModules, installSelectedModules]);

  const handleClose = useCallback(() => {
    cancelPendingInstall();
  }, [cancelPendingInstall]);

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
      const categoryId = `install-module-category-${category.replace(/\s+/g, '-').toLowerCase()}`;
      const areAllSelected = items.length > 0 && items.every((item) => selectedEntries.has(item.id));

      return (
        <div className="flex items-center gap-3">
          <BooleanInput id={`${categoryId}-toggle`} checked={areAllSelected} onChange={() => handleToggleCategory(items)} />
          <label className={`cursor-pointer font-medium text-${theme.contentSecondary}`}>{category}</label>
        </div>
      );
    },
    [selectedEntries, handleToggleCategory, theme],
  );

  const headerActions = (
    <Button loading={isLoading} disabled={selectedEntries.size === 0 || isLoading} onClick={handleInstall}>
      Install ({selectedEntries.size})
    </Button>
  );

  if (!isModalOpen) {
    return null;
  }

  const content = (
    <IngredientList itemsByCategory={filteredGroupedModules} query={deferredQuery} renderHeader={renderHeader} renderItemPrefix={renderItemPrefix} />
  );

  return (
    <Modal
      contentClasses="flex max-h-[80vh] flex-col"
      headerActions={headerActions}
      isOpen={isModalOpen}
      size="xl"
      title={pendingSelection?.manifest.name || 'Install Extension'}
      onClose={handleClose}
    >
      <SearchListLayout
        containerClasses="flex h-full flex-col"
        listContent={content}
        listId={listId}
        listWrapperClasses="grow mt-2 overflow-y-auto"
        search={{
          query,
          onQueryChange: setQuery,
          ariaLabel: 'Search modules to install',
          id: 'module-install-search',
          placeholder: 'Search Modules...',
        }}
      />
    </Modal>
  );
});
