import { memo, useCallback, useEffect, useId, useMemo, useRef } from 'react';

import { ingredientRegistry, kitchen } from '../../app/container';
import { useDragMove } from '../../hooks/useDragMove';
import { useDropZone } from '../../hooks/useDropZone';
import { useCookbookStore } from '../../stores/useCookbookStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { FolderOpenIcon, PauseIcon, PlayIcon, SaveIcon } from '../shared/Icon';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { EmptyView } from '../shared/View';
import { RecipeItem } from './RecipeItem';

import type { DragEvent, JSX } from 'react';
import type { IngredientItem, SpiceDefinition, SpiceValue } from '../../core/IngredientRegistry';
import type { RecipeItemHandlers } from './RecipeItem';

export const RecipePanel = memo((): JSX.Element => {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const editingId = useRecipeStore((state) => state.editingId);
  const setEditingId = useRecipeStore((state) => state.setEditingId);
  const isCookbookOpen = useModalStore((state) => state.activeModal === 'cookbook');
  const isAutoCookEnabled = useKitchenStore((state) => state.isAutoCookEnabled);
  const ingredientStatuses = useKitchenStore((state) => state.ingredientStatuses);
  const inputPanelId = useKitchenStore((state) => state.inputPanelId);
  const theme = useThemeStore((state) => state.theme);

  const prevIngredientsCount = useRef(ingredients.length);
  const listId = useId();

  const handleDropIngredient = useCallback((typeString: string) => {
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

  const handleReorder = useCallback((draggedId: string, targetId: string) => {
    useRecipeStore.getState().reorderIngredients(draggedId, targetId);
  }, []);

  const {
    dragId,
    onDragStart: onMoveStart,
    onDragEnter: onMoveEnter,
    onDragOver: onMoveOver,
    onDragEnd: onMoveEnd,
  } = useDragMove({ onDragMove: handleReorder });

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, ingredient: IngredientItem) => {
      onMoveStart(event, ingredient.id);
      event.dataTransfer.setData('application/x-baratie-recipe-item-id', ingredient.id);
    },
    [onMoveStart],
  );

  const openCookbook = useCallback((args: { readonly mode: 'save' | 'load' }) => {
    const { ingredients, activeRecipeId } = useRecipeStore.getState();
    useCookbookStore.getState().open({ ...args, ingredients, activeRecipeId });
  }, []);

  const handleClearRecipe = useCallback(() => useRecipeStore.getState().clearRecipe(), []);

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
          onClick={() => openCookbook({ mode: 'save' })}
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
        <ConfirmButton
          actionName="Clear"
          disabled={ingredients.length === 0}
          itemName="the current recipe"
          itemType="Recipe"
          tooltipPosition="bottom"
          onConfirm={handleClearRecipe}
        />
      </>
    );
  }, [ingredients.length, isCookbookOpen, isAutoCookEnabled, theme, openCookbook, handleClearRecipe]);

  const handleRemove = useCallback((id: string) => {
    useRecipeStore.getState().removeIngredient(id);
  }, []);

  const handleSpiceChange = useCallback((id: string, spiceId: string, rawValue: SpiceValue, spice: Readonly<SpiceDefinition>) => {
    useRecipeStore.getState().updateSpice(id, spiceId, rawValue, spice);
  }, []);

  let content: JSX.Element;
  if (ingredients.length === 0) {
    if (isDraggingIngredient) {
      content = <DropZoneLayout mode="full" text="Drop to add ingredient" variant="add" />;
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
          const isSpiceInInput = inputPanelId === ingredient.id;
          const isEditingItem = editingId === ingredient.id;

          const handleEditToggle = (): void => {
            if (isSpiceInInput) {
              setEditingId(null);
              return;
            }
            setEditingId(isEditingItem ? null : ingredient.id);
          };

          const recipeItemHandlers: RecipeItemHandlers = {
            onRemove: handleRemove,
            onSpiceChange: handleSpiceChange,
            onDragStart: handleDragStart,
            onDragEnter: onMoveEnter,
            onDragEnd: onMoveEnd,
            onDragOver: onMoveOver,
            onEditToggle: handleEditToggle,
          };
          return (
            <RecipeItem
              key={ingredient.id}
              ingredientItem={ingredient}
              isAutoCook={isAutoCookEnabled}
              isDragged={dragId === ingredient.id}
              isEditing={!isSpiceInInput && isEditingItem}
              isSpiceInInput={isSpiceInInput}
              status={ingredientStatuses[ingredient.id] || 'idle'}
              {...recipeItemHandlers}
            />
          );
        })}
        {isDraggingIngredient && <DropZoneLayout mode="placeholder" text="Drop to add ingredient" variant="add" />}
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
      <div className="flex h-full flex-col" {...dropZoneProps}>
        <SearchListLayout listContent={content} listId={listId} listWrapperClasses={listClass} />
      </div>
    </SectionLayout>
  );
});
