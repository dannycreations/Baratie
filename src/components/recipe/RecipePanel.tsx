import { memo, useCallback, useId, useMemo, useState } from 'react';

import { errorHandler, ingredientRegistry, kitchen } from '../../app/container';
import { openCookbook } from '../../helpers/cookbookHelper';
import { useDragMove } from '../../hooks/useDragMove';
import { useKitchenStore } from '../../stores/useKitchenStore';
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
import type { Ingredient } from '../../core/IngredientRegistry';

export const RecipePanel = memo(function RecipePanel(): JSX.Element {
  const ingredients = useRecipeStore((state) => state.ingredients);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const clear = useRecipeStore((state) => state.clear);
  const removeIngredient = useRecipeStore((state) => state.removeIngredient);
  const reorderIngredients = useRecipeStore((state) => state.reorderIngredients);
  const updateSpice = useRecipeStore((state) => state.updateSpice);
  const ingredientStatuses = useKitchenStore((state) => state.ingredientStatuses);
  const isAutoCookEnabled = useKitchenStore((state) => state.isAutoCookEnabled);
  const inputPanelIngId = useKitchenStore((state) => state.inputPanelIngId);
  const theme = useThemeStore((state) => state.theme);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDraggingIngredient, setIsDraggingIngredient] = useState(false);
  const listId = useId();

  const {
    dragId,
    onDragStart: onDragStartBase,
    onDragEnter: onDragEnterBase,
    onDragOver: onDragOverBase,
    onDragEnd: onDragEndBase,
  } = useDragMove({
    onDragMove: reorderIngredients,
  });

  const onEditToggle = useCallback(
    (ingredient: Ingredient) => {
      if (inputPanelIngId === ingredient.id) {
        setEditingId(null);
        return;
      }
      setEditingId((currentId) => (currentId === ingredient.id ? null : ingredient.id));
    },
    [inputPanelIngId],
  );

  const onDragStart = useCallback(
    (event: DragEvent<HTMLElement>, ingredient: Ingredient) => {
      onDragStartBase(event, ingredient.id);
      event.dataTransfer.setData('application/x-baratie-recipe-item-id', ingredient.id);
    },
    [onDragStartBase],
  );

  const onIngredientEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('application/x-baratie-ingredient-type')) {
      setIsDraggingIngredient(true);
    }
  }, []);

  const onIngredientLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDraggingIngredient(false);
  }, []);

  const onIngredientOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.types.includes('application/x-baratie-ingredient-type')) {
        event.dataTransfer.dropEffect = 'copy';
      } else {
        onDragOverBase(event);
      }
    },
    [onDragOverBase],
  );

  const onIngredientDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingIngredient(false);
      const typeString = event.dataTransfer.getData('application/x-baratie-ingredient-type');
      if (typeString) {
        const typeSymbol = ingredientRegistry.getSymbolFromString(typeString);
        errorHandler.assert(typeSymbol, `Could not find symbol for ingredient type string: "${typeString}".`, 'Recipe Drag&Drop');
        addIngredient(typeSymbol);
      }
    },
    [addIngredient],
  );

  const handleSave = useCallback(() => {
    openCookbook({ mode: 'save', ingredients });
  }, [ingredients]);

  const handleLoad = useCallback(() => {
    openCookbook({ mode: 'load' });
  }, []);

  const headerActions = useMemo(() => {
    const autoCookTooltip = isAutoCookEnabled ? 'Pause Auto-Cooking' : 'Resume Auto-Cooking';
    const autoCookLabel = isAutoCookEnabled ? 'Pause Automatic Cooking' : 'Resume Automatic Cooking and Run';

    const autoCookClasses = [
      isAutoCookEnabled ? theme.warningText : theme.successText,
      isAutoCookEnabled ? theme.warningButtonTextHover : theme.successButtonTextHover,
      isAutoCookEnabled ? theme.warningButtonBgHover : theme.successButtonBgHover,
    ].join(' ');

    return [
      <TooltipButton
        key="save"
        aria-label="Save current recipe to cookbook"
        disabled={ingredients.length === 0}
        icon={<SaveIcon size={18} />}
        onClick={handleSave}
        size="sm"
        tooltipContent="Save to Cookbook"
        tooltipPosition="bottom"
        variant="stealth"
      />,
      <TooltipButton
        key="load"
        aria-label="Load a saved recipe from the cookbook"
        icon={<FolderOpenIcon size={18} />}
        onClick={handleLoad}
        size="sm"
        tooltipContent="Open Cookbook"
        tooltipPosition="bottom"
        variant="stealth"
      />,
      <TooltipButton
        key="autocook"
        aria-label={autoCookLabel}
        className={autoCookClasses}
        icon={isAutoCookEnabled ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        onClick={kitchen.toggleAutoCook}
        size="sm"
        tooltipContent={autoCookTooltip}
        tooltipPosition="bottom"
        variant="stealth"
      />,
      <TooltipButton
        key="clear"
        aria-label="Clear all ingredients from the recipe"
        disabled={ingredients.length === 0}
        icon={<Trash2Icon size={18} />}
        onClick={clear}
        size="sm"
        tooltipContent="Clear Recipe"
        tooltipPosition="bottom"
        variant="danger"
      />,
    ];
  }, [ingredients.length, isAutoCookEnabled, clear, handleSave, handleLoad, theme]);

  const content = useMemo(() => {
    if (ingredients.length === 0) {
      if (isDraggingIngredient) {
        return <DropzoneLayout mode="full" text="Drop to add ingredient" variant="add" />;
      }
      return (
        <EmptyView className="flex h-full flex-grow flex-col items-center justify-center p-3">
          No ingredients have been added.
          <br />
          Select from the Ingredients panel or drag them here.
        </EmptyView>
      );
    }

    return (
      <div role="list" aria-label="Current recipe steps" className="space-y-1.5">
        {ingredients.map((ingredient: Ingredient) => (
          <RecipeItem
            key={ingredient.id}
            status={ingredientStatuses[ingredient.id] || 'idle'}
            ingredient={ingredient}
            isAutoCook={isAutoCookEnabled}
            isDragged={dragId === ingredient.id}
            isEditing={editingId === ingredient.id && ingredient.id !== inputPanelIngId}
            isSpiceInInput={ingredient.id === inputPanelIngId}
            onDragEnd={onDragEndBase}
            onDragEnter={onDragEnterBase}
            onDragOver={onDragOverBase}
            onDragStart={onDragStart}
            onRemove={removeIngredient}
            onSpiceChange={updateSpice}
            onEditToggle={onEditToggle}
          />
        ))}
        {isDraggingIngredient && <DropzoneLayout mode="placeholder" text="Drop to add ingredient" variant="add" />}
      </div>
    );
  }, [
    ingredients,
    isDraggingIngredient,
    ingredientStatuses,
    isAutoCookEnabled,
    dragId,
    editingId,
    inputPanelIngId,
    onDragEndBase,
    onDragEnterBase,
    onDragOverBase,
    onDragStart,
    removeIngredient,
    updateSpice,
    onEditToggle,
  ]);

  const listClasses = [
    'flex-grow',
    'overflow-y-auto',
    'transition-colors',
    'duration-200',
    theme.textTertiary,
    isDraggingIngredient && theme.dropzoneRecipeBg,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <SectionLayout
      cardClassName="flex-1 min-h-0"
      cardContentClassName={`relative flex h-full flex-col p-2 ${theme.textTertiary}`}
      headerActions={headerActions}
      title="Recipe"
    >
      <div
        className="flex h-full flex-col"
        onDragEnter={onIngredientEnter}
        onDragLeave={onIngredientLeave}
        onDragOver={onIngredientOver}
        onDrop={onIngredientDrop}
      >
        <SearchListLayout listContent={content} listId={listId} listWrapperClassName={listClasses} showSearch={false} />
      </div>
    </SectionLayout>
  );
});
