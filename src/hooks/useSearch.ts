import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { processIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export interface SearchedIngredientsResult {
  readonly filteredIngredients: ReadonlyArray<readonly [string, ReadonlyArray<IngredientDefinition>]>;
  readonly visibleIngredients: number;
}

export function useSearchIngredients(
  allIngredients: ReadonlyArray<IngredientDefinition>,
  query: string,
  favoriteIngredients: ReadonlySet<string>,
  disabledCategories: ReadonlySet<string>,
  disabledIngredients: ReadonlySet<string>,
): SearchedIngredientsResult {
  const {
    favorites: favoritesList,
    categories: categorizedIngredients,
    visibleCount: visibleIngredients,
  } = useMemo(() => {
    return processIngredients(allIngredients, favoriteIngredients, disabledCategories, disabledIngredients);
  }, [allIngredients, favoriteIngredients, disabledCategories, disabledIngredients]);

  const filteredIngredients = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      const result: Array<[string, ReadonlyArray<IngredientDefinition>]> = [];
      if (favoritesList.length > 0) {
        result.push([CATEGORY_FAVORITES, favoritesList]);
      }
      result.push(...categorizedIngredients.entries());
      return result;
    }

    const result: Array<[string, ReadonlyArray<IngredientDefinition>]> = [];
    const searchPredicate = (ing: IngredientDefinition): boolean =>
      ing.name.toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

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
