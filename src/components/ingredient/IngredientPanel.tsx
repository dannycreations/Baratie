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

export const IngredientPanel = memo((): JSX.Element => {
  const favorites = useFavoriteStore((state) => state.favorites);
  const toggleFavorite = useFavoriteStore((state) => state.toggle);
  const { addIngredient, removeIngredient } = useRecipeStore.getState();
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

  const allIngredients = useMemo<ReadonlyArray<IngredientDefinition>>(() => {
    return ingredientRegistry.getAllIngredients();
  }, [registryVersion]);
  const { filteredIngredients, visibleIngredients } = useSearchIngredients(allIngredients, query, favorites, disabledCategories, disabledIngredients);
  const totalIngredients = allIngredients.length;

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
    errorHandler.assert(item.name, 'Ingredient ID not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData('application/x-baratie-ingredient-type', item.name);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const headerActions = useMemo<JSX.Element>(
    () => (
      <>
        <TooltipButton
          aria-label={`Manage ingredients. ${visibleIngredients} of ${totalIngredients} visible.`}
          icon={<PreferencesIcon size={18} />}
          size="sm"
          tooltipContent={`Manage Ingredients\n${visibleIngredients} of ${totalIngredients} visible`}
          tooltipDisabled={isIngredientOpen}
          tooltipPosition="bottom"
          variant="stealth"
          onClick={openIngredientModal}
        />
        <TooltipButton
          aria-label="Open application settings"
          icon={<SettingsIcon size={18} />}
          size="sm"
          tooltipContent="Settings, Appearance & Extensions"
          tooltipDisabled={isSettingOpen}
          tooltipPosition="bottom"
          variant="stealth"
          onClick={openSettingModal}
        />
      </>
    ),
    [totalIngredients, visibleIngredients, openIngredientModal, openSettingModal, isIngredientOpen, isSettingOpen],
  );

  const renderItemActions = useCallback(
    (item: IngredientDefinition): JSX.Element => {
      const isFavorite = favorites.has(item.name);

      const favoriteButtonClass = `opacity-70 group-hover:opacity-100 ${
        isFavorite ? `text-${theme.favoriteFg} hover:text-${theme.favoriteFgHover}` : `text-${theme.contentTertiary} hover:text-${theme.favoriteFg}`
      }`;

      return (
        <>
          <TooltipButton
            aria-label={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            aria-pressed={isFavorite}
            className={favoriteButtonClass}
            icon={<StarIcon isFilled={isFavorite} size={18} />}
            size="sm"
            tooltipContent={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            tooltipPosition="top"
            variant="stealth"
            onClick={() => toggleFavorite(item.name)}
          />
          <TooltipButton
            aria-label={`Add '${item.name}' to the recipe`}
            className="opacity-70 group-hover:opacity-100"
            icon={<PlusIcon size={18} />}
            size="sm"
            tooltipContent={`Add '${item.name}' to Recipe`}
            tooltipPosition="top"
            variant="primary"
            onClick={() => addIngredient(item.name)}
          />
        </>
      );
    },
    [favorites, theme, toggleFavorite, addIngredient],
  );

  return (
    <SectionLayout
      contentClasses={`relative flex h-full flex-col p-2 text-${theme.contentTertiary}`}
      headerLeft="Ingredients"
      headerRight={headerActions}
      panelClasses="h-[50vh] min-h-0 md:h-auto md:flex-1"
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
              itemsByCategory={filteredIngredients}
              query={query}
              renderItemActions={renderItemActions}
              onItemDragStart={handleItemDragStart}
            />
          }
          listId={listId}
          query={query}
          searchAriaLabel="Search for ingredients"
          searchClasses="mb-3"
          searchId="ingredient-search"
          searchPlaceholder="Search Ingredients..."
          onQueryChange={setQuery}
        />
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
