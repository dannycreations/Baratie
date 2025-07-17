import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_CATEGORIES, STORAGE_INGREDIENTS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface IngredientState {
  readonly closeModal: () => void;
  readonly disabledCategories: readonly symbol[];
  readonly disabledIngredients: readonly symbol[];
  readonly isModalOpen: boolean;
  readonly openModal: () => void;
  readonly refreshRegistry: () => void;
  readonly registryVersion: number;
  readonly setFilters: (filters: { readonly categories: readonly symbol[]; readonly ingredients: readonly symbol[] }) => void;
  readonly toggleCategory: (category: symbol) => void;
  readonly toggleIngredient: (id: symbol) => void;
}

export const useIngredientStore = create<IngredientState>()(
  subscribeWithSelector((set) => ({
    disabledCategories: [],
    disabledIngredients: [],
    isModalOpen: false,
    registryVersion: 0,

    closeModal() {
      set({ isModalOpen: false });
    },

    openModal() {
      set({ isModalOpen: true });
    },

    refreshRegistry() {
      set((state) => ({ registryVersion: state.registryVersion + 1 }));
    },

    setFilters({ categories, ingredients }) {
      set({ disabledCategories: categories, disabledIngredients: ingredients });
    },

    toggleCategory(category) {
      set((state) => ({
        disabledCategories: state.disabledCategories.includes(category)
          ? state.disabledCategories.filter((existing) => existing !== category)
          : [...state.disabledCategories, category],
      }));
    },

    toggleIngredient(id) {
      set((state) => ({
        disabledIngredients: state.disabledIngredients.includes(id)
          ? state.disabledIngredients.filter((existing) => existing !== id)
          : [...state.disabledIngredients, id],
      }));
    },
  })),
);

useIngredientStore.subscribe(
  (state) => state.disabledCategories,
  (categories) => {
    const categoryStrings = categories.map((cat) => cat.description).filter((desc): desc is string => !!desc);
    storage.set(STORAGE_CATEGORIES, categoryStrings, 'Disabled Categories');
  },
);

useIngredientStore.subscribe(
  (state) => state.disabledIngredients,
  (ingredients) => {
    const ingredientStrings = ingredients.map((ing) => ingredientRegistry.getStringFromSymbol(ing)).filter((str): str is string => !!str);
    storage.set(STORAGE_INGREDIENTS, ingredientStrings, 'Disabled Ingredients');
  },
);
