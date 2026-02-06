import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FILTERS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';
import { shallowEqual, toggleSetItem } from '../utilities/objectUtil';

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
      const validCategories = (filters?.categories ?? []).filter((c: unknown) => {
        return typeof c === 'string' && allCategories.has(c);
      }) as string[];
      const validIngredients = (filters?.ingredients ?? []).filter((i: unknown) => {
        return typeof i === 'string' && !!ingredientRegistry.get(i);
      }) as string[];

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
      set((state) => ({
        disabledCategories: toggleSetItem(state.disabledCategories, category),
      }));
    },

    toggleIngredient: (id) => {
      set((state) => ({
        disabledIngredients: toggleSetItem(state.disabledIngredients, id),
      }));
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
    equalityFn: shallowEqual,
  },
);
