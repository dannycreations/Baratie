import type { IngredientProps } from '../core/IngredientRegistry';

const categorySortFn = ([catA]: readonly [string, unknown], [catB]: readonly [string, unknown]): number => catA.localeCompare(catB);

export interface ProcessedIngredients {
  readonly favorites: ReadonlyArray<IngredientProps>;
  readonly categories: ReadonlyMap<string, ReadonlyArray<IngredientProps>>;
  readonly visibleCount: number;
}

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

export function processIngredients(
  allIngredients: ReadonlyArray<IngredientProps>,
  favoriteNames: ReadonlySet<string>,
  disabledCategories: ReadonlySet<string>,
  disabledIngredients: ReadonlySet<string>,
): ProcessedIngredients {
  const favorites: Array<IngredientProps> = [];
  const others: Array<IngredientProps> = [];
  let visibleCount = 0;

  for (const ingredient of allIngredients) {
    if (!disabledCategories.has(ingredient.category) && !disabledIngredients.has(ingredient.id)) {
      visibleCount++;
      if (favoriteNames.has(ingredient.id)) {
        favorites.push(ingredient);
      } else {
        others.push(ingredient);
      }
    }
  }

  return {
    favorites,
    categories: groupAndSortIngredients(others),
    visibleCount,
  };
}

export function searchGroupedIngredients(
  groupedIngredients: ReadonlyMap<string, ReadonlyArray<IngredientProps>>,
  lowerQuery: string,
): Array<[string, ReadonlyArray<IngredientProps>]> {
  if (!lowerQuery) {
    return Array.from(groupedIngredients.entries());
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
