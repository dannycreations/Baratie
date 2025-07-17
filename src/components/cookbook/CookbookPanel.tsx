import { memo, useCallback, useMemo, useRef } from 'react';

import { deleteRecipe, exportAll, exportSingle, importFromFile, loadRecipe, mergeRecipes, upsertRecipe } from '../../helpers/cookbookHelper';
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
      onClick={onExportCurrent}
      tooltipContent="Export Recipe to JSON"
      variant="stealth"
    />
    <TooltipButton
      aria-label="Save the current recipe to the cookbook"
      disabled={isSaveDisabled}
      icon={<SaveIcon size={20} />}
      onClick={onSave}
      tooltipContent="Save to Browser Storage"
      variant="primary"
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
      onClick={onTriggerImport}
      tooltipContent="Import from JSON File"
      variant="stealth"
    />
    <TooltipButton
      aria-label="Export all saved recipes to a file"
      disabled={isExportDisabled}
      icon={<DownloadCloudIcon size={20} />}
      onClick={onExportAll}
      tooltipContent="Export All Saved Recipes"
      variant="stealth"
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
  const ingredients = useRecipeStore((state) => state.ingredients);
  const activeRecipeId = useRecipeStore((state) => state.activeRecipeId);

  const nameRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const importOperationRef = useRef<number>(0);

  const isRecipeEmpty = ingredients.length === 0;
  const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;

  const handleSave = useCallback(() => {
    upsertRecipe(nameInput, ingredients, activeRecipeId);
    closeModal();
  }, [closeModal, nameInput, ingredients, activeRecipeId]);

  const handleLoad = useCallback(
    (id: string) => {
      const loadedRecipe = loadRecipe(id);
      if (loadedRecipe) {
        closeModal();
      }
    },
    [closeModal],
  );

  const handleExportCurrent = useCallback(() => {
    exportSingle(nameInput, ingredients);
  }, [nameInput, ingredients]);

  const handleExportAll = useCallback(() => exportAll(recipes), [recipes]);
  const handleTriggerImport = useCallback(() => importRef.current?.click(), []);

  const handleFileImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const operationId = ++importOperationRef.current;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const newRecipes = await importFromFile(file);
    if (operationId === importOperationRef.current && newRecipes) {
      mergeRecipes(newRecipes);
    }
  }, []);

  const filtered = useMemo<readonly RecipeBookItem[]>(
    () => recipes.filter((recipe) => recipe.name.toLowerCase().includes(query.toLowerCase())),
    [recipes, query],
  );

  const title = modalMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions =
    modalMode === 'save' ? (
      <SaveHeaderActions isSaveDisabled={isSaveDisabled} onExportCurrent={handleExportCurrent} onSave={handleSave} />
    ) : (
      <LoadHeaderActions isExportDisabled={recipes.length === 0} onExportAll={handleExportAll} onTriggerImport={handleTriggerImport} />
    );

  const bodyContent =
    modalMode === 'save' ? (
      <CookbookSave isRecipeEmpty={isRecipeEmpty} nameRef={nameRef} onNameChange={setName} onSave={handleSave} nameInput={nameInput} />
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
