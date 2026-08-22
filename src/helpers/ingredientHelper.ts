import { ingredientRegistry } from '../app/container';

import type { IngredientProps } from '../core/IngredientRegistry';

export const createIngredientSearchPredicate = (query: string): ((ing: IngredientProps) => boolean) => {
  const lowerQuery = query.toLowerCase().trim();

  return (ing: IngredientProps): boolean => {
    return ing.name.toLowerCase().includes(lowerQuery) || ing.description.toLowerCase().includes(lowerQuery);
  };
};

export const getExistingIngredientIds = (ids: ReadonlyArray<string>): Array<string> => {
  return ids.filter((id) => !!ingredientRegistry.get(id));
};
