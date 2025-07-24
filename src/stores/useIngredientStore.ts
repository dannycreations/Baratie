import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FILTERS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';
import { useModalStore } from './useModalStore';

interface IngredientState {
  readonly disabledCategories: ReadonlySet<string>;
  readonly disabledIngredients: ReadonlySet<string>;
  readonly registryVersion: number;
  readonly init: () => void;
  readonly openModal: () => void;
  readonly refreshRegistry: () => void;
  readonly setFilters: (filters: { readonly categories: ReadonlyArray<string>; readonly ingredients: ReadonlyArray<string> }) => void;
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
        return typeof i === 'string' && !!ingredientRegistry.getIngredient(i);
      });

      set({
        disabledCategories: new Set(validCategories),
        disabledIngredients: new Set(validIngredients),
      });
    },

    openModal: () => {
      useModalStore.getState().openModal('ingredientManager', undefined);
    },

    refreshRegistry: () => {
      set((state) => {
        return {
          registryVersion: state.registryVersion + 1,
        };
      });
    },

    setFilters: ({ categories, ingredients }) => {
      set({
        disabledCategories: new Set(categories),
        disabledIngredients: new Set(ingredients),
      });
    },

    toggleCategory: (category) => {
      set((state) => {
        const newSet = new Set(state.disabledCategories);
        if (newSet.has(category)) {
          newSet.delete(category);
        } else {
          newSet.add(category);
        }
        return {
          disabledCategories: newSet,
        };
      });
    },

    toggleIngredient: (id) => {
      set((state) => {
        const newSet = new Set(state.disabledIngredients);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return {
          disabledIngredients: newSet,
        };
      });
    },
  })),
);

let lastCategories = useIngredientStore.getState().disabledCategories;
let lastIngredients = useIngredientStore.getState().disabledIngredients;

useIngredientStore.subscribe((state) => {
  const { disabledCategories, disabledIngredients } = state;
  if (disabledCategories !== lastCategories || disabledIngredients !== lastIngredients) {
    storage.set(
      STORAGE_FILTERS,
      {
        categories: Array.from(disabledCategories),
        ingredients: Array.from(disabledIngredients),
      },
      'Ingredient Filters',
    );
    lastCategories = disabledCategories;
    lastIngredients = disabledIngredients;
  }
});
