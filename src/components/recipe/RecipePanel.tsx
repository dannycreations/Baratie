import { memo, useCallback, useEffect, useId, useMemo, useRef } from 'react';

import { ingredientRegistry, kitchen } from '../../app/container';
import { useDragMove } from '../../hooks/useDragMove';
import { useDropZone } from '../../hooks/useDropZone';
import { useOverflow } from '../../hooks/useOverflow';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { FolderOpenIcon, PauseIcon, PlayIcon, SaveIcon } from '../shared/Icon';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { SearchListLayout } from '../shared/layout/ListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { EmptyView } from '../shared/View';
import { RecipeItem } from './RecipeItem';

import type { DragEvent, JSX } from 'react';
import type { IngredientItem, SpiceValue } from '../../core/IngredientRegistry';
import type { CookbookModalProps } from '../../stores/useCookbookStore';
import type { RecipeItemHandlers } from './RecipeItem';

export const RecipePanel = memo((): JSX.Element => {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const editingId = useRecipeStore((state) => state.editingId);
  const setEditingId = useRecipeStore((state) => state.setEditingId);
  const openModal = useModalStore((state) => state.openModal);
  const isCookbookOpen = useModalStore((state) => state.activeModal === 'cookbook');
  const isAutoCookEnabled = useKitchenStore((state) => state.isAutoCookEnabled);
  const ingredientStatuses = useKitchenStore((state) => state.ingredientStatuses);
  const inputPanelId = useKitchenStore((state) => state.inputPanelId);
  const startUpdateBatch = useKitchenStore((state) => state.startUpdateBatch);
  const endUpdateBatch = useKitchenStore((state) => state.endUpdateBatch);
  const theme = useThemeStore((state) => state.theme);
  const prepareCookbook = useCookbookStore((state) => state.prepareToOpen);
  const dragId = useDragMoveStore((state) => state.draggedItemId);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);

  const prevIngredientsCount = useRef(ingredients.length);
  const { ref: listScrollRef, hasOverflowY } = useOverflow<HTMLDivElement>();
  const listId = useId();

  const handleDropIngredient = useCallback((typeString: string): void => {
    if (typeString && ingredientRegistry.getIngredient(typeString)) {
      useRecipeStore.getState().addIngredient(typeString);
    }
  }, []);

  const { isDragOver: isDraggingIngredient, dropZoneProps } = useDropZone<string, HTMLDivElement>({
    onValidate: (dt) => dt.types.includes('application/x-baratie-ingredient-type'),
    onExtract: (dt) => dt.getData('application/x-baratie-ingredient-type'),
    onDrop: handleDropIngredient,
  });

  useEffect(() => {
    if (ingredients.length > prevIngredientsCount.current) {
      const listElement = document.getElementById(listId);
      listElement?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevIngredientsCount.current = ingredients.length;
  }, [ingredients, listId]);

  const handleReorder = useCallback((draggedId: string, targetId: string): void => {
    useRecipeStore.getState().reorderIngredients(draggedId, targetId);
  }, []);

  const {
    onDragStart: onMoveStart,
    onDragEnter: onMoveEnter,
    onDragOver: onMoveOver,
    onDragEnd: onMoveEnd,
  } = useDragMove({
    dragId,
    setDragId: setDraggedItemId,
    onDragMove: handleReorder,
  });

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, ingredient: IngredientItem): void => {
      onMoveStart(event, ingredient.id);
      event.dataTransfer.setData('application/x-baratie-recipe-item-id', ingredient.id);
    },
    [onMoveStart],
  );

  const openCookbook = useCallback(
    (args: { readonly mode: 'save' | 'load' }): void => {
      const { ingredients, activeRecipeId } = useRecipeStore.getState();
      const props: CookbookModalProps = args.mode === 'save' ? { mode: 'save', ingredients, activeRecipeId } : { mode: 'load' };

      prepareCookbook(props);
      openModal('cookbook', props);
    },
    [openModal, prepareCookbook],
  );

  const handleClearRecipe = useCallback((): void => useRecipeStore.getState().clearRecipe(), []);

  const headerActions = useMemo((): JSX.Element => {
    const autoCookTooltip = isAutoCookEnabled ? 'Pause Auto-Cooking' : 'Resume Auto-Cooking';
    const autoCookLabel = isAutoCookEnabled ? 'Pause Automatic Cooking' : 'Resume Automatic Cooking and Run';
    const autoCookClass = isAutoCookEnabled
      ? `text-${theme.warningFg} hover:!bg-${theme.warningBg}`
      : `text-${theme.successFg} hover:!bg-${theme.successBg}`;

    return (
      <>
        <TooltipButton
          icon={<SaveIcon size={18} />}
          size="sm"
          variant="stealth"
          disabled={ingredients.length === 0}
          aria-label="Save current recipe to cookbook"
          tooltipContent="Save to Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          onClick={() => openCookbook({ mode: 'save' })}
        />
        <TooltipButton
          icon={<FolderOpenIcon size={18} />}
          size="sm"
          variant="stealth"
          aria-label="Load a saved recipe from the cookbook"
          tooltipContent="Open Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          onClick={() => openCookbook({ mode: 'load' })}
        />
        <TooltipButton
          icon={isAutoCookEnabled ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          size="sm"
          variant="stealth"
          className={autoCookClass}
          aria-label={autoCookLabel}
          tooltipContent={autoCookTooltip}
          tooltipPosition="bottom"
          onClick={() => kitchen.toggleAutoCook()}
        />
        <ConfirmButton
          actionName="Clear"
          itemName="the current recipe"
          itemType="Recipe"
          disabled={ingredients.length === 0}
          tooltipPosition="bottom"
          onConfirm={handleClearRecipe}
        />
      </>
    );
  }, [ingredients.length, isCookbookOpen, isAutoCookEnabled, theme, openCookbook, handleClearRecipe]);

  const handleRemove = useCallback((id: string): void => {
    useRecipeStore.getState().removeIngredient(id);
  }, []);

  const handleSpiceChange = useCallback((id: string, spiceId: string, rawValue: SpiceValue): void => {
    useRecipeStore.getState().updateSpice(id, spiceId, rawValue);
  }, []);

  const handleEditToggle = useCallback(
    (id: string): void => {
      const isSpiceInInput = useKitchenStore.getState().inputPanelId === id;
      if (isSpiceInInput) {
        setEditingId(null);
        return;
      }
      setEditingId(editingId === id ? null : id);
    },
    [editingId, setEditingId],
  );

  const recipeItemHandlers: RecipeItemHandlers = useMemo(
    () => ({
      onRemove: handleRemove,
      onSpiceChange: handleSpiceChange,
      onDragStart: handleDragStart,
      onDragEnter: onMoveEnter,
      onDragEnd: onMoveEnd,
      onDragOver: onMoveOver,
      onEditToggle: handleEditToggle,
      onLongPressStart: startUpdateBatch,
      onLongPressEnd: endUpdateBatch,
    }),
    [handleRemove, handleSpiceChange, handleDragStart, onMoveEnter, onMoveEnd, onMoveOver, handleEditToggle, startUpdateBatch, endUpdateBatch],
  );

  let content: JSX.Element;
  if (ingredients.length === 0) {
    if (isDraggingIngredient) {
      content = <DropZoneLayout mode="overlay" text="Drop to add ingredient" variant="add" />;
    } else {
      content = (
        <EmptyView className="flex h-full flex-col items-center justify-center p-3">
          No ingredients have been added.
          <br />
          Select from the Ingredients panel or drag them here.
        </EmptyView>
      );
    }
  } else {
    content = (
      <div role="list" aria-label="Current recipe steps" className="space-y-2 pb-3">
        {ingredients.map((ingredient: IngredientItem) => {
          const isSpiceInInput = inputPanelId === ingredient.id;
          const isEditingItem = editingId === ingredient.id;
          const uiState = {
            isAutoCook: isAutoCookEnabled,
            isDragged: dragId === ingredient.id,
            isEditing: !isSpiceInInput && isEditingItem,
            isSpiceInInput: isSpiceInInput,
            status: ingredientStatuses[ingredient.id] || 'idle',
          };

          return <RecipeItem key={ingredient.id} ingredientItem={ingredient} uiState={uiState} handlers={recipeItemHandlers} />;
        })}
        {isDraggingIngredient && <DropZoneLayout mode="placeholder" text="Drop to add ingredient" variant="add" />}
      </div>
    );
  }

  const listClass = `grow transition-colors duration-200 ${isDraggingIngredient ? `bg-${theme.surfaceMuted}` : ''}`.trim();

  return (
    <SectionLayout
      headerLeft="Recipe"
      headerRight={headerActions}
      className="h-[50vh] min-h-0 md:h-auto md:flex-1"
      contentClasses={`${hasOverflowY ? 'pr-1' : ''} relative flex h-full flex-col text-${theme.contentTertiary}`.trim()}
      contentRef={listScrollRef}
    >
      <div className="flex h-full flex-col" {...dropZoneProps}>
        <SearchListLayout listId={listId} listContent={content} listWrapperClasses={listClass} />
      </div>
    </SectionLayout>
  );
});
