import { memo, useCallback, useId, useState } from 'react';

import { errorHandler } from '../../app/container';
import { useDropZone } from '../../hooks/useDropZone';
import { useSearchIngredients } from '../../hooks/useSearchAction';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useFavoriteStore } from '../../stores/useFavoriteStore';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { PlusIcon, PreferencesIcon, SettingsIcon, StarIcon } from '../shared/Icon';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { SearchListLayout } from '../shared/layout/SearchListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { IngredientList } from './IngredientList';
import { IngredientManager } from './IngredientManager';

import type { DragEvent, JSX } from 'react';
import type { BaseListItem } from './IngredientList';

export const IngredientPanel = memo((): JSX.Element => {
  const favorites = useFavoriteStore((state) => state.favorites);
  const toggleFavorite = useFavoriteStore((state) => state.toggle);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const removeIngredient = useRecipeStore((state) => state.removeIngredient);
  const disabledCategories = useIngredientStore((state) => state.disabledCategories);
  const disabledIngredients = useIngredientStore((state) => state.disabledIngredients);
  const registryVersion = useIngredientStore((state) => state.registryVersion);
  const openModal = useModalStore((state) => state.openModal);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);
  const theme = useThemeStore((state) => state.theme);
  const activeModal = useModalStore((state) => state.activeModal);

  const isIngredientOpen = activeModal === 'ingredientManager';
  const isSettingOpen = activeModal === 'settings';

  const [query, setQuery] = useState<string>('');
  const listId = useId();

  const handleDropRecipe = useCallback(
    (id: string) => {
      if (id) {
        removeIngredient(id);
      }
      setDraggedItemId(null);
    },
    [removeIngredient, setDraggedItemId],
  );

  const { isDragOver: isDragOverRecipe, dropZoneProps: recipeDropZoneProps } = useDropZone<string, HTMLDivElement>({
    effect: 'move',
    onValidate: (dt) => dt.types.includes('application/x-baratie-recipe-item-id'),
    onExtract: (dt) => dt.getData('application/x-baratie-recipe-item-id'),
    onDrop: handleDropRecipe,
  });

  const { filteredIngredients, allIngredientsCount, visibleIngredientsCount } = useSearchIngredients({
    query,
    registryVersion,
    favorites,
    disabledCategories,
    disabledIngredients,
  });

  const visibleIngredients = visibleIngredientsCount;
  const totalIngredients = allIngredientsCount;

  const handleItemDragStart = useCallback((event: DragEvent<HTMLElement>, item: BaseListItem) => {
    errorHandler.assert(item.id, 'Ingredient unique name not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData('application/x-baratie-ingredient-type', item.id);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const headerActions = (
    <>
      <TooltipButton
        aria-label={`Manage ingredients. ${visibleIngredients} of ${totalIngredients} visible.`}
        icon={<PreferencesIcon size={18} />}
        size="sm"
        tooltipContent={`Manage Ingredients\n${visibleIngredients} of ${totalIngredients} visible`}
        tooltipDisabled={isIngredientOpen}
        tooltipPosition="bottom"
        variant="stealth"
        onClick={() => openModal('ingredientManager')}
      />
      <TooltipButton
        aria-label="Open application settings"
        icon={<SettingsIcon size={18} />}
        size="sm"
        tooltipContent="Settings, Appearance & Extensions"
        tooltipDisabled={isSettingOpen}
        tooltipPosition="bottom"
        variant="stealth"
        onClick={() => openModal('settings')}
      />
    </>
  );

  const renderItemActions = useCallback(
    (item: BaseListItem): JSX.Element => {
      const isFavorite = favorites.has(item.id);

      return (
        <>
          <TooltipButton
            aria-label={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            aria-pressed={isFavorite}
            className={`
              opacity-70 group-hover:opacity-100
              ${isFavorite ? `text-${theme.favoriteFg} hover:text-${theme.favoriteFgHover}` : `text-${theme.contentTertiary} hover:text-${theme.favoriteFg}`}
            `}
            icon={<StarIcon isFilled={isFavorite} size={18} />}
            size="sm"
            tooltipContent={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            tooltipPosition="top"
            variant="stealth"
            onClick={() => toggleFavorite(item.id)}
          />
          <TooltipButton
            aria-label={`Add '${item.name}' to the recipe`}
            className="opacity-70 group-hover:opacity-100"
            icon={<PlusIcon size={18} />}
            size="sm"
            tooltipContent={`Add '${item.name}' to Recipe`}
            tooltipPosition="top"
            variant="primary"
            onClick={() => addIngredient(item.id)}
          />
        </>
      );
    },
    [favorites, theme, toggleFavorite, addIngredient],
  );

  return (
    <SectionLayout
      contentClasses={`relative flex h-full flex-col text-${theme.contentTertiary}`}
      headerLeft="Ingredients"
      headerRight={headerActions}
      panelClasses="h-[50vh] min-h-0 md:h-auto md:flex-1"
    >
      <div className="flex h-full flex-col" {...recipeDropZoneProps}>
        {isDragOverRecipe && <DropZoneLayout mode="overlay" text="Drop to Remove from Recipe" variant="remove" />}
        <SearchListLayout
          listContent={
            <IngredientList
              query={query}
              itemsByCategory={filteredIngredients}
              renderItemActions={renderItemActions}
              onItemDragStart={handleItemDragStart}
            />
          }
          listId={listId}
          search={{
            query,
            onQueryChange: setQuery,
            ariaLabel: 'Search for ingredients',
            id: 'ingredient-search',
            placeholder: 'Search Ingredients...',
          }}
        />
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
