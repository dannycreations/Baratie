import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FILTERS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';
import { createSetHandlers, persistStore } from '../utilities/storeUtil';

interface IngredientState {
  readonly disabledCategories: ReadonlySet<string>;
  readonly disabledIngredients: ReadonlySet<string>;
  readonly registryVersion: number;
  readonly init: () => void;
  readonly refreshRegistry: () => void;
  readonly setFilters: (filters: Readonly<{ categories: ReadonlyArray<string>; ingredients: ReadonlyArray<string> }>) => void;
  readonly toggleCategory: (category: string) => void;
  readonly toggleIngredient: (id: string) => void;
}

export const useIngredientStore = create<IngredientState>()(
  subscribeWithSelector((set) => {
    const categoryHandlers = createSetHandlers<IngredientState, 'disabledCategories', string>(set, 'disabledCategories');
    const ingredientHandlers = createSetHandlers<IngredientState, 'disabledIngredients', string>(set, 'disabledIngredients');

    return {
      disabledCategories: new Set(),
      disabledIngredients: new Set(),
      registryVersion: 0,

      init: () => {
        const filters = storage.get<{
          readonly categories?: ReadonlyArray<string>;
          readonly ingredients?: ReadonlyArray<string>;
        }>(STORAGE_FILTERS, 'Ingredient Filters');

        const allCategories = ingredientRegistry.getAllCategories();
        const validCategories = (filters?.categories ?? []).filter((c: unknown) => typeof c === 'string' && allCategories.has(c)) as string[];
        const validIngredients = (filters?.ingredients ?? []).filter(
          (i: unknown) => typeof i === 'string' && !!ingredientRegistry.get(i),
        ) as string[];

        categoryHandlers.set(validCategories);
        ingredientHandlers.set(validIngredients);
      },

      refreshRegistry: () => {
        set((state) => ({ registryVersion: state.registryVersion + 1 }));
      },

      setFilters: ({ categories, ingredients }) => {
        categoryHandlers.set(categories as string[]);
        ingredientHandlers.set(ingredients as string[]);
      },

      toggleCategory: categoryHandlers.toggle,
      toggleIngredient: ingredientHandlers.toggle,
    };
  }),
);

persistStore(useIngredientStore, {
  key: STORAGE_FILTERS,
  context: 'Ingredient Filters',
  pick: (state) => ({
    categories: [...state.disabledCategories],
    ingredients: [...state.disabledIngredients],
  }),
});
