import { cn } from 'cnfast';
import { Plus, Settings, SlidersHorizontal, Star } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

import { CATEGORY_FAVORITES, DATA_TYPE_INGREDIENT, DATA_TYPE_RECIPE_ITEM, ICON_SIZES } from '../../app/constants';
import { errorHandler, ingredientRegistry } from '../../app/container';
import { createIngredientSearchPredicate } from '../../helpers/ingredientHelper';
import { filterGroupedList, groupListByCategory } from '../../helpers/listHelper';
import { useDropZone } from '../../hooks/useDropZone';
import { useSearch } from '../../hooks/useSearch';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useFavoriteStore } from '../../stores/useFavoriteStore';
import { useIngredientStore } from '../../stores/useIngredientStore';
import { useModalStore } from '../../stores/useModalStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { TooltipButton } from '../shared/Button';
import { SearchInput } from '../shared/input/SearchInput';
import { DropZoneLayout } from '../shared/layout/DropZoneLayout';
import { GroupListLayout } from '../shared/layout/ListLayout';
import { SectionLayout } from '../shared/layout/SectionLayout';
import { ScrollArea } from '../shared/ScrollArea';
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

  const { query, deferredQuery, onQueryChange, onClear } = useSearch();

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

  const { favoritesList, regularList, visibleIngredientsCount } = useMemo(() => {
    const favs: IngredientProps[] = [];
    const regs: IngredientProps[] = [];
    let visibleCount = 0;
    for (const ing of allIngredients) {
      if (!disabledCategories.has(ing.category) && !disabledIngredients.has(ing.id)) {
        visibleCount++;
        if (favorites.has(ing.id)) {
          favs.push(ing);
        } else {
          regs.push(ing);
        }
      }
    }
    return { favoritesList: favs, regularList: regs, visibleIngredientsCount: visibleCount };
  }, [allIngredients, disabledCategories, disabledIngredients, favorites]);

  const groupedRegular = useMemo(() => groupListByCategory(regularList, (ingredient) => ingredient.category), [regularList]);

  const filteredIngredients = useMemo((): Array<[string, ReadonlyArray<IngredientProps>]> => {
    if (!deferredQuery.trim()) {
      return favoritesList.length > 0 ? [[CATEGORY_FAVORITES, favoritesList], ...groupedRegular] : groupedRegular;
    }

    const searchPredicate = createIngredientSearchPredicate(deferredQuery);
    const filteredFavorites = favoritesList.filter(searchPredicate);
    const filteredRegular = filterGroupedList(groupedRegular, deferredQuery, searchPredicate);

    const result: Array<[string, ReadonlyArray<IngredientProps>]> = [];
    if (filteredFavorites.length > 0) {
      result.push([CATEGORY_FAVORITES, filteredFavorites]);
    }
    result.push(...filteredRegular);
    return result;
  }, [deferredQuery, favoritesList, groupedRegular]);

  const totalIngredients = allIngredients.length;

  const handleItemDragStart = useCallback((event: DragEvent<HTMLElement>, item: GroupListItem): void => {
    errorHandler.assert(item.id, 'Ingredient unique name not found on dragged element.', 'Ingredient Drag');
    event.dataTransfer.setData(DATA_TYPE_INGREDIENT, item.id);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const headerActions = useMemo(
    () => (
      <>
        <TooltipButton
          icon={<SlidersHorizontal size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          tooltipContent={`Manage Ingredients\n${visibleIngredientsCount} of ${totalIngredients} visible`}
          tooltipDisabled={isIngredientOpen}
          tooltipPosition="bottom"
          onClick={() => openModal({ type: 'ingredient', props: undefined })}
        />
        <TooltipButton
          icon={<Settings size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          tooltipContent="Settings"
          tooltipDisabled={isSettingOpen}
          tooltipPosition="bottom"
          onClick={() => openModal({ type: 'settings', props: undefined })}
        />
      </>
    ),
    [isIngredientOpen, isSettingOpen, openModal, totalIngredients, visibleIngredientsCount],
  );

  const renderItemActions = useCallback(
    (item: GroupListItem): JSX.Element => {
      const isFavorite = favorites.has(item.id);
      const starClasses = cn(
        'list-item-group-actions',
        isFavorite ? 'text-favorite-fg hover:text-favorite-fg-hover' : 'text-content-tertiary hover:text-favorite-fg',
      );

      return (
        <>
          <TooltipButton
            icon={<Star size={ICON_SIZES.SM} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={isFavorite ? 0 : 2} />}
            size="sm"
            variant="stealth"
            className={starClasses}
            tooltipContent={isFavorite ? `Remove '${item.name}' from favorites` : `Add '${item.name}' to favorites`}
            tooltipPosition="top"
            onClick={() => toggleFavorite(item.id)}
          />
          <TooltipButton
            icon={<Plus size={ICON_SIZES.SM} />}
            size="sm"
            variant="primary"
            className="list-item-group-actions"
            tooltipContent={`Add '${item.name}' to Recipe`}
            tooltipPosition="top"
            onClick={() => addIngredient(item.id)}
          />
        </>
      );
    },
    [addIngredient, favorites, toggleFavorite],
  );

  return (
    <SectionLayout
      headerLeft="Ingredients"
      headerRight={headerActions}
      className="panel-full-height-flex"
      contentClasses="relative flex-col-gap-2 h-full"
    >
      <div className="flex-col-gap-2 h-full text-content-tertiary" {...recipeDropZoneProps}>
        {isDragOverRecipe && <DropZoneLayout mode="overlay" text="Drop to Remove from Recipe" variant="remove" />}
        <div className="flex-col-gap-2 h-full">
          <SearchInput id="ingredient-search" value={query} placeholder="Search Ingredients..." onChange={onQueryChange} onClear={onClear} />
          <ScrollArea className="flex-1-overflow-auto">
            <GroupListLayout
              query={query}
              itemsByCategory={filteredIngredients}
              renderItemActions={renderItemActions}
              onItemDragStart={handleItemDragStart}
            />
          </ScrollArea>
        </div>
      </div>
      <IngredientManager />
    </SectionLayout>
  );
});
