import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { groupAndSortIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export interface SearchedIngredientsResult {
  readonly filteredIngredients: readonly (readonly [symbol, readonly IngredientDefinition[]])[];
  readonly enabledIngredientsCount: number;
}

export function useSearchIngredients(
  allIngredients: readonly IngredientDefinition[],
  query: string,
  favoriteIngredients: ReadonlySet<symbol>,
  disabledCategories: ReadonlySet<symbol>,
  disabledIngredients: ReadonlySet<symbol>,
): SearchedIngredientsResult {
  const { enabledIngredients, enabledAndSortedFavorites } = useMemo(() => {
    const enabled: IngredientDefinition[] = [];
    const favorites: IngredientDefinition[] = [];
    for (const ing of allIngredients) {
      if (!disabledCategories.has(ing.category) && !disabledIngredients.has(ing.name)) {
        enabled.push(ing);
        if (favoriteIngredients.has(ing.name)) {
          favorites.push(ing);
        }
      }
    }
    favorites.sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? ''));
    return { enabledIngredients: enabled, enabledAndSortedFavorites: favorites };
  }, [allIngredients, disabledCategories, disabledIngredients, favoriteIngredients]);

  const categorizedAndSortedIngredients = useMemo(() => groupAndSortIngredients(enabledIngredients), [enabledIngredients]);

  const filteredIngredients = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      const result: [symbol, readonly IngredientDefinition[]][] = [];
      if (enabledAndSortedFavorites.length > 0) {
        result.push([CATEGORY_FAVORITES, enabledAndSortedFavorites]);
      }
      result.push(...categorizedAndSortedIngredients.entries());
      return result;
    }

    const result: [symbol, readonly IngredientDefinition[]][] = [];
    const searchPredicate = (ing: IngredientDefinition): boolean =>
      (ing.name.description ?? '').toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

    const favoriteMatches = enabledAndSortedFavorites.filter(searchPredicate);
    if (favoriteMatches.length > 0) {
      result.push([CATEGORY_FAVORITES, favoriteMatches]);
    }

    const categorizedMatches = searchGroupedIngredients(categorizedAndSortedIngredients, query);
    result.push(...categorizedMatches);

    return result;
  }, [query, categorizedAndSortedIngredients, enabledAndSortedFavorites]);

  return {
    filteredIngredients,
    enabledIngredientsCount: enabledIngredients.length,
  };
}
