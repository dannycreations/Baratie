import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { createIngredientSearchPredicate, groupAndSortIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

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
    return allIngredients.filter((ingredient) => {
      return !disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.id);
    });
  }, [allIngredients, disabledCategories, disabledIngredients]);

  const groupedIngredients = useMemo(() => {
    const favoriteItems: Array<IngredientProps> = [];
    const otherItems: Array<IngredientProps> = [];

    for (const ingredient of visibleIngredients) {
      if (favoriteIngredients.has(ingredient.id)) {
        favoriteItems.push(ingredient);
      } else {
        otherItems.push(ingredient);
      }
    }

    const categorized = groupAndSortIngredients(otherItems);

    return {
      favorites: favoriteItems,
      categorized: categorized,
    };
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
    filteredIngredients: filteredIngredients,
    visibleIngredients: visibleIngredients.length,
  };
}
