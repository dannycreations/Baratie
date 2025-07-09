import { STORAGE_CATEGORIES, STORAGE_INGREDIENTS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';
import { useIngredientStore } from '../stores/useIngredientStore';

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
    return validatedItems.map((item) => allCategorySymbols.get(item)).filter((s): s is symbol => s !== undefined);
  }

  return validatedItems.map((item) => ingredientRegistry.getSymbolFromString(item)).filter((s): s is symbol => s !== undefined);
}

export function initIngPrefs(): void {
  const disabledCategories = loadFilters(STORAGE_CATEGORIES, true);
  const disabledIngredients = loadFilters(STORAGE_INGREDIENTS, false);
  useIngredientStore.getState().setFilters({ categories: disabledCategories, ingredients: disabledIngredients });
}
