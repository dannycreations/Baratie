import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';
import { searchGroupedIngredients } from '../helpers/ingredientHelper';

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
  const { categorizedIngredients, favoritesIngredients, visibleIngredients } = useMemo(() => {
    const grouped = new Map<symbol, IngredientDefinition[]>();
    const favoritesIngredients: IngredientDefinition[] = [];
    let visibleIngredients = 0;

    for (const ingredient of allIngredients) {
      if (!disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.name)) {
        visibleIngredients++;

        if (!grouped.has(ingredient.category)) {
          grouped.set(ingredient.category, []);
        }
        grouped.get(ingredient.category)!.push(ingredient);

        if (favoriteIngredients.has(ingredient.name)) {
          favoritesIngredients.push(ingredient);
        }
      }
    }

    for (const items of grouped.values()) {
      items.sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? ''));
    }

    const sortedEntries = Array.from(grouped.entries()).sort(([catA], [catB]) => {
      return (catA.description ?? '').localeCompare(catB.description ?? '');
    });
    const categorizedIngredients = new Map(sortedEntries);

    favoritesIngredients.sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? ''));

    return { categorizedIngredients, favoritesIngredients, visibleIngredients };
  }, [allIngredients, disabledCategories, disabledIngredients, favoriteIngredients]);

  const filteredIngredients = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      const result: [symbol, readonly IngredientDefinition[]][] = [];
      if (favoritesIngredients.length > 0) {
        result.push([CATEGORY_FAVORITES, favoritesIngredients]);
      }
      result.push(...categorizedIngredients.entries());
      return result;
    }

    const result: [symbol, readonly IngredientDefinition[]][] = [];
    const searchPredicate = (ing: IngredientDefinition): boolean =>
      (ing.name.description ?? '').toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

    const favoriteMatches = favoritesIngredients.filter(searchPredicate);
    if (favoriteMatches.length > 0) {
      result.push([CATEGORY_FAVORITES, favoriteMatches]);
    }

    const categorizedMatches = searchGroupedIngredients(categorizedIngredients, query);
    result.push(...categorizedMatches);

    return result;
  }, [query, categorizedIngredients, favoritesIngredients]);

  return {
    filteredIngredients,
    visibleIngredients,
  };
}
