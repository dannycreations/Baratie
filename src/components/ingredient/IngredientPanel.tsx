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
import { SearchListLayout } from '../shared/layout/ListLayout';
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
  const activeModal = useModalStore((state) => state.activeModal);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState<string>('');

  const listId = useId();
  const isIngredientOpen = activeModal === 'ingredientManager';
  const isSettingOpen = activeModal === 'settings';

  const handleDropRecipe = useCallback(
    (id: string): void => {
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

  const handleItemDragStart = useCallback((event: DragEvent<HTMLElement>, item: BaseListItem): void => {
    errorHandler.assert(item.id, 'Ingredient unique name not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData('application/x-baratie-ingredient-type', item.id);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const headerActions = (
    <>
      <TooltipButton
        icon={<PreferencesIcon size={18} />}
        size="sm"
        variant="stealth"
        aria-label={`Manage ingredients. ${visibleIngredients} of ${totalIngredients} visible.`}
        tooltipContent={`Manage Ingredients\n${visibleIngredients} of ${totalIngredients} visible`}
        tooltipDisabled={isIngredientOpen}
        tooltipPosition="bottom"
        onClick={() => openModal('ingredientManager')}
      />
      <TooltipButton
        icon={<SettingsIcon size={18} />}
        size="sm"
        variant="stealth"
        aria-label="Open application settings"
        tooltipContent="Settings, Appearance & Extensions"
        tooltipDisabled={isSettingOpen}
        tooltipPosition="bottom"
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
            icon={<StarIcon isFilled={isFavorite} size={18} />}
            size="sm"
            variant="stealth"
            className={`opacity-70 group-hover:opacity-100 ${
              isFavorite
                ? `text-${theme.favoriteFg} hover:text-${theme.favoriteFgHover}`
                : `text-${theme.contentTertiary} hover:text-${theme.favoriteFg}`
            }`}
            aria-label={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            aria-pressed={isFavorite}
            tooltipContent={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            tooltipPosition="top"
            onClick={() => toggleFavorite(item.id)}
          />
          <TooltipButton
            icon={<PlusIcon size={18} />}
            size="sm"
            variant="primary"
            className="opacity-70 group-hover:opacity-100"
            aria-label={`Add '${item.name}' to the recipe`}
            tooltipContent={`Add '${item.name}' to Recipe`}
            tooltipPosition="top"
            onClick={() => addIngredient(item.id)}
          />
        </>
      );
    },
    [favorites, theme, toggleFavorite, addIngredient],
  );

  return (
    <SectionLayout
      headerLeft="Ingredients"
      headerRight={headerActions}
      panelClasses="h-[50vh] min-h-0 md:h-auto md:flex-1"
      contentClasses={`relative flex h-full flex-col text-${theme.contentTertiary}`}
    >
      <div className="flex h-full flex-col" {...recipeDropZoneProps}>
        {isDragOverRecipe && <DropZoneLayout mode="overlay" text="Drop to Remove from Recipe" variant="remove" />}
        <SearchListLayout
          listId={listId}
          listContent={
            <IngredientList
              query={query}
              itemsByCategory={filteredIngredients}
              renderItemActions={renderItemActions}
              onItemDragStart={handleItemDragStart}
            />
          }
          search={{
            query,
            onQueryChange: setQuery,
            id: 'ingredient-search',
            ariaLabel: 'Search for ingredients',
            placeholder: 'Search Ingredients...',
          }}
        />
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
