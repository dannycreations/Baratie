import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_CATEGORIES, STORAGE_INGREDIENTS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface IngredientState {
  readonly disabledCategories: readonly symbol[];
  readonly disabledIngredients: readonly symbol[];
  readonly isModalOpen: boolean;
  readonly registryVersion: number;
  readonly closeModal: () => void;
  readonly openModal: () => void;
  readonly refreshRegistry: () => void;
  readonly setFilters: (filters: { readonly categories: readonly symbol[]; readonly ingredients: readonly symbol[] }) => void;
  readonly toggleCategory: (category: symbol) => void;
  readonly toggleIngredient: (id: symbol) => void;
}

function selectIngredientFilters(state: IngredientState): {
  readonly disabledCategories: readonly symbol[];
  readonly disabledIngredients: readonly symbol[];
} {
  return { disabledCategories: state.disabledCategories, disabledIngredients: state.disabledIngredients };
}

function saveIngredientFiltersToStorage(filters: {
  readonly disabledCategories: readonly symbol[];
  readonly disabledIngredients: readonly symbol[];
}): void {
  const categoryStrings = filters.disabledCategories.map((cat) => cat.description).filter((desc): desc is string => desc != null);
  const ingredientStrings = filters.disabledIngredients
    .map((ing) => ingredientRegistry.getStringFromSymbol(ing))
    .filter((str): str is string => str != null);

  storage.set(STORAGE_CATEGORIES, categoryStrings, 'Disabled Categories');
  storage.set(STORAGE_INGREDIENTS, ingredientStrings, 'Disabled Ingredients');
}

export const useIngredientStore = create<IngredientState>()(
  subscribeWithSelector(function (set) {
    return {
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
    };
  }),
);

useIngredientStore.subscribe(selectIngredientFilters, saveIngredientFiltersToStorage);
