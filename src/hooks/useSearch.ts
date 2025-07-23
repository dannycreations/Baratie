import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { createIngredientSearchPredicate, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientProps } from '../core/IngredientRegistry';

export interface SearchedIngredientsResult {
  readonly filteredIngredients: ReadonlyArray<readonly [string, ReadonlyArray<IngredientProps>]>;
  readonly visibleIngredients: number;
}

export function useSearchIngredients(
  allIngredients: ReadonlyArray<IngredientProps>,
  query: string,
  favoriteIngredients: ReadonlySet<string>,
  disabledCategories: ReadonlySet<string>,
  disabledIngredients: ReadonlySet<string>,
): SearchedIngredientsResult {
  const visibleIngredients = useMemo(() => {
    return allIngredients.filter((ingredient) => !disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.id));
  }, [allIngredients, disabledCategories, disabledIngredients]);

  const groupedIngredients = useMemo(() => {
    const favorites: Array<IngredientProps> = [];
    const categorized = new Map<string, Array<IngredientProps>>();

    for (const ingredient of visibleIngredients) {
      if (favoriteIngredients.has(ingredient.id)) {
        favorites.push(ingredient);
      } else {
        const list = categorized.get(ingredient.category);
        if (list) {
          list.push(ingredient);
        } else {
          categorized.set(ingredient.category, [ingredient]);
        }
      }
    }

    const sortedCategorized = new Map([...categorized.entries()].sort(([a], [b]) => a.localeCompare(b)));
    return { favorites, categorized: sortedCategorized };
  }, [visibleIngredients, favoriteIngredients]);

  const filteredIngredients = useMemo(() => {
    const { favorites, categorized } = groupedIngredients;
    const finalResult: Array<[string, ReadonlyArray<IngredientProps>]> = [];

    if (!query) {
      if (favorites.length > 0) {
        finalResult.push([CATEGORY_FAVORITES, favorites]);
      }
      finalResult.push(...categorized.entries());
      return finalResult;
    }

    const lowerQuery = query.toLowerCase().trim();
    const searchPredicate = createIngredientSearchPredicate(lowerQuery);

    const matchingFavorites = favorites.filter(searchPredicate);
    if (matchingFavorites.length > 0) {
      finalResult.push([CATEGORY_FAVORITES, matchingFavorites]);
    }

    finalResult.push(...searchGroupedIngredients(categorized, query));
    return finalResult;
  }, [groupedIngredients, query]);

  return {
    filteredIngredients,
    visibleIngredients: visibleIngredients.length,
  };
}
