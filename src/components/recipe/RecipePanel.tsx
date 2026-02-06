import { clsx } from 'clsx';
import { memo, useCallback, useEffect, useId, useMemo, useRef } from 'react';

import { DATA_TYPE_INGREDIENT, DATA_TYPE_RECIPE_ITEM, ICON_SIZES } from '../../app/constants';
import { kitchen } from '../../app/container';
import { useDragMove } from '../../hooks/useDragMove';
import { useDropZone } from '../../hooks/useDropZone';
import { useOverflow } from '../../hooks/useOverflow';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { FolderOpenIcon, PauseIcon, PlayIcon, SaveIcon } from '../shared/Icon';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { EmptyView } from '../shared/View';
import { RecipeItem } from './RecipeItem';

import type { DragEvent, JSX } from 'react';
import type { IngredientItem } from '../../core/IngredientRegistry';
import type { CookbookModalProps } from '../../stores/useCookbookStore';
import type { RecipeItemHandlers } from './RecipeItem';

export const RecipePanel = memo((): JSX.Element => {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const editingIds = useRecipeStore((state) => state.editingIds);
  const activeRecipeId = useRecipeStore((state) => state.activeRecipeId);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const clearRecipe = useRecipeStore((state) => state.clearRecipe);
  const reorderIngredients = useRecipeStore((state) => state.reorderIngredients);
  const clearEditingIds = useRecipeStore((state) => state.clearEditingIds);
  const openModal = useModalStore((state) => state.openModal);
  const isCookbookOpen = useModalStore((state) => state.currentModal?.type === 'cookbook');
  const isAutoCookEnabled = useKitchenStore((state) => state.isAutoCookEnabled);
  const prepareCookbook = useCookbookStore((state) => state.prepareToOpen);
  const dragId = useDragMoveStore((state) => state.draggedItemId);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);

  const prevIngredientsCount = useRef(ingredients.length);
  const { ref: scrollRef, className: scrollClasses } = useOverflow<HTMLDivElement>();
  const listId = useId();

  const handleDropIngredient = useCallback(
    (ingredientId: string): void => {
      if (ingredientId) {
        addIngredient(ingredientId);
      }
    },
    [addIngredient],
  );

  const { isDragOver: isDraggingIngredient, dropZoneProps } = useDropZone<string, HTMLDivElement>({
    onValidate: (dt) => dt.types.includes(DATA_TYPE_INGREDIENT),
    onExtract: (dt) => dt.getData(DATA_TYPE_INGREDIENT),
    onDrop: handleDropIngredient,
  });

  useEffect(() => {
    if (ingredients.length > prevIngredientsCount.current) {
      const listElement = document.getElementById(listId);
      listElement?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevIngredientsCount.current = ingredients.length;
  }, [ingredients.length, listId]);

  const handleReorder = useCallback(
    (draggedId: string, targetId: string): void => {
      reorderIngredients(draggedId, targetId);
    },
    [reorderIngredients],
  );

  const {
    onDragStart: onMoveStart,
    onDragOver: onMoveOver,
    onDragEnd,
  } = useDragMove({
    items: ingredients,
    dragId,
    setDragId: setDraggedItemId,
    onDragMove: handleReorder,
  });

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, ingredient: IngredientItem): void => {
      if (editingIds.size > 0) {
        clearEditingIds();
      }
      onMoveStart(event, ingredient.id);
      event.dataTransfer.setData(DATA_TYPE_RECIPE_ITEM, ingredient.id);
    },
    [clearEditingIds, editingIds.size, onMoveStart],
  );

  const openCookbook = useCallback(
    (args: Readonly<{ mode: 'save' | 'load' }>): void => {
      const props: CookbookModalProps = args.mode === 'save' ? { mode: 'save', ingredients, activeRecipeId } : { mode: 'load' };

      prepareCookbook(props);
      openModal({ type: 'cookbook', props });
    },
    [activeRecipeId, ingredients, openModal, prepareCookbook],
  );

  const handleClearRecipe = useCallback((): void => clearRecipe(), [clearRecipe]);

  const headerActions = useMemo((): JSX.Element => {
    const autoCookTooltip = isAutoCookEnabled ? 'Pause Auto-Cooking' : 'Resume Auto-Cooking';
    const autoCookClass = isAutoCookEnabled ? 'text-warning-fg hover:!bg-warning-bg' : 'text-success-fg hover:!bg-success-bg';

    return (
      <>
        <TooltipButton
          icon={<SaveIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          disabled={ingredients.length === 0}
          tooltipContent="Save to Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          onClick={() => openCookbook({ mode: 'save' })}
        />
        <TooltipButton
          icon={<FolderOpenIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          tooltipContent="Open Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          onClick={() => openCookbook({ mode: 'load' })}
        />
        <TooltipButton
          icon={isAutoCookEnabled ? <PauseIcon size={ICON_SIZES.SM} /> : <PlayIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          className={autoCookClass}
          tooltipContent={autoCookTooltip}
          tooltipPosition="bottom"
          onClick={() => kitchen.toggleAutoCook()}
        />
        <ConfirmButton
          actionName="Clear"
          itemType="Recipe"
          disabled={ingredients.length === 0}
          tooltipPosition="bottom"
          onConfirm={handleClearRecipe}
        />
      </>
    );
  }, [ingredients.length, isCookbookOpen, isAutoCookEnabled, openCookbook, handleClearRecipe]);

  const recipeItemHandlers: RecipeItemHandlers = useMemo(
    () => ({
      onDragStart: handleDragStart,
      onDragOver: onMoveOver,
      onDragEnd: onDragEnd,
    }),
    [handleDragStart, onMoveOver, onDragEnd],
  );

  const content = useMemo((): JSX.Element => {
    if (ingredients.length === 0) {
      if (isDraggingIngredient) {
        return <DropZoneLayout mode="overlay" text="Drop to add ingredient" variant="add" />;
      }
      return (
        <EmptyView className="h-full">
          No ingredients have been added.
          <br />
          Select from the Ingredients panel or drag them here.
        </EmptyView>
      );
    }
    return (
      <ul className="list-container pb-3">
        {ingredients.map((ingredient: IngredientItem) => (
          <RecipeItem key={ingredient.id} ingredientItem={ingredient} handlers={recipeItemHandlers} />
        ))}
        {isDraggingIngredient && (
          <li>
            <DropZoneLayout mode="placeholder" text="Drop to add ingredient" variant="add" />
          </li>
        )}
      </ul>
    );
  }, [ingredients, isDraggingIngredient, recipeItemHandlers]);

  const listClass = clsx('grow transition-colors duration-200', isDraggingIngredient && 'bg-surface-muted');

  return (
    <SectionLayout
      headerLeft="Recipe"
      headerRight={headerActions}
      className="panel-full-height-flex"
      contentClasses={clsx('relative flex h-full flex-col text-content-tertiary', scrollClasses)}
      contentRef={scrollRef}
    >
      <div className="flex h-full flex-col" {...dropZoneProps}>
        <div id={listId} className={clsx('grow overflow-y-auto', listClass, scrollClasses)}>
          {content}
        </div>
      </div>
    </SectionLayout>
  );
});
