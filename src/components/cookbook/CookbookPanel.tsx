import { memo, useCallback, useMemo, useRef } from 'react';

import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useSearchItems } from '../../hooks/useSearch';
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
import type { CookbookModalProps } from '../../stores/useCookbookStore';

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

const SaveHeaderActions = memo<SaveHeaderActionsProps>(({ isSaveDisabled, onExportCurrent, onSave }) => (
  <>
    <TooltipButton
      aria-label="Export the current recipe to a file"
      disabled={isSaveDisabled}
      icon={<DownloadCloudIcon size={20} />}
      tooltipContent="Export Recipe to JSON"
      variant="stealth"
      onClick={onExportCurrent}
    />
    <TooltipButton
      aria-label="Save the current recipe to the cookbook"
      disabled={isSaveDisabled}
      icon={<SaveIcon size={20} />}
      tooltipContent="Save to Browser Storage"
      variant="primary"
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
        <TooltipButton
          aria-label="Import recipes from a JSON file"
          icon={<UploadCloudIcon size={20} />}
          tooltipContent="Import from JSON File"
          variant="stealth"
          onClick={trigger}
        />
      )}
    </FilePicker>
    <TooltipButton
      aria-label="Export all saved recipes to a file"
      disabled={isExportDisabled}
      icon={<DownloadCloudIcon size={20} />}
      tooltipContent="Export All Saved Recipes"
      variant="stealth"
      onClick={onExportAll}
    />
  </>
));

export const CookbookPanel = memo((): JSX.Element | null => {
  const activeModal = useModalStore((state) => state.activeModal);
  const modalProps = useModalStore((state) => state.modalProps as CookbookModalProps | null);
  const closeModal = useModalStore((state) => state.closeModal);

  const isModalOpen = activeModal === 'cookbook';
  const modalMode = isModalOpen ? modalProps?.mode : null;

  const persistedModalModeRef = useRef(modalMode);
  if (isModalOpen) {
    persistedModalModeRef.current = modalMode;
  }
  const persistedModalMode = persistedModalModeRef.current;

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

  const focusRef = persistedModalMode === 'save' ? nameRef : searchRef;
  useAutoFocus(focusRef, isModalOpen);

  const isRecipeEmpty = ingredients.length === 0;
  const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;

  const searchKeys = useMemo<Array<keyof RecipebookItem>>(() => ['name'], []);
  const filteredRecipes = useSearchItems<RecipebookItem>(recipes, query, searchKeys);

  const handleSave = useCallback(() => {
    upsert();
    closeModal();
  }, [upsert, closeModal]);

  const handleLoad = useCallback(
    (id: string) => {
      load(id);
      closeModal();
    },
    [load, closeModal],
  );

  const handleFileImport = useCallback(
    async (file: File) => {
      await importFromFile(file);
    },
    [importFromFile],
  );

  const title = persistedModalMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions =
    persistedModalMode === 'save' ? (
      <SaveHeaderActions isSaveDisabled={isSaveDisabled} onExportCurrent={exportCurrent} onSave={handleSave} />
    ) : (
      <LoadHeaderActions isExportDisabled={recipes.length === 0} onExportAll={exportAll} onFileImport={handleFileImport} />
    );

  const bodyContent =
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
    );

  return (
    <Modal
      contentClasses="max-h-[80vh]"
      headerActions={headerActions}
      isOpen={isModalOpen}
      size="lg"
      title={title}
      titleId="cookbook-modal-title"
      onClose={closeModal}
      onExited={resetModal}
    >
      {bodyContent}
    </Modal>
  );
});
