import { memo, useCallback, useDeferredValue, useMemo, useRef } from 'react';

import { useCookbookStore } from '../../stores/useCookbookStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { TooltipButton } from '../shared/Button';
import { DownloadCloudIcon, SaveIcon, UploadCloudIcon } from '../shared/Icon';
import { Modal } from '../shared/Modal';
import { CookbookLoad } from './CookbookLoad';
import { CookbookSave } from './CookbookSave';

import type { ChangeEvent, JSX } from 'react';
import type { RecipeBookItem } from '../../core/IngredientRegistry';

const SaveHeaderActions = memo<{
  readonly isSaveDisabled: boolean;
  readonly onExportCurrent: () => void;
  readonly onSave: () => void;
}>(({ isSaveDisabled, onExportCurrent, onSave }) => (
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

const LoadHeaderActions = memo<{
  readonly isExportDisabled: boolean;
  readonly onTriggerImport: () => void;
  readonly onExportAll: () => void;
}>(({ isExportDisabled, onTriggerImport, onExportAll }) => (
  <>
    <TooltipButton
      aria-label="Import recipes from a JSON file"
      icon={<UploadCloudIcon size={20} />}
      tooltipContent="Import from JSON File"
      variant="stealth"
      onClick={onTriggerImport}
    />
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
  const isModalOpen = useCookbookStore((state) => state.isModalOpen);
  const modalMode = useCookbookStore((state) => state.modalMode);
  const nameInput = useCookbookStore((state) => state.nameInput);
  const query = useCookbookStore((state) => state.query);
  const recipes = useCookbookStore((state) => state.recipes);
  const closeModal = useCookbookStore((state) => state.closeModal);
  const resetModal = useCookbookStore((state) => state.resetModal);
  const setName = useCookbookStore((state) => state.setName);
  const setQuery = useCookbookStore((state) => state.setQuery);
  const { upsert, delete: deleteRecipe, load, exportAll, exportCurrent, importFromFile } = useCookbookStore.getState();

  const ingredients = useRecipeStore((state) => state.ingredients);

  const nameRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const isRecipeEmpty = ingredients.length === 0;
  const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;

  const deferredQuery = useDeferredValue(query);

  const handleSave = useCallback(() => {
    upsert();
    closeModal();
  }, [upsert, closeModal]);

  const handleLoad = useCallback(
    (id: string) => {
      load(id);
    },
    [load],
  );

  const handleTriggerImport = useCallback(() => {
    importRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      await importFromFile(file);
    },
    [importFromFile],
  );

  const filtered = useMemo<readonly RecipeBookItem[]>(() => {
    const lowerQuery = deferredQuery.toLowerCase().trim();
    if (!lowerQuery) {
      return recipes;
    }
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(lowerQuery));
  }, [recipes, deferredQuery]);

  const title = modalMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions =
    modalMode === 'save' ? (
      <SaveHeaderActions isSaveDisabled={isSaveDisabled} onExportCurrent={exportCurrent} onSave={handleSave} />
    ) : (
      <LoadHeaderActions isExportDisabled={recipes.length === 0} onExportAll={exportAll} onTriggerImport={handleTriggerImport} />
    );

  const bodyContent =
    modalMode === 'save' ? (
      <CookbookSave isRecipeEmpty={isRecipeEmpty} nameRef={nameRef} nameInput={nameInput} onNameChange={setName} onSave={handleSave} />
    ) : (
      <CookbookLoad
        importRef={importRef}
        query={query}
        recipes={filtered}
        totalRecipes={recipes.length}
        onDelete={deleteRecipe}
        onImport={handleFileImport}
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
