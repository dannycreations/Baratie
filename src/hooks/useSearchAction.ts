import { useDeferredValue, useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { ingredientRegistry } from '../app/container';
import { createIngredientSearchPredicate, groupAndSortIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientProps } from '../core/IngredientRegistry';

interface SearchIngredientsProps {
  readonly query: string;
  readonly registryVersion: number;
  readonly favorites: ReadonlySet<string>;
  readonly disabledCategories: ReadonlySet<string>;
  readonly disabledIngredients: ReadonlySet<string>;
}

interface SearchIngredientsReturn {
  readonly filteredIngredients: ReadonlyArray<[string, ReadonlyArray<IngredientProps>]>;
  readonly allIngredientsCount: number;
  readonly visibleIngredientsCount: number;
}

export function useSearchIngredients({
  query,
  registryVersion,
  favorites,
  disabledCategories,
  disabledIngredients,
}: SearchIngredientsProps): SearchIngredientsReturn {
  const allIngredients = useMemo<ReadonlyArray<IngredientProps>>(() => {
    return ingredientRegistry.getAllIngredients();
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
      const allGrouped = Array.from(groupedRegular.entries());
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

  return {
    filteredIngredients,
    allIngredientsCount: allIngredients.length,
    visibleIngredientsCount: visibleIngredientsList.length,
  };
}
