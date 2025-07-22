import type { IngredientDefinition } from '../core/IngredientRegistry';

export function groupAndSortIngredients(ingredients: ReadonlyArray<IngredientDefinition>): ReadonlyMap<string, ReadonlyArray<IngredientDefinition>> {
  const grouped = new Map<string, Array<IngredientDefinition>>();
  for (const ingredient of ingredients) {
    if (!grouped.has(ingredient.category)) {
      grouped.set(ingredient.category, []);
    }
    grouped.get(ingredient.category)!.push(ingredient);
  }

  for (const categoryIngredients of grouped.values()) {
    categoryIngredients.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }

  const sortedEntries = [...grouped.entries()].sort(([catA], [catB]) => {
    return catA.localeCompare(catB);
  });

  return new Map(sortedEntries);
}

export interface ProcessedIngredients {
  readonly favorites: ReadonlyArray<IngredientDefinition>;
  readonly categories: ReadonlyMap<string, ReadonlyArray<IngredientDefinition>>;
  readonly visibleCount: number;
}

export function processIngredients(
  allIngredients: ReadonlyArray<IngredientDefinition>,
  favoriteNames: ReadonlySet<string>,
  disabledCategories: ReadonlySet<string>,
  disabledIngredients: ReadonlySet<string>,
): ProcessedIngredients {
  const favorites: Array<IngredientDefinition> = [];
  const grouped = new Map<string, Array<IngredientDefinition>>();
  let visibleCount = 0;

  for (const ingredient of allIngredients) {
    if (!disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.name)) {
      visibleCount++;
      if (favoriteNames.has(ingredient.name)) {
        favorites.push(ingredient);
      } else {
        if (!grouped.has(ingredient.category)) {
          grouped.set(ingredient.category, []);
        }
        grouped.get(ingredient.category)!.push(ingredient);
      }
    }
  }

  favorites.sort((a, b) => a.name.localeCompare(b.name));

  for (const categoryIngredients of grouped.values()) {
    categoryIngredients.sort((a, b) => a.name.localeCompare(b.name));
  }
  const sortedEntries = [...grouped.entries()].sort(([catA], [catB]) => catA.localeCompare(catB));

  return {
    favorites,
    categories: new Map(sortedEntries),
    visibleCount,
  };
}

export function searchGroupedIngredients(
  groupedIngredients: ReadonlyMap<string, ReadonlyArray<IngredientDefinition>>,
  lowerQuery: string,
): Array<[string, ReadonlyArray<IngredientDefinition>]> {
  if (!lowerQuery) {
    return Array.from(groupedIngredients.entries());
  }

  const result: Array<[string, ReadonlyArray<IngredientDefinition>]> = [];
  const searchPredicate = (ing: IngredientDefinition): boolean =>
    ing.name.toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);

  for (const [category, ingredients] of groupedIngredients.entries()) {
    if (category.toLowerCase().includes(lowerQuery)) {
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
