import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { groupAndSortIngredients } from '../helpers/ingredientHelper';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export function useSearchIngredients(
  allIngredients: readonly IngredientDefinition[],
  query: string,
  favoriteIngredients: ReadonlySet<symbol>,
  disabledCategories: ReadonlySet<symbol>,
  disabledIngredients: ReadonlySet<symbol>,
): readonly (readonly [symbol, readonly IngredientDefinition[]])[] {
  const enabledIngredients = useMemo(
    () => allIngredients.filter((ing) => !disabledCategories.has(ing.category) && !disabledIngredients.has(ing.name)),
    [allIngredients, disabledCategories, disabledIngredients],
  );

  const categorizedAndSortedIngredients = useMemo(() => groupAndSortIngredients(enabledIngredients), [enabledIngredients]);

  const enabledAndSortedFavorites = useMemo(
    () =>
      enabledIngredients
        .filter((ing) => favoriteIngredients.has(ing.name))
        .sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? '')),
    [enabledIngredients, favoriteIngredients],
  );

  return useMemo(() => {
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

    for (const [category, ingredients] of categorizedAndSortedIngredients.entries()) {
      if ((category.description ?? '').toLowerCase().includes(lowerQuery)) {
        result.push([category, ingredients]);
        continue;
      }

      const ingredientMatches = ingredients.filter(searchPredicate);
      if (ingredientMatches.length > 0) {
        result.push([category, ingredientMatches]);
      }
    }

    return result;
  }, [query, categorizedAndSortedIngredients, enabledAndSortedFavorites]);
}
