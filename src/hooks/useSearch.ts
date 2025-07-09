import { useMemo } from 'react';

import { CATEGORY_FAVORITES } from '../app/constants';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export function useSearchIngredients(
  allIngredients: readonly IngredientDefinition[],
  query: string,
  favoriteIngredients: readonly symbol[],
  disabledCategories: readonly symbol[],
  disabledIngredients: readonly symbol[],
): ReadonlyMap<symbol, readonly IngredientDefinition[]> {
  return useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    const visibleIngredients = allIngredients.filter(
      (ingredient) => !disabledCategories.includes(ingredient.category) && !disabledIngredients.includes(ingredient.id),
    );

    if (visibleIngredients.length === 0) {
      return new Map();
    }

    const favoritesList: IngredientDefinition[] = [];
    const ingredientsByCat = new Map<symbol, IngredientDefinition[]>();

    for (const ingredient of visibleIngredients) {
      const isFavorite = favoriteIngredients.includes(ingredient.id);

      const categoryDescription = (ingredient.category.description ?? '').toLowerCase();
      const nameMatches = ingredient.name.toLowerCase().includes(lowerQuery);
      const descriptionMatches = ingredient.description.toLowerCase().includes(lowerQuery);
      const categoryMatches = categoryDescription.includes(lowerQuery);
      const searchMatches = !lowerQuery || nameMatches || descriptionMatches || categoryMatches;

      if (isFavorite && (!lowerQuery || nameMatches || descriptionMatches)) {
        favoritesList.push(ingredient);
      }

      if (searchMatches) {
        if (!ingredientsByCat.has(ingredient.category)) {
          ingredientsByCat.set(ingredient.category, []);
        }
        ingredientsByCat.get(ingredient.category)!.push(ingredient);
      }
    }

    const result = new Map<symbol, readonly IngredientDefinition[]>();

    if (favoritesList.length > 0) {
      favoritesList.sort((a, b) => a.name.localeCompare(b.name));
      result.set(CATEGORY_FAVORITES, favoritesList);
    }

    const sortedCategories = Array.from(ingredientsByCat.keys()).sort((a, b) => (a.description ?? '').localeCompare(b.description ?? ''));

    for (const category of sortedCategories) {
      const items = ingredientsByCat.get(category)!;
      items.sort((a, b) => a.name.localeCompare(b.name));
      result.set(category, items);
    }

    return result;
  }, [allIngredients, query, favoriteIngredients, disabledCategories, disabledIngredients]);
}
