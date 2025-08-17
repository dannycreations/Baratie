import { memo, useCallback, useDeferredValue, useMemo, useRef } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { TooltipButton } from '../shared/Button';
import { DownloadCloudIcon, SaveIcon, UploadCloudIcon } from '../shared/Icon';
import { FilePicker } from '../shared/input/FilePicker';
import { Modal } from '../shared/Modal';
import { CookbookLoad } from './CookbookLoad';
import { CookbookSave } from './CookbookSave';

import type { JSX } from 'react';
import type { RecipebookItem } from '../../core/IngredientRegistry';

interface SaveHeaderActionsProps {
  readonly isSaveDisabled: boolean;
  readonly onExportCurrent: () => void;
  readonly onSave: () => void;
}

interface LoadHeaderActionsProps {
  readonly isExportDisabled: boolean;
  readonly onFileImport: (file: File) => void;
  readonly onExportAll: () => void;
}

const SEARCH_KEYS: ReadonlyArray<keyof RecipebookItem> = ['name'];

const SaveHeaderActions = memo<SaveHeaderActionsProps>(({ isSaveDisabled, onExportCurrent, onSave }) => (
  <>
    <TooltipButton
      icon={<DownloadCloudIcon size={ICON_SIZES.MD} />}
      variant="stealth"
      disabled={isSaveDisabled}
      tooltipContent="Export Recipe to JSON"
      onClick={onExportCurrent}
    />
    <TooltipButton
      icon={<SaveIcon size={ICON_SIZES.MD} />}
      variant="primary"
      disabled={isSaveDisabled}
      tooltipContent="Save to Browser Storage"
      onClick={onSave}
    >
      Save
    </TooltipButton>
  </>
));

const LoadHeaderActions = memo<LoadHeaderActionsProps>(({ isExportDisabled, onFileImport, onExportAll }) => (
  <>
    <FilePicker accept=".json" onFileSelect={onFileImport}>
      {({ trigger }) => (
        <TooltipButton icon={<UploadCloudIcon size={ICON_SIZES.MD} />} variant="stealth" tooltipContent="Import from JSON File" onClick={trigger} />
      )}
    </FilePicker>
    <TooltipButton
      icon={<DownloadCloudIcon size={ICON_SIZES.MD} />}
      variant="stealth"
      disabled={isExportDisabled}
      tooltipContent="Export All Saved Recipes"
      onClick={onExportAll}
    />
  </>
));

export const CookbookPanel = memo((): JSX.Element | null => {
  const currentModal = useModalStore((state) => state.currentModal);
  const closeModal = useModalStore((state) => state.closeModal);
  const nameInput = useCookbookStore((state) => state.nameInput);
  const query = useCookbookStore((state) => state.query);
  const recipes = useCookbookStore((state) => state.recipes);
  const resetModal = useCookbookStore((state) => state.resetModal);
  const setName = useCookbookStore((state) => state.setName);
  const setQuery = useCookbookStore((state) => state.setQuery);
  const upsert = useCookbookStore((state) => state.upsert);
  const deleteRecipe = useCookbookStore((state) => state.delete);
  const load = useCookbookStore((state) => state.load);
  const exportAll = useCookbookStore((state) => state.exportAll);
  const exportCurrent = useCookbookStore((state) => state.exportCurrent);
  const importFromFile = useCookbookStore((state) => state.importFromFile);
  const ingredients = useRecipeStore((state) => state.ingredients);

  const nameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isModalOpen = currentModal?.type === 'cookbook';
  const modalMode = isModalOpen ? currentModal.props.mode : null;
  const isRecipeEmpty = ingredients.length === 0;
  const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;

  const persistedModalModeRef = useRef(modalMode);
  if (isModalOpen) {
    persistedModalModeRef.current = modalMode;
  }
  const persistedModalMode = persistedModalModeRef.current;

  const focusRef = persistedModalMode === 'save' ? nameRef : searchRef;
  useAutoFocus(focusRef, isModalOpen);

  const deferredQuery = useDeferredValue(query);

  const filteredRecipes = useMemo(() => {
    const lowerQuery = deferredQuery.toLowerCase().trim();
    if (!lowerQuery) {
      return recipes;
    }

    return recipes.filter((item) => {
      return SEARCH_KEYS.some((key) => {
        const value = item[key];
        return typeof value === 'string' && value.toLowerCase().includes(lowerQuery);
      });
    });
  }, [recipes, deferredQuery]);

  const handleSave = useCallback((): void => {
    upsert();
    closeModal();
  }, [upsert, closeModal]);

  const handleLoad = useCallback(
    (id: string): void => {
      load(id);
      closeModal();
    },
    [load, closeModal],
  );

  const handleFileImport = useCallback(
    async (file: File): Promise<void> => {
      await importFromFile(file);
    },
    [importFromFile],
  );

  const title = persistedModalMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions = useMemo(
    () =>
      persistedModalMode === 'save' ? (
        <SaveHeaderActions isSaveDisabled={isSaveDisabled} onExportCurrent={exportCurrent} onSave={handleSave} />
      ) : (
        <LoadHeaderActions isExportDisabled={recipes.length === 0} onExportAll={exportAll} onFileImport={handleFileImport} />
      ),
    [persistedModalMode, isSaveDisabled, exportCurrent, handleSave, recipes.length, exportAll, handleFileImport],
  );

  const bodyContent = useMemo(
    () =>
      persistedModalMode === 'save' ? (
        <CookbookSave isRecipeEmpty={isRecipeEmpty} nameRef={nameRef} nameInput={nameInput} onNameChange={setName} onSave={handleSave} />
      ) : (
        <CookbookLoad
          query={query}
          recipes={filteredRecipes}
          searchRef={searchRef}
          totalRecipes={recipes.length}
          onDelete={deleteRecipe}
          onLoad={handleLoad}
          onQueryChange={setQuery}
        />
      ),
    [
      persistedModalMode,
      isRecipeEmpty,
      nameRef,
      nameInput,
      setName,
      handleSave,
      query,
      filteredRecipes,
      searchRef,
      recipes.length,
      deleteRecipe,
      handleLoad,
      setQuery,
    ],
  );

  return (
    <Modal
      isOpen={isModalOpen}
      size="lg"
      title={title}
      contentClasses="max-h-[80vh]"
      headerActions={headerActions}
      onClose={closeModal}
      onExited={resetModal}
    >
      {bodyContent}
    </Modal>
  );
});
