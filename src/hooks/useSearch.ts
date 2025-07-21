import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { groupAndSortIngredients, searchGroupedIngredients } from '../helpers/ingredientHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export interface SearchedIngredientsResult {
  readonly filteredIngredients: readonly (readonly [symbol, readonly IngredientDefinition[]])[];
  readonly visibleIngredients: number;
}

export function useSearchIngredients(
  allIngredients: readonly IngredientDefinition[],
  query: string,
  favoriteIngredients: ReadonlySet<symbol>,
  disabledCategories: ReadonlySet<symbol>,
  disabledIngredients: ReadonlySet<symbol>,
): SearchedIngredientsResult {
  const visibleIngredients = useMemo(
    () => allIngredients.filter((ingredient) => !disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.name)),
    [allIngredients, disabledCategories, disabledIngredients],
  );

  const favoritesList = useMemo(
    () =>
      visibleIngredients
        .filter((ing) => favoriteIngredients.has(ing.name))
        .sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? '')),
    [visibleIngredients, favoriteIngredients],
  );

  const categorizedIngredients = useMemo(() => groupAndSortIngredients(visibleIngredients), [visibleIngredients]);

  const filteredIngredients = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      const result: [symbol, readonly IngredientDefinition[]][] = [];
      if (favoritesList.length > 0) {
        result.push([CATEGORY_FAVORITES, favoritesList]);
      }
      result.push(...categorizedIngredients.entries());
      return result;
    }

    const result: [symbol, readonly IngredientDefinition[]][] = [];
    const searchPredicate = (ing: IngredientDefinition): boolean =>
      (ing.name.description ?? '').toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

    const favoriteMatches = favoritesList.filter(searchPredicate);
    if (favoriteMatches.length > 0) {
      result.push([CATEGORY_FAVORITES, favoriteMatches]);
    }

    const categorizedMatches = searchGroupedIngredients(categorizedIngredients, query);
    result.push(...categorizedMatches);

    return result;
  }, [query, categorizedIngredients, favoritesList]);

  return {
    filteredIngredients,
    visibleIngredients: visibleIngredients.length,
  };
}
