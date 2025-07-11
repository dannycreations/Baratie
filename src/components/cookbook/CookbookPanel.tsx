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

  const onSave = useCallback(() => {
    upsertRecipe(nameInput, ingredients, activeRecipeId);
    closeModal();
  }, [upsertRecipe, closeModal, nameInput, ingredients, activeRecipeId]);

  const onLoad = useCallback(
    (id: string) => {
      const loaded = load(id);
      if (loaded) {
        closeModal();
      }
    },
    [load, closeModal],
  );

  const onExportCurrent = useCallback(() => {
    exportSingle(nameInput, ingredients);
  }, [nameInput, ingredients]);

  const onExportAll = useCallback(() => exportAll(recipes), [recipes]);
  const onTriggerImport = useCallback(() => importRef.current?.click(), []);

  const onFileImport = useCallback(
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

  const filtered = useMemo(() => recipes.filter((recipe) => recipe.name.toLowerCase().includes(query.toLowerCase())), [recipes, query]);

  const title = modalMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions = useMemo(() => {
    const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;
    return modalMode === 'save' ? (
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
    ) : (
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
          disabled={recipes.length === 0}
          icon={<DownloadCloudIcon size={20} />}
          onClick={onExportAll}
          tooltipContent="Export All Saved Recipes"
          variant="stealth"
        />
      </>
    );
  }, [modalMode, nameInput, isRecipeEmpty, recipes.length, onExportCurrent, onSave, onTriggerImport, onExportAll]);

  const bodyContent = useMemo(
    () =>
      modalMode === 'save' ? (
        <CookbookSave isRecipeEmpty={isRecipeEmpty} nameRef={nameRef} onNameChange={setName} onSave={onSave} nameInput={nameInput} />
      ) : (
        <CookbookLoad
          importRef={importRef}
          recipes={filtered}
          onDelete={deleteRecipe}
          onImport={onFileImport}
          onLoad={onLoad}
          onQueryChange={setQuery}
          totalRecipes={recipes.length}
          query={query}
        />
      ),
    [modalMode, nameInput, isRecipeEmpty, onSave, setName, query, filtered, recipes.length, onFileImport, deleteRecipe, onLoad, setQuery],
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
