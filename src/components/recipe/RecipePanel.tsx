import { cn } from 'cnfast';
import { FolderOpen, Pause, Play, Save } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import { DATA_TYPE_INGREDIENT, DATA_TYPE_RECIPE_ITEM, ICON_SIZES } from '../../app/constants';
import { kitchen } from '../../app/container';
import { useDragMove } from '../../hooks/useDragMove';
import { useDropZone } from '../../hooks/useDropZone';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { ScrollArea } from '../shared/ScrollArea';
import { EmptyView } from '../shared/View';
import { RecipeItem } from './RecipeItem';

import type { DragEvent, JSX } from 'react';
import type { IngredientItem } from '../../core/IngredientRegistry';
import type { RecipeItemHandlers } from './RecipeItem';

export const RecipePanel = memo((): JSX.Element => {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const editingIds = useRecipeStore((state) => state.editingIds);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const clearRecipe = useRecipeStore((state) => state.clearRecipe);
  const reorderIngredients = useRecipeStore((state) => state.reorderIngredients);
  const clearEditingIds = useRecipeStore((state) => state.clearEditingIds);
  const isCookbookOpen = useModalStore((state) => state.currentModal?.type === 'cookbook');
  const isAutoCookEnabled = useKitchenStore((state) => state.isAutoCookEnabled);
  const openCookbook = useCookbookStore((state) => state.open);

  const prevIngredientsCount = useRef(ingredients.length);
  const listRef = useRef<HTMLUListElement>(null);

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
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    prevIngredientsCount.current = ingredients.length;
  }, [ingredients.length]);

  const {
    onDragStart: onMoveStart,
    onDragOver: onMoveOver,
    onDragEnd,
  } = useDragMove({
    items: ingredients,
    onDragMove: reorderIngredients,
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

  const headerActions = useMemo((): JSX.Element => {
    const autoCookTooltip = isAutoCookEnabled ? 'Pause Auto-Cooking' : 'Resume Auto-Cooking';
    const autoCookClass = isAutoCookEnabled ? 'text-warning-fg hover:!bg-warning-bg' : 'text-success-fg hover:!bg-success-bg';

    return (
      <>
        <TooltipButton
          icon={<Save size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          disabled={ingredients.length === 0}
          tooltipContent="Save to Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          onClick={() => openCookbook('save')}
        />
        <TooltipButton
          icon={<FolderOpen size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          tooltipContent="Open Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          onClick={() => openCookbook('load')}
        />
        <TooltipButton
          icon={isAutoCookEnabled ? <Pause size={ICON_SIZES.SM} /> : <Play size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          className={autoCookClass}
          tooltipContent={autoCookTooltip}
          tooltipPosition="bottom"
          onClick={() => kitchen.toggleAutoCook()}
        />
        <ConfirmButton actionName="Clear" itemType="Recipe" disabled={ingredients.length === 0} tooltipPosition="bottom" onConfirm={clearRecipe} />
      </>
    );
  }, [ingredients.length, isCookbookOpen, isAutoCookEnabled, openCookbook, clearRecipe]);

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
      <ul ref={listRef} className="list-container pb-3">
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

  const listClass = cn('grow transition-colors duration-200', isDraggingIngredient && 'bg-surface-muted');

  return (
    <SectionLayout
      headerLeft="Recipe"
      headerRight={headerActions}
      className="panel-full-height-flex"
      contentClasses="relative flex-col-gap-2 h-full text-content-tertiary"
    >
      <div className="flex-col-gap-2 h-full" {...dropZoneProps}>
        <ScrollArea className={cn('flex-1-overflow-auto', listClass)}>{content}</ScrollArea>
      </div>
    </SectionLayout>
  );
});
