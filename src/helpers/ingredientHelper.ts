import { STORAGE_CATEGORIES, STORAGE_INGREDIENTS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';
import { useIngredientStore } from '../stores/useIngredientStore';

import type { IngredientDefinition } from '../core/IngredientRegistry';

function loadFilters(key: string, forCategories: boolean): symbol[] {
  const storedItems = storage.get(key, 'Ingredient Filters');
  if (!Array.isArray(storedItems)) {
    return [];
  }

  const validatedItems = storedItems.filter((item): item is string => typeof item === 'string');

  if (forCategories) {
    const allCategorySymbols = ingredientRegistry.getAllCategories();
    return validatedItems.reduce<symbol[]>((acc, item) => {
      const symbol = allCategorySymbols.get(item);
      if (symbol) {
        acc.push(symbol);
      }
      return acc;
    }, []);
  }

  return validatedItems.reduce<symbol[]>((acc, item) => {
    const symbol = ingredientRegistry.getSymbolFromString(item);
    if (symbol) {
      acc.push(symbol);
    }
    return acc;
  }, []);
}

export function initFilters(): void {
  const disabledCategories = loadFilters(STORAGE_CATEGORIES, true);
  const disabledIngredients = loadFilters(STORAGE_INGREDIENTS, false);
  useIngredientStore.getState().setFilters({ categories: disabledCategories, ingredients: disabledIngredients });
}

export function groupAndSortIngredients(ingredients: readonly IngredientDefinition[]): ReadonlyMap<symbol, readonly IngredientDefinition[]> {
  const grouped = new Map<symbol, IngredientDefinition[]>();
  for (const ingredient of ingredients) {
    if (!grouped.has(ingredient.category)) {
      grouped.set(ingredient.category, []);
    }
    grouped.get(ingredient.category)!.push(ingredient);
  }

  for (const categoryIngredients of grouped.values()) {
    categoryIngredients.sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? ''));
  }

  const sortedCategories = [...grouped.keys()].sort((a, b) => (a.description ?? '').localeCompare(b.description ?? ''));

  const result = new Map<symbol, readonly IngredientDefinition[]>();
  for (const category of sortedCategories) {
    result.set(category, grouped.get(category)!);
  }

  return result;
}

export function searchGroupedIngredients(
  groupedIngredients: ReadonlyMap<symbol, readonly IngredientDefinition[]>,
  query: string,
): [symbol, readonly IngredientDefinition[]][] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) {
    return Array.from(groupedIngredients.entries());
  }

  const result: [symbol, readonly IngredientDefinition[]][] = [];
  const searchPredicate = (ing: IngredientDefinition): boolean =>
    (ing.name.description ?? '').toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

  for (const [category, ingredients] of groupedIngredients.entries()) {
    if ((category.description ?? '').toLowerCase().includes(lowerQuery)) {
      result.push([category, ingredients]);
      continue;
    }
    const matchingIngredients = ingredients.filter(searchPredicate);
    if (matchingIngredients.length > 0) {
      result.push([category, matchingIngredients]);
    }
  }
  return result;
}
