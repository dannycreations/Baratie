import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FILTERS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface IngredientState {
  readonly disabledCategories: ReadonlySet<string>;
  readonly disabledIngredients: ReadonlySet<string>;
  readonly isModalOpen: boolean;
  readonly registryVersion: number;
  readonly closeModal: () => void;
  readonly init: () => void;
  readonly openModal: () => void;
  readonly refreshRegistry: () => void;
  readonly setFilters: (filters: { readonly categories: ReadonlyArray<string>; readonly ingredients: ReadonlyArray<string> }) => void;
  readonly toggleCategory: (category: string) => void;
  readonly toggleIngredient: (id: string) => void;
}

function toggleSetItem<T>(set: ReadonlySet<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

export const useIngredientStore = create<IngredientState>()(
  subscribeWithSelector((set) => ({
    disabledCategories: new Set(),
    disabledIngredients: new Set(),
    isModalOpen: false,
    registryVersion: 0,
    closeModal: () => {
      set({ isModalOpen: false });
    },
    init: () => {
      const filters = storage.get<{
        readonly categories?: ReadonlyArray<string>;
        readonly ingredients?: ReadonlyArray<string>;
      }>(STORAGE_FILTERS, 'Ingredient Filters');

      const allCategories = ingredientRegistry.getAllCategories();
      const validCategories = (filters?.categories ?? []).filter((c) => typeof c === 'string' && allCategories.has(c));
      const validIngredients = (filters?.ingredients ?? []).filter((i) => typeof i === 'string' && ingredientRegistry.getIngredient(i));

      set({
        disabledCategories: new Set(validCategories),
        disabledIngredients: new Set(validIngredients),
      });
    },
    openModal: () => {
      set({ isModalOpen: true });
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
      set((state) => ({ disabledCategories: toggleSetItem(state.disabledCategories, category) }));
    },
    toggleIngredient: (id) => {
      set((state) => ({ disabledIngredients: toggleSetItem(state.disabledIngredients, id) }));
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
