import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { groupAndSortIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export interface SearchedIngredientsResult {
  readonly filteredIngredients: ReadonlyArray<readonly [symbol, ReadonlyArray<IngredientDefinition>]>;
  readonly visibleIngredients: number;
}

export function useSearchIngredients(
  allIngredients: ReadonlyArray<IngredientDefinition>,
  query: string,
  favoriteIngredients: ReadonlySet<symbol>,
  disabledCategories: ReadonlySet<symbol>,
  disabledIngredients: ReadonlySet<symbol>,
): SearchedIngredientsResult {
  const { favoritesList, categorizedIngredients, visibleIngredients } = useMemo(() => {
    const favorites: Array<IngredientDefinition> = [];
    const nonFavorites: Array<IngredientDefinition> = [];
    let visibleCount = 0;

    for (const ingredient of allIngredients) {
      if (!disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.name)) {
        visibleCount++;
        if (favoriteIngredients.has(ingredient.name)) {
          favorites.push(ingredient);
        } else {
          nonFavorites.push(ingredient);
        }
      }
    }

    favorites.sort((a, b) => {
      return (a.name.description ?? '').localeCompare(b.name.description ?? '');
    });

    return {
      favoritesList: favorites,
      categorizedIngredients: groupAndSortIngredients(nonFavorites),
      visibleIngredients: visibleCount,
    };
  }, [allIngredients, favoriteIngredients, disabledCategories, disabledIngredients]);

  const filteredIngredients = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      const result: Array<[symbol, ReadonlyArray<IngredientDefinition>]> = [];
      if (favoritesList.length > 0) {
        result.push([CATEGORY_FAVORITES, favoritesList]);
      }
      result.push(...categorizedIngredients.entries());
      return result;
    }

    const result: Array<[symbol, ReadonlyArray<IngredientDefinition>]> = [];
    const searchPredicate = (ing: IngredientDefinition): boolean =>
      (ing.name.description ?? '').toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

    const favoriteMatches = favoritesList.filter(searchPredicate);
    if (favoriteMatches.length > 0) {
      result.push([CATEGORY_FAVORITES, favoriteMatches]);
    }

    const categorizedMatches = searchGroupedIngredients(categorizedIngredients, lowerQuery);
    result.push(...categorizedMatches);

    return result;
  }, [query, categorizedIngredients, favoritesList]);

  return {
    filteredIngredients,
    visibleIngredients,
  };
}
