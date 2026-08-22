export const groupListByCategory = <T>(items: ReadonlyArray<T>, getCategory: (item: T) => string): Array<[string, Array<T>]> => {
  const grouped = new Map<string, Array<T>>();

  for (const item of items) {
    const category = getCategory(item);
    const categoryItems = grouped.get(category);
    if (categoryItems) {
      categoryItems.push(item);
    } else {
      grouped.set(category, [item]);
    }
  }

  return [...grouped.entries()].sort(([categoryA], [categoryB]) => categoryA.localeCompare(categoryB));
};

export const filterGroupedList = <T>(
  groups: ReadonlyArray<readonly [string, ReadonlyArray<T>]>,
  query: string,
  matchesItem: (item: T) => boolean,
): Array<[string, Array<T>]> => {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) {
    return groups.map(([category, items]) => [category, [...items]]);
  }

  const result: Array<[string, Array<T>]> = [];

  for (const [category, items] of groups) {
    if (category.toLowerCase().includes(lowerQuery)) {
      result.push([category, [...items]]);
      continue;
    }

    const matchingItems = items.filter(matchesItem);
    if (matchingItems.length > 0) {
      result.push([category, matchingItems]);
    }
  }

  return result;
};
