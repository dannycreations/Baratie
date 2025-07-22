import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_CATEGORIES, STORAGE_INGREDIENTS } from '../app/constants';
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

function loadFilters(key: string, forCategories: boolean): Array<string> {
  const storedItems = storage.get<Array<string>>(key, 'Ingredient Filters');
  if (!Array.isArray(storedItems)) {
    return [];
  }

  const validatedItems = storedItems.filter((item): item is string => typeof item === 'string');

  if (forCategories) {
    const allCategories = ingredientRegistry.getAllCategories();
    return validatedItems.filter((item) => allCategories.has(item));
  }

  return validatedItems.filter((item) => !!ingredientRegistry.getIngredient(item));
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
      const disabledCategories = loadFilters(STORAGE_CATEGORIES, true);
      const disabledIngredients = loadFilters(STORAGE_INGREDIENTS, false);
      set({
        disabledCategories: new Set(disabledCategories),
        disabledIngredients: new Set(disabledIngredients),
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
      set((state) => {
        const newDisabledCategories = new Set(state.disabledCategories);
        if (newDisabledCategories.has(category)) {
          newDisabledCategories.delete(category);
        } else {
          newDisabledCategories.add(category);
        }
        return { disabledCategories: newDisabledCategories };
      });
    },
    toggleIngredient: (id) => {
      set((state) => {
        const newDisabledIngredients = new Set(state.disabledIngredients);
        if (newDisabledIngredients.has(id)) {
          newDisabledIngredients.delete(id);
        } else {
          newDisabledIngredients.add(id);
        }
        return { disabledIngredients: newDisabledIngredients };
      });
    },
  })),
);

useIngredientStore.subscribe(
  (state) => state.disabledCategories,
  (categories) => {
    storage.set(STORAGE_CATEGORIES, Array.from(categories), 'Disabled Categories');
  },
);

useIngredientStore.subscribe(
  (state) => state.disabledIngredients,
  (ingredients) => {
    storage.set(STORAGE_INGREDIENTS, Array.from(ingredients), 'Disabled Ingredients');
  },
);
