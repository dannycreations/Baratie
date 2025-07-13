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
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { IngredientList } from './IngredientList';
import { IngredientManager } from './IngredientManager';

import type { DragEvent, JSX } from 'react';
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

  const allIngredients = useMemo<readonly IngredientDefinition[]>(() => ingredientRegistry.getAllIngredients(), [registryVersion]);
  const ingredientsByCat = useSearchIngredients(allIngredients, query, favorites, disabledCategories, disabledIngredients);
  const totalIngredients = allIngredients.length;
  const visibleIngredients = useMemo<number>(
    () => allIngredients.filter((ing) => !disabledCategories.includes(ing.category) && !disabledIngredients.includes(ing.name)).length,
    [allIngredients, disabledCategories, disabledIngredients],
  );

  const handleDragEnterRecipe = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('application/x-baratie-recipe-item-id')) {
      setDragOverRecipe(true);
    }
  }, []);

  const handleDragLeaveRecipe = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setDragOverRecipe(false);
  }, []);

  const handleDragOverRecipe = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes('application/x-baratie-recipe-item-id')) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDropRecipe = useCallback(
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

  const handleItemDragStart = useCallback((event: DragEvent<HTMLElement>, item: IngredientDefinition) => {
    const typeString = ingredientRegistry.getStringFromSymbol(item.name);
    errorHandler.assert(typeString, 'Ingredient ID not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData('application/x-baratie-ingredient-type', typeString);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleToggleFavorite = useCallback(
    (typeSymbol: symbol) => {
      toggle(typeSymbol);
    },
    [toggle],
  );

  const handleAddIngredient = useCallback(
    (typeSymbol: symbol) => {
      addIngredient(typeSymbol);
    },
    [addIngredient],
  );

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

  const renderItemActions = useCallback(
    (item: IngredientDefinition) => {
      const ingredientName = item.name.description ?? 'Unnamed Ingredient';
      const isFavorite = favorites.includes(item.name);

      const favoriteButtonClasses = [
        'opacity-70',
        isFavorite ? `text-${theme.favoriteFg}` : `text-${theme.contentTertiary}`,
        isFavorite ? `hover:text-${theme.favoriteFgHover}` : `hover:text-${theme.favoriteFg}`,
        'group-hover:opacity-100',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <>
          <TooltipButton
            aria-label={isFavorite ? `Remove '${ingredientName}' from favorites` : `Add '${ingredientName}' to favorites`}
            aria-pressed={isFavorite}
            className={favoriteButtonClasses}
            icon={<StarIcon isFilled={isFavorite} size={18} />}
            onClick={() => handleToggleFavorite(item.name)}
            size="sm"
            tooltipContent={isFavorite ? `Remove '${ingredientName}' from favorites` : `Add '${ingredientName}' to favorites`}
            tooltipPosition="top"
            variant="stealth"
          />
          <TooltipButton
            aria-label={`Add '${ingredientName}' to the recipe`}
            className="opacity-70 group-hover:opacity-100"
            icon={<PlusIcon size={18} />}
            onClick={() => handleAddIngredient(item.name)}
            size="sm"
            tooltipContent={`Add '${ingredientName}' to Recipe`}
            tooltipPosition="top"
            variant="primary"
          />
        </>
      );
    },
    [favorites, theme, handleToggleFavorite, handleAddIngredient],
  );

  return (
    <SectionLayout
      cardClassName="flex-1 min-h-0"
      cardContentClassName={`relative flex h-full flex-col p-2 text-${theme.contentTertiary}`}
      headerActions={headerActions}
      title="Ingredients"
    >
      <div
        className="flex h-full flex-col"
        onDragEnter={handleDragEnterRecipe}
        onDragLeave={handleDragLeaveRecipe}
        onDragOver={handleDragOverRecipe}
        onDrop={handleDropRecipe}
      >
        {isDragOverRecipe && <DropzoneLayout mode="overlay" text="Drop to Remove from Recipe" variant="remove" />}
        <SearchListLayout
          listContent={
            <IngredientList
              itemsByCategory={ingredientsByCat}
              renderItemActions={renderItemActions}
              onItemDragStart={handleItemDragStart}
              query={query}
            />
          }
          listId={listId}
          onQueryChange={setQuery}
          query={query}
          searchAriaLabel="Search for ingredients"
          searchClassName="mb-3"
          searchId="ingredient-search"
          searchPlaceholder="Search Ingredients..."
        />
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
