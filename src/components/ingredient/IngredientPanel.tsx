import { memo, useCallback, useDeferredValue, useId, useMemo, useState } from 'react';

import { CATEGORY_FAVORITES, DATA_TYPE_INGREDIENT, DATA_TYPE_RECIPE_ITEM, ICON_SIZES } from '../../app/constants';
import { errorHandler, ingredientRegistry } from '../../app/container';
import { createIngredientSearchPredicate, groupAndSortIngredients, searchGroupedIngredients } from '../../helpers/ingredientHelper';
import { useDropZone } from '../../hooks/useDropZone';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useFavoriteStore } from '../../stores/useFavoriteStore';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { PlusIcon, PreferencesIcon, SettingsIcon, StarIcon } from '../shared/Icon';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { GroupListLayout, SearchListLayout } from '../shared/layout/ListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { IngredientManager } from './IngredientManager';

import type { DragEvent, JSX } from 'react';
import type { IngredientProps } from '../../core/IngredientRegistry';
import type { GroupListItem } from '../shared/layout/ListLayout';

export const IngredientPanel = memo((): JSX.Element => {
  const favorites = useFavoriteStore((state) => state.favorites);
  const toggleFavorite = useFavoriteStore((state) => state.toggle);
  const addIngredient = useRecipeStore((state) => state.addIngredient);
  const removeIngredient = useRecipeStore((state) => state.removeIngredient);
  const disabledCategories = useIngredientStore((state) => state.disabledCategories);
  const disabledIngredients = useIngredientStore((state) => state.disabledIngredients);
  const registryVersion = useIngredientStore((state) => state.registryVersion);
  const openModal = useModalStore((state) => state.openModal);
  const currentModal = useModalStore((state) => state.currentModal);
  const setDraggedItemId = useDragMoveStore((state) => state.setDraggedItemId);
  const theme = useThemeStore((state) => state.theme);

  const [query, setQuery] = useState<string>('');

  const listId = useId();
  const isIngredientOpen = currentModal?.type === 'ingredient';
  const isSettingOpen = currentModal?.type === 'settings';

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
    onValidate: (dt) => dt.types.includes(DATA_TYPE_RECIPE_ITEM),
    onExtract: (dt) => dt.getData(DATA_TYPE_RECIPE_ITEM),
    onDrop: handleDropRecipe,
  });

  const allIngredients = useMemo<ReadonlyArray<IngredientProps>>(() => {
    return ingredientRegistry.getAll();
  }, [registryVersion]);

  const deferredQuery = useDeferredValue(query);

  const visibleIngredientsList = useMemo(() => {
    return allIngredients.filter((ing) => !disabledCategories.has(ing.category) && !disabledIngredients.has(ing.id));
  }, [allIngredients, disabledCategories, disabledIngredients]);

  const favoritesList = useMemo(() => {
    return visibleIngredientsList.filter((ing) => favorites.has(ing.id));
  }, [visibleIngredientsList, favorites]);

  const regularList = useMemo(() => {
    return visibleIngredientsList.filter((ing) => !favorites.has(ing.id));
  }, [visibleIngredientsList, favorites]);

  const groupedRegular = useMemo(() => groupAndSortIngredients(regularList), [regularList]);

  const filteredIngredients = useMemo((): Array<[string, ReadonlyArray<IngredientProps>]> => {
    const lowerQuery = deferredQuery.toLowerCase().trim();
    if (!lowerQuery) {
      const allGrouped = [...groupedRegular.entries()];
      if (favoritesList.length > 0) {
        return [[CATEGORY_FAVORITES, favoritesList], ...allGrouped];
      }
      return allGrouped;
    }

    const searchPredicate = createIngredientSearchPredicate(lowerQuery);
    const filteredFavorites = favoritesList.filter(searchPredicate);
    const filteredRegular = searchGroupedIngredients(groupedRegular, deferredQuery);

    const result: Array<[string, ReadonlyArray<IngredientProps>]> = [];
    if (filteredFavorites.length > 0) {
      result.push([CATEGORY_FAVORITES, filteredFavorites]);
    }
    result.push(...filteredRegular);
    return result;
  }, [deferredQuery, favoritesList, groupedRegular]);

  const allIngredientsCount = allIngredients.length;
  const visibleIngredientsCount = visibleIngredientsList.length;

  const visibleIngredients = visibleIngredientsCount;
  const totalIngredients = allIngredientsCount;

  const handleItemDragStart = useCallback((event: DragEvent<HTMLElement>, item: GroupListItem): void => {
    errorHandler.assert(item.id, 'Ingredient unique name not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData(DATA_TYPE_INGREDIENT, item.id);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const headerActions = useMemo(
    () => (
      <>
        <TooltipButton
          icon={<PreferencesIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          tooltipContent={`Manage Ingredients\n${visibleIngredients} of ${totalIngredients} visible`}
          tooltipDisabled={isIngredientOpen}
          tooltipPosition="bottom"
          onClick={() => openModal({ type: 'ingredient', props: undefined })}
        />
        <TooltipButton
          icon={<SettingsIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          tooltipContent="Settings"
          tooltipDisabled={isSettingOpen}
          tooltipPosition="bottom"
          onClick={() => openModal({ type: 'settings', props: undefined })}
        />
      </>
    ),
    [isIngredientOpen, isSettingOpen, openModal, totalIngredients, visibleIngredients],
  );

  const renderItemActions = useCallback(
    (item: GroupListItem): JSX.Element => {
      const isFavorite = favorites.has(item.id);
      const starClasses = [
        'opacity-70 group-hover:opacity-100',
        isFavorite ? `text-${theme.favoriteFg} hover:text-${theme.favoriteFgHover}` : `text-${theme.contentTertiary} hover:text-${theme.favoriteFg}`,
      ].join(' ');

      return (
        <>
          <TooltipButton
            icon={<StarIcon isFilled={isFavorite} size={ICON_SIZES.SM} />}
            size="sm"
            variant="stealth"
            className={starClasses}
            tooltipContent={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            tooltipPosition="top"
            onClick={() => toggleFavorite(item.id)}
          />
          <TooltipButton
            icon={<PlusIcon size={ICON_SIZES.SM} />}
            size="sm"
            variant="primary"
            className="opacity-70 group-hover:opacity-100"
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
      className="h-[50vh] min-h-0 md:h-auto md:flex-1"
      contentClasses={`relative flex h-full flex-col text-${theme.contentTertiary}`}
    >
      <div className="flex h-full flex-col" {...recipeDropZoneProps}>
        {isDragOverRecipe && <DropZoneLayout mode="overlay" text="Drop to Remove from Recipe" variant="remove" />}
        <SearchListLayout
          listId={listId}
          listContent={
            <GroupListLayout
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
            placeholder: 'Search Ingredients...',
          }}
        />
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
