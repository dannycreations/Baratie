import type { IngredientProps } from '../core/IngredientRegistry';

const ingredientSortFn = (a: IngredientProps, b: IngredientProps): number => a.name.localeCompare(b.name);
const categorySortFn = ([catA]: readonly [string, unknown], [catB]: readonly [string, unknown]): number => catA.localeCompare(catB);

export interface ProcessedIngredients {
  readonly favorites: ReadonlyArray<IngredientProps>;
  readonly categories: ReadonlyMap<string, ReadonlyArray<IngredientProps>>;
  readonly visibleCount: number;
}

export function processIngredients(
  allIngredients: ReadonlyArray<IngredientProps>,
  favoriteNames: ReadonlySet<string>,
  disabledCategories: ReadonlySet<string>,
  disabledIngredients: ReadonlySet<string>,
): ProcessedIngredients {
  const favorites: Array<IngredientProps> = [];
  const grouped = new Map<string, Array<IngredientProps>>();
  let visibleCount = 0;

  for (const ingredient of allIngredients) {
    const uniqueName = ingredient.id || ingredient.name;
    if (!disabledCategories.has(ingredient.category) && !disabledIngredients.has(uniqueName)) {
      visibleCount++;
      if (favoriteNames.has(uniqueName)) {
        favorites.push(ingredient);
      } else {
        const categoryList = grouped.get(ingredient.category);
        if (categoryList) {
          categoryList.push(ingredient);
        } else {
          grouped.set(ingredient.category, [ingredient]);
        }
      }
    }
  }

  favorites.sort(ingredientSortFn);

  for (const categoryIngredients of grouped.values()) {
    categoryIngredients.sort(ingredientSortFn);
  }
  const sortedEntries = [...grouped.entries()].sort(categorySortFn);

  return {
    favorites,
    categories: new Map(sortedEntries),
    visibleCount,
  };
}

export function groupAndSortIngredients(ingredients: ReadonlyArray<IngredientProps>): ReadonlyMap<string, ReadonlyArray<IngredientProps>> {
  return processIngredients(ingredients, new Set<string>(), new Set<string>(), new Set<string>()).categories;
}

export function searchGroupedIngredients(
  groupedIngredients: ReadonlyMap<string, ReadonlyArray<IngredientProps>>,
  lowerQuery: string,
): Array<[string, ReadonlyArray<IngredientProps>]> {
  if (!lowerQuery) {
    return Array.from(groupedIngredients.entries());
  }

  const result: Array<[string, ReadonlyArray<IngredientProps>]> = [];
  const searchPredicate = (ing: IngredientProps): boolean =>
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
