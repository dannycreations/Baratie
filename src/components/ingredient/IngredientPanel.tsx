import { memo, useCallback, useId, useMemo, useState } from 'react';

import { errorHandler, ingredientRegistry } from '../../app/container';
import { useSearchIngredients } from '../../hooks/useSearch';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useFavoriteStore } from '../../stores/useFavoriteStore';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { PlusIcon, PreferencesIcon, SettingsIcon, StarIcon } from '../shared/Icon';
import { DropzoneLayout } from '../shared/layout/DropzoneLayout';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { Tooltip } from '../shared/Tooltip';
import { IngredientList } from './IngredientList';
import { IngredientManager } from './IngredientManager';

import type { DragEvent, JSX, MouseEvent } from 'react';
import type { IngredientDefinition } from '../../core/IngredientRegistry';

export const IngredientPanel = memo(function IngredientPanel(): JSX.Element {
  const favorites = useFavoriteStore((state) => state.favorites);
  const toggle = useFavoriteStore((state) => state.toggle);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const removeIngredient = useRecipeStore((state) => state.removeIngredient);
  const disabledCategories = useIngredientStore((state) => state.disabledCategories);
  const disabledIngredients = useIngredientStore((state) => state.disabledIngredients);
  const openIngredientModal = useIngredientStore((state) => state.openModal);
  const isIngredientOpen = useIngredientStore((state) => state.isModalOpen);
  const registryVersion = useIngredientStore((state) => state.registryVersion);
  const openSettingModal = useSettingStore((state) => state.openModal);
  const isSettingOpen = useSettingStore((state) => state.isModalOpen);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState<string>('');
  const [isDragOverRecipe, setDragOverRecipe] = useState(false);

  const listId = useId();

  const allIngredients = useMemo(() => ingredientRegistry.getAllIngredients(), [registryVersion]);
  const ingredientsByCat = useSearchIngredients(allIngredients, query, favorites, disabledCategories, disabledIngredients);
  const totalIngredients = allIngredients.length;
  const visibleIngredients = useMemo(
    () => allIngredients.filter((ing) => !disabledCategories.includes(ing.category) && !disabledIngredients.includes(ing.name)).length,
    [allIngredients, disabledCategories, disabledIngredients],
  );

  const onRecipeDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('application/x-baratie-recipe-item-id')) {
      setDragOverRecipe(true);
    }
  }, []);

  const onRecipeDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setDragOverRecipe(false);
  }, []);

  const onRecipeDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes('application/x-baratie-recipe-item-id')) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onRecipeDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const id = event.dataTransfer.getData('application/x-baratie-recipe-item-id');
      if (id) {
        removeIngredient(id);
      }
      setDragOverRecipe(false);
      setDraggedItemId(null);
    },
    [removeIngredient, setDraggedItemId],
  );

  const handleDragStart = useCallback((event: DragEvent<HTMLElement>) => {
    const typeString = event.currentTarget.dataset.ingredientId;
    errorHandler.assert(typeString, 'Ingredient ID not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData('application/x-baratie-ingredient-type', typeString);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleToggleFavorite = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const typeString = event.currentTarget.dataset.ingredientId;
      errorHandler.assert(typeString, 'Ingredient ID not found on favorite button.', 'Toggle Favorite');
      const typeSymbol = ingredientRegistry.getSymbolFromString(typeString);
      errorHandler.assert(typeSymbol, `Symbol not found for ID: ${typeString}`, 'Toggle Favorite');
      toggle(typeSymbol);
    },
    [toggle],
  );

  const handleAddIngredient = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const typeString = event.currentTarget.dataset.ingredientId;
      errorHandler.assert(typeString, 'Ingredient ID not found on add button.', 'Add Ingredient');
      const typeSymbol = ingredientRegistry.getSymbolFromString(typeString);
      errorHandler.assert(typeSymbol, `Symbol not found for ID: ${typeString}`, 'Add Ingredient');
      addIngredient(typeSymbol);
    },
    [addIngredient],
  );

  const preventMouseDefault = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const headerActions = useMemo(
    () => (
      <>
        <TooltipButton
          aria-label={`Manage ingredients. ${visibleIngredients} of ${totalIngredients} visible.`}
          icon={<PreferencesIcon size={18} />}
          onClick={openIngredientModal}
          size="sm"
          tooltipContent={`Manage Ingredients\n${visibleIngredients} of ${totalIngredients} visible`}
          tooltipPosition="bottom"
          variant="stealth"
          tooltipDisabled={isIngredientOpen}
        />
        <TooltipButton
          aria-label="Open application settings"
          icon={<SettingsIcon size={18} />}
          onClick={openSettingModal}
          size="sm"
          tooltipContent="Settings, Appearance & Extensions"
          tooltipPosition="bottom"
          variant="stealth"
          tooltipDisabled={isSettingOpen}
        />
      </>
    ),
    [totalIngredients, visibleIngredients, openIngredientModal, openSettingModal, isIngredientOpen, isSettingOpen],
  );

  const renderIngredient = useCallback(
    (ingredient: IngredientDefinition) => {
      const ingredientName = ingredient.name.description ?? 'Unnamed Ingredient';
      const isFavorite = favorites.includes(ingredient.name);
      const ingredientIdString = ingredientRegistry.getStringFromSymbol(ingredient.name);
      errorHandler.assert(ingredientIdString, `Could not get string from symbol for ingredient: ${ingredientName}`, 'Render Ingredient');

      const favoriteButtonClasses = [
        'opacity-70',
        'group-hover:opacity-100',
        isFavorite ? theme.starFavorite : theme.textTertiary,
        isFavorite ? theme.starFavoriteHover : theme.starNonFavoriteHover,
      ]
        .filter(Boolean)
        .join(' ');

      const leftColumn = (
        <Tooltip content={ingredient.description} position="top" tooltipClassName="max-w-xs">
          <span
            className={`truncate pr-2 text-sm cursor-default transition-colors duration-150 ${theme.textSecondary} ${theme.accentTextGroupHover}`}
          >
            {ingredientName}
          </span>
        </Tooltip>
      );

      const rightColumn = (
        <>
          <TooltipButton
            aria-label={isFavorite ? `Remove '${ingredientName}' from favorites` : `Add '${ingredientName}' to favorites`}
            aria-pressed={isFavorite}
            className={favoriteButtonClasses}
            data-ingredient-id={ingredientIdString}
            draggable={false}
            icon={<StarIcon isFilled={isFavorite} size={18} />}
            onClick={handleToggleFavorite}
            onMouseDown={preventMouseDefault}
            size="sm"
            tooltipContent={isFavorite ? `Remove '${ingredientName}' from favorites` : `Add '${ingredientName}' to favorites`}
            tooltipPosition="top"
            variant="stealth"
          />
          <TooltipButton
            aria-label={`Add '${ingredientName}' to the recipe`}
            className="opacity-70 group-hover:opacity-100"
            data-ingredient-id={ingredientIdString}
            draggable={false}
            icon={<PlusIcon size={18} />}
            onClick={handleAddIngredient}
            onMouseDown={preventMouseDefault}
            size="sm"
            tooltipContent={`Add '${ingredientName}' to Recipe`}
            tooltipPosition="top"
            variant="primary"
          />
        </>
      );

      return (
        <li key={ingredient.name.toString()} data-ingredient-id={ingredientIdString} draggable={true} onDragStart={handleDragStart}>
          <ItemListLayout
            className={`group h-11 rounded-md px-2 py-1.5 transition-colors duration-150 ${theme.itemBg} ${theme.itemBgMutedHover}`}
            leftContent={leftColumn}
            rightContent={rightColumn}
          />
        </li>
      );
    },
    [favorites, theme, handleDragStart, handleToggleFavorite, handleAddIngredient, preventMouseDefault],
  );

  return (
    <SectionLayout
      cardClassName="flex-1 min-h-0"
      cardContentClassName={`relative flex h-full flex-col p-2 ${theme.textTertiary}`}
      headerActions={headerActions}
      title="Ingredients"
    >
      <div
        className="flex h-full flex-col"
        onDragEnter={onRecipeDragEnter}
        onDragLeave={onRecipeDragLeave}
        onDragOver={onRecipeDragOver}
        onDrop={onRecipeDrop}
      >
        {isDragOverRecipe && <DropzoneLayout mode="overlay" text="Drop to Remove from Recipe" variant="remove" />}
        <SearchListLayout
          listContent={<IngredientList itemsByCategory={ingredientsByCat} renderItem={renderIngredient} query={query} />}
          listId={listId}
          onSearchChange={setQuery}
          searchAriaLabel="Search for ingredients"
          searchClassName="mb-3"
          searchId="ingredient-search"
          searchPlaceholder="Search Ingredients..."
          searchTerm={query}
        />
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
