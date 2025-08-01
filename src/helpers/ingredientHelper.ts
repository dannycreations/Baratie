import type { IngredientProps } from '../core/IngredientRegistry';

const categorySortFn = ([catA]: readonly [string, unknown], [catB]: readonly [string, unknown]): number => catA.localeCompare(catB);

export function createIngredientSearchPredicate(lowerQuery: string): (ing: IngredientProps) => boolean {
  return (ing: IngredientProps): boolean => ing.name.toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);
}

export function groupAndSortIngredients(ingredients: ReadonlyArray<IngredientProps>): ReadonlyMap<string, ReadonlyArray<IngredientProps>> {
  const grouped = new Map<string, Array<IngredientProps>>();

  for (const ingredient of ingredients) {
    const categoryList = grouped.get(ingredient.category);
    if (categoryList) {
      categoryList.push(ingredient);
    } else {
      grouped.set(ingredient.category, [ingredient]);
    }
  }

  const sortedEntries = [...grouped.entries()].sort(categorySortFn);
  return new Map(sortedEntries);
}

export function searchGroupedIngredients(
  groupedIngredients: ReadonlyMap<string, ReadonlyArray<IngredientProps>>,
  query: string,
): Array<[string, ReadonlyArray<IngredientProps>]> {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) {
    return [...groupedIngredients.entries()];
  }

  const result: Array<[string, ReadonlyArray<IngredientProps>]> = [];
  const searchPredicate = createIngredientSearchPredicate(lowerQuery);

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
