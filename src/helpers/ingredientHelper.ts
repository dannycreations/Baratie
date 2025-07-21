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
    const allCategorySymbols = new Map<string, symbol>();
    for (const ingredient of ingredientRegistry.getAllIngredients()) {
      const description = ingredient.category.description;
      if (description && !allCategorySymbols.has(description)) {
        allCategorySymbols.set(description, ingredient.category);
      }
    }
    return validatedItems.map((item) => allCategorySymbols.get(item)).filter((s): s is symbol => !!s);
  }
  return validatedItems.map((item) => ingredientRegistry.getSymbolFromString(item)).filter((s): s is symbol => !!s);
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

  for (const items of grouped.values()) {
    items.sort((a, b) => (a.name.description ?? '').localeCompare(b.name.description ?? ''));
  }

  return new Map([...grouped.entries()].sort((a, b) => (a[0].description ?? '').localeCompare(b[0].description ?? '')));
}
