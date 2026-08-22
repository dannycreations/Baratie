import { DownloadCloud, Save, UploadCloud } from 'lucide-react';
import { memo, useCallback, useMemo, useRef } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useAutoFocus } from '../../hooks/useAutoFocus';
import { useSearch } from '../../hooks/useSearch';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { TooltipButton } from '../shared/Button';
import { FilePicker } from '../shared/input/FilePicker';
import { Modal } from '../shared/Modal';
import { CookbookLoad } from './CookbookLoad';
import { CookbookSave } from './CookbookSave';

import type { JSX } from 'react';

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
      icon={<DownloadCloud size={ICON_SIZES.SM} />}
      variant="stealth"
      disabled={isSaveDisabled}
      tooltipContent="Export Recipe to JSON"
      onClick={onExportCurrent}
    />
    <TooltipButton
      icon={<Save size={ICON_SIZES.SM} />}
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
        <TooltipButton icon={<UploadCloud size={ICON_SIZES.SM} />} variant="stealth" tooltipContent="Import from JSON File" onClick={trigger} />
      )}
    </FilePicker>
    <TooltipButton
      icon={<DownloadCloud size={ICON_SIZES.SM} />}
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
  const recipes = useCookbookStore((state) => state.recipes);
  const setName = useCookbookStore((state) => state.setName);
  const upsert = useCookbookStore((state) => state.upsert);
  const deleteRecipe = useCookbookStore((state) => state.delete);
  const load = useCookbookStore((state) => state.load);
  const exportAll = useCookbookStore((state) => state.exportAll);
  const exportCurrent = useCookbookStore((state) => state.exportCurrent);
  const importFromFile = useCookbookStore((state) => state.importFromFile);
  const ingredients = useRecipeStore((state) => state.ingredients);

  const nameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeModeRef = useRef<'save' | 'load'>('load');

  const isModalOpen = currentModal?.type === 'cookbook';
  if (isModalOpen) {
    activeModeRef.current = currentModal.props.mode;
  }
  const activeMode = activeModeRef.current;

  const isRecipeEmpty = ingredients.length === 0;
  const isSaveDisabled = !nameInput.trim() || isRecipeEmpty;

  const focusRef = activeMode === 'save' ? nameRef : searchRef;
  useAutoFocus(focusRef, isModalOpen);

  const { query, deferredQuery, onQueryChange, onClear } = useSearch();

  const filteredRecipes = useMemo(() => {
    const lowerQuery = deferredQuery.toLowerCase().trim();
    if (!lowerQuery) {
      return recipes;
    }

    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(lowerQuery));
  }, [recipes, deferredQuery]);

  const handleSave = useCallback((): void => {
    upsert();
    closeModal();
  }, [closeModal, upsert]);

  const handleLoad = useCallback(
    (id: string): void => {
      load(id);
      closeModal();
    },
    [closeModal, load],
  );

  const title = activeMode === 'save' ? 'Add to Cookbook' : 'Open from Cookbook';

  const headerActions = useMemo(() => {
    if (activeMode === 'save') {
      return <SaveHeaderActions isSaveDisabled={isSaveDisabled} onExportCurrent={exportCurrent} onSave={handleSave} />;
    }
    return <LoadHeaderActions isExportDisabled={recipes.length === 0} onExportAll={exportAll} onFileImport={importFromFile} />;
  }, [activeMode, isSaveDisabled, exportCurrent, handleSave, recipes.length, exportAll, importFromFile]);

  const bodyContent = useMemo(() => {
    if (activeMode === 'save') {
      return (
        <CookbookSave
          isRecipeEmpty={isRecipeEmpty}
          nameRef={nameRef}
          nameInput={nameInput}
          onNameChange={setName}
          onClear={() => setName('')}
          onSave={handleSave}
        />
      );
    }
    return (
      <CookbookLoad
        query={query}
        recipes={filteredRecipes}
        searchRef={searchRef}
        totalRecipes={recipes.length}
        onDelete={deleteRecipe}
        onLoad={handleLoad}
        onQueryChange={onQueryChange}
        onClear={onClear}
      />
    );
  }, [
    activeMode,
    isRecipeEmpty,
    nameInput,
    setName,
    handleSave,
    query,
    onQueryChange,
    onClear,
    filteredRecipes,
    recipes.length,
    deleteRecipe,
    handleLoad,
  ]);

  return (
    <Modal
      isOpen={isModalOpen}
      size="lg"
      title={title}
      headerActions={headerActions}
      onClose={closeModal}
      onExited={() => {
        setName('');
        onClear();
      }}
    >
      {bodyContent}
    </Modal>
  );
});
