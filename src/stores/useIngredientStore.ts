import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FILTERS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

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
  subscribeWithSelector((set) => ({
    disabledCategories: new Set(),
    disabledIngredients: new Set(),
    registryVersion: 0,

    init: () => {
      const filters = storage.get<{
        readonly categories?: ReadonlyArray<string>;
        readonly ingredients?: ReadonlyArray<string>;
      }>(STORAGE_FILTERS, 'Ingredient Filters');

      const allCategories = ingredientRegistry.getAllCategories();
      const validCategories = (filters?.categories ?? []).filter((c) => {
        return typeof c === 'string' && allCategories.has(c);
      });
      const validIngredients = (filters?.ingredients ?? []).filter((i) => {
        return typeof i === 'string' && !!ingredientRegistry.get(i);
      });

      set({
        disabledCategories: new Set(validCategories),
        disabledIngredients: new Set(validIngredients),
      });
    },

    refreshRegistry: () => {
      set((state) => ({ registryVersion: state.registryVersion + 1 }));
    },

    setFilters: ({ categories, ingredients }) => {
      set({
        disabledCategories: new Set(categories),
        disabledIngredients: new Set(ingredients),
      });
    },

    toggleCategory: (category) => {
      set((state) => {
        const disabledCategories = new Set(state.disabledCategories);
        if (disabledCategories.has(category)) {
          disabledCategories.delete(category);
        } else {
          disabledCategories.add(category);
        }
        return { disabledCategories };
      });
    },

    toggleIngredient: (id) => {
      set((state) => {
        const disabledIngredients = new Set(state.disabledIngredients);
        if (disabledIngredients.has(id)) {
          disabledIngredients.delete(id);
        } else {
          disabledIngredients.add(id);
        }
        return { disabledIngredients };
      });
    },
  })),
);

useIngredientStore.subscribe(
  (state) => ({ disabledCategories: state.disabledCategories, disabledIngredients: state.disabledIngredients }),
  ({ disabledCategories, disabledIngredients }) => {
    storage.set(
      STORAGE_FILTERS,
      {
        categories: [...disabledCategories],
        ingredients: [...disabledIngredients],
      },
      'Ingredient Filters',
    );
  },
  {
    equalityFn: (a, b) => a.disabledCategories === b.disabledCategories && a.disabledIngredients === b.disabledIngredients,
  },
);
