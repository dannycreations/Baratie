import { memo, useCallback, useMemo, useRef } from 'react';

import { exportAll, exportSingle, importFromFile } from '../../helpers/cookbookHelper';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { TooltipButton } from '../shared/Button';
import { DownloadCloudIcon, SaveIcon, UploadCloudIcon } from '../shared/Icon';
import { Modal } from '../shared/Modal';
import { CookbookLoad } from './CookbookLoad';
import { CookbookSave } from './CookbookSave';

import type { ChangeEvent, JSX } from 'react';
import type { RecipeBookItem } from '../../core/IngredientRegistry';

export const CookbookPanel = memo(function CookbookPanel(): JSX.Element | null {
  const isModalOpen = useCookbookStore((state) => state.isModalOpen);
  const modalMode = useCookbookStore((state) => state.modalMode);
  const nameInput = useCookbookStore((state) => state.nameInput);
  const query = useCookbookStore((state) => state.query);
  const recipes = useCookbookStore((state) => state.recipes);
  const closeModal = useCookbookStore((state) => state.closeModal);
  const resetModal = useCookbookStore((state) => state.resetModal);
  const setName = useCookbookStore((state) => state.setName);
  const setQuery = useCookbookStore((state) => state.setQuery);
  const upsertRecipe = useCookbookStore((state) => state.upsertRecipe);
  const deleteRecipe = useCookbookStore((state) => state.deleteRecipe);
  const load = useCookbookStore((state) => state.load);
  const onMerge = useCookbookStore((state) => state.merge);
  const ingredients = useRecipeStore((state) => state.ingredients);
  const activeRecipeId = useRecipeStore((state) => state.activeRecipeId);

  const nameRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const importOperationRef = useRef(0);

  const isRecipeEmpty = ingredients.length === 0;

  const handleSave = useCallback(() => {
    upsertRecipe(nameInput, ingredients, activeRecipeId);
    closeModal();
  }, [upsertRecipe, closeModal, nameInput, ingredients, activeRecipeId]);

  const handleLoad = useCallback(
    (id: string) => {
      const loadedRecipe = load(id);
      if (loadedRecipe) {
        closeModal();
      }
    },
    [load, closeModal],
  );

  const handleExportCurrent = useCallback(() => {
    exportSingle(nameInput, ingredients);
  }, [nameInput, ingredients]);

  const handleExportAll = useCallback(() => exportAll(recipes), [recipes]);
  const handleTriggerImport = useCallback(() => importRef.current?.click(), []);

  const handleFileImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const operationId = ++importOperationRef.current;
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      const newRecipes = await importFromFile(file);
      if (operationId === importOperationRef.current && newRecipes) {
        onMerge(newRecipes);
      }
    },
    [onMerge],
  );

  const filtered = useMemo<readonly RecipeBookItem[]>(
    () => recipes.filter((recipe) => recipe.name.toLowerCase().includes(query.toLowerCase())),
    [recipes, query],
  );

  const title = modalMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions = useMemo(() => {
    const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;
    return modalMode === 'save' ? (
      <>
        <TooltipButton
          aria-label="Export the current recipe to a file"
          disabled={isSaveDisabled}
          icon={<DownloadCloudIcon size={20} />}
          onClick={handleExportCurrent}
          tooltipContent="Export Recipe to JSON"
          variant="stealth"
        />
        <TooltipButton
          aria-label="Save the current recipe to the cookbook"
          disabled={isSaveDisabled}
          icon={<SaveIcon size={20} />}
          onClick={handleSave}
          tooltipContent="Save to Browser Storage"
          variant="primary"
        >
          Save
        </TooltipButton>
      </>
    ) : (
      <>
        <TooltipButton
          aria-label="Import recipes from a JSON file"
          icon={<UploadCloudIcon size={20} />}
          onClick={handleTriggerImport}
          tooltipContent="Import from JSON File"
          variant="stealth"
        />
        <TooltipButton
          aria-label="Export all saved recipes to a file"
          disabled={recipes.length === 0}
          icon={<DownloadCloudIcon size={20} />}
          onClick={handleExportAll}
          tooltipContent="Export All Saved Recipes"
          variant="stealth"
        />
      </>
    );
  }, [modalMode, nameInput, isRecipeEmpty, recipes.length, handleExportCurrent, handleSave, handleTriggerImport, handleExportAll]);

  const bodyContent = useMemo(
    () =>
      modalMode === 'save' ? (
        <CookbookSave isRecipeEmpty={isRecipeEmpty} nameRef={nameRef} onNameChange={setName} onSave={handleSave} nameInput={nameInput} />
      ) : (
        <CookbookLoad
          importRef={importRef}
          recipes={filtered}
          onDelete={deleteRecipe}
          onImport={handleFileImport}
          onLoad={handleLoad}
          onQueryChange={setQuery}
          totalRecipes={recipes.length}
          query={query}
        />
      ),
    [modalMode, nameInput, isRecipeEmpty, handleSave, setName, query, filtered, recipes.length, handleFileImport, deleteRecipe, handleLoad, setQuery],
  );

  return (
    <Modal
      contentClassName="max-h-[80vh]"
      headerActions={headerActions}
      isOpen={isModalOpen}
      onClose={closeModal}
      onExited={resetModal}
      size="lg"
      title={title}
      titleId="cookbook-modal-title"
    >
      {bodyContent}
    </Modal>
  );
});
