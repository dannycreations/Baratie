import type { IngredientDefinition } from '../core/IngredientRegistry';

export function groupAndSortIngredients(ingredients: ReadonlyArray<IngredientDefinition>): ReadonlyMap<symbol, ReadonlyArray<IngredientDefinition>> {
  const grouped = new Map<symbol, Array<IngredientDefinition>>();
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
  groupedIngredients: ReadonlyMap<symbol, ReadonlyArray<IngredientDefinition>>,
  lowerQuery: string,
): Array<[symbol, ReadonlyArray<IngredientDefinition>]> {
  if (!lowerQuery) {
    return Array.from(groupedIngredients.entries());
  }

  const result: Array<[symbol, ReadonlyArray<IngredientDefinition>]> = [];
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
