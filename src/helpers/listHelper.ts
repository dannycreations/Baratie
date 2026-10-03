export const createSearchPredicate = <T extends { readonly name: string; readonly description: string }>(query: string): ((item: T) => boolean) => {
  const lowerQuery = query.toLowerCase().trim();

  return (item: T): boolean => {
    return item.name.toLowerCase().includes(lowerQuery) || item.description.toLowerCase().includes(lowerQuery);
  };
};

export const groupAndFilterList = <
  T extends {
    readonly name: string;
    readonly description: string;
  },
>(
  items: ReadonlyArray<T>,
  getCategory: (item: T) => string,
  query: string,
): Array<[string, Array<T>]> => {
  const lowerQuery = query.toLowerCase().trim();
  const matchesItem = createSearchPredicate<T>(query);
  const grouped = new Map<string, Array<T>>();

  for (const item of items) {
    const category = getCategory(item);
    const categoryMatches = !lowerQuery || category.toLowerCase().includes(lowerQuery);

    if (!categoryMatches && !matchesItem(item)) {
      continue;
    }

    const categoryItems = grouped.get(category);
    if (categoryItems) {
      categoryItems.push(item);
    } else {
      grouped.set(category, [item]);
    }
  }

  return [...grouped.entries()].sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB));
};
