import { memo, useCallback, useId, useMemo, useState } from 'react';

import { ingredientRegistry, kitchen } from '../../app/container';
import { useDragMove } from '../../hooks/useDragMove';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { FolderOpenIcon, PauseIcon, PlayIcon, SaveIcon, Trash2Icon } from '../shared/Icon';
import { DropzoneLayout } from '../shared/layout/DropzoneLayout';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { EmptyView } from '../shared/View';
import { RecipeItem } from './RecipeItem';

import type { DragEvent, JSX } from 'react';
import type { IngredientItem } from '../../core/IngredientRegistry';
import type { RecipeItemHandlers } from './RecipeItem';

export const RecipePanel = memo((): JSX.Element => {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const activeRecipeId = useRecipeStore((state) => state.activeRecipeId);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const removeIngredient = useRecipeStore((state) => state.removeIngredient);
  const reorderIngredients = useRecipeStore((state) => state.reorderIngredients);
  const updateSpice = useRecipeStore((state) => state.updateSpice);
  const clearRecipe = useRecipeStore((state) => state.clearRecipe);
  const openCookbook = useCookbookStore((state) => state.open);
  const isCookbookOpen = useModalStore((state) => state.activeModal === 'cookbook');
  const isAutoCookEnabled = useKitchenStore((state) => state.isAutoCookEnabled);
  const theme = useThemeStore((state) => state.theme);

  const [isDraggingIngredient, setIsDraggingIngredient] = useState(false);
  const listId = useId();

  const {
    dragId,
    onDragStart: onMoveStart,
    onDragEnter: onMoveEnter,
    onDragOver: onMoveOver,
    onDragEnd: onMoveEnd,
  } = useDragMove({ onDragMove: reorderIngredients });

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, ingredient: IngredientItem) => {
      onMoveStart(event, ingredient.id);
      event.dataTransfer.setData('application/x-baratie-recipe-item-id', ingredient.id);
    },
    [onMoveStart],
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('application/x-baratie-ingredient-type')) {
      setIsDraggingIngredient(true);
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDraggingIngredient(false);
  }, []);

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.types.includes('application/x-baratie-ingredient-type')) {
        event.dataTransfer.dropEffect = 'copy';
      } else {
        onMoveOver(event);
      }
    },
    [onMoveOver],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingIngredient(false);
      const typeString = event.dataTransfer.getData('application/x-baratie-ingredient-type');
      if (typeString && ingredientRegistry.getIngredient(typeString)) {
        addIngredient(typeString);
      }
    },
    [addIngredient],
  );

  const headerActions = useMemo(() => {
    const autoCookTooltip = isAutoCookEnabled ? 'Pause Auto-Cooking' : 'Resume Auto-Cooking';
    const autoCookLabel = isAutoCookEnabled ? 'Pause Automatic Cooking' : 'Resume Automatic Cooking and Run';
    const autoCookClass = isAutoCookEnabled
      ? `text-${theme.warningFg} hover:!bg-${theme.warningBg}`
      : `text-${theme.successFg} hover:!bg-${theme.successBg}`;

    return (
      <>
        <TooltipButton
          aria-label="Save current recipe to cookbook"
          disabled={ingredients.length === 0}
          icon={<SaveIcon size={18} />}
          size="sm"
          tooltipContent="Save to Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          variant="stealth"
          onClick={() => openCookbook({ mode: 'save', ingredients, activeRecipeId })}
        />
        <TooltipButton
          aria-label="Load a saved recipe from the cookbook"
          icon={<FolderOpenIcon size={18} />}
          size="sm"
          tooltipContent="Open Cookbook"
          tooltipDisabled={isCookbookOpen}
          tooltipPosition="bottom"
          variant="stealth"
          onClick={() => openCookbook({ mode: 'load' })}
        />
        <TooltipButton
          aria-label={autoCookLabel}
          className={autoCookClass}
          icon={isAutoCookEnabled ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          size="sm"
          tooltipContent={autoCookTooltip}
          tooltipPosition="bottom"
          variant="stealth"
          onClick={kitchen.toggleAutoCook}
        />
        <TooltipButton
          aria-label="Clear all ingredients from the recipe"
          disabled={ingredients.length === 0}
          icon={<Trash2Icon size={18} />}
          size="sm"
          tooltipContent="Clear Recipe"
          tooltipPosition="bottom"
          variant="danger"
          onClick={clearRecipe}
        />
      </>
    );
  }, [ingredients, activeRecipeId, isCookbookOpen, isAutoCookEnabled, theme, openCookbook, clearRecipe]);

  let content: JSX.Element;
  if (ingredients.length === 0) {
    if (isDraggingIngredient) {
      content = <DropzoneLayout mode="full" text="Drop to add ingredient" variant="add" />;
    } else {
      content = (
        <EmptyView className="flex h-full grow flex-col items-center justify-center p-3">
          No ingredients have been added.
          <br />
          Select from the Ingredients panel or drag them here.
        </EmptyView>
      );
    }
  } else {
    content = (
      <div role="list" aria-label="Current recipe steps" className="space-y-1.5">
        {ingredients.map((ingredient: IngredientItem) => {
          const recipeItemHandlers: RecipeItemHandlers = {
            onRemove: removeIngredient,
            onSpiceChange: updateSpice,
            onDragStart: handleDragStart,
            onDragEnter: onMoveEnter,
            onDragEnd: onMoveEnd,
            onDragOver: onMoveOver,
          };
          return (
            <RecipeItem
              key={ingredient.id}
              ingredientItem={ingredient}
              isAutoCook={isAutoCookEnabled}
              isDragged={dragId === ingredient.id}
              {...recipeItemHandlers}
            />
          );
        })}
        {isDraggingIngredient && <DropzoneLayout mode="placeholder" text="Drop to add ingredient" variant="add" />}
      </div>
    );
  }

  const listClass = `
    grow overflow-y-auto transition-colors duration-200
    ${isDraggingIngredient ? `bg-${theme.surfaceMuted}` : ''}
  `.trim();

  return (
    <SectionLayout
      contentClasses={`relative flex h-full flex-col p-2 text-${theme.contentTertiary}`}
      headerLeft="Recipe"
      headerRight={headerActions}
      panelClasses="h-[50vh] min-h-0 md:h-auto md:flex-1"
    >
      <div
        className="flex h-full flex-col"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SearchListLayout listContent={content} listId={listId} listWrapperClasses={listClass} showSearch={false} />
      </div>
    </SectionLayout>
  );
});
