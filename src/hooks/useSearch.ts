import { useDeferredValue, useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { createIngredientSearchPredicate, groupAndSortIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientProps } from '../core/IngredientRegistry';

export function useSearchItems<T extends object>(items: ReadonlyArray<T>, query: string, searchKeys: ReadonlyArray<keyof T>): ReadonlyArray<T> {
  const deferredQuery = useDeferredValue(query);

  const filteredItems = useMemo(() => {
    const lowerQuery = deferredQuery.toLowerCase().trim();
    if (!lowerQuery) {
      return items;
    }

    return items.filter((item) => {
      return searchKeys.some((key) => {
        const value = item[key];
        return typeof value === 'string' && value.toLowerCase().includes(lowerQuery);
      });
    });
  }, [items, deferredQuery, searchKeys]);

  return filteredItems;
}

export function useSearchIngredients(
  allIngredients: ReadonlyArray<IngredientProps>,
  query: string,
  favorites: ReadonlySet<string>,
  disabledCategories: ReadonlySet<string>,
  disabledIngredients: ReadonlySet<string>,
) {
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
    visibleIngredients: visibleIngredientsList.length,
  };
}
