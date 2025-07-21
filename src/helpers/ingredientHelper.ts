import type { IngredientDefinition } from '../core/IngredientRegistry';

export function groupAndSortIngredients(ingredients: readonly IngredientDefinition[]): ReadonlyMap<symbol, readonly IngredientDefinition[]> {
  const grouped = new Map<symbol, IngredientDefinition[]>();
  for (const ingredient of ingredients) {
    if (!grouped.has(ingredient.category)) {
      grouped.set(ingredient.category, []);
    }
    grouped.get(ingredient.category)!.push(ingredient);
  }

  for (const categoryIngredients of grouped.values()) {
    categoryIngredients.sort((a, b) => {
      return (a.name.description ?? '').localeCompare(b.name.description ?? '');
    });
  }

  const sortedEntries = [...grouped.entries()].sort(([catA], [catB]) => {
    return (catA.description ?? '').localeCompare(catB.description ?? '');
  });

  return new Map(sortedEntries);
}

export function searchGroupedIngredients(
  groupedIngredients: ReadonlyMap<symbol, readonly IngredientDefinition[]>,
  lowerQuery: string,
): [symbol, readonly IngredientDefinition[]][] {
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
