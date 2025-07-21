import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_CATEGORIES, STORAGE_INGREDIENTS } from '../app/constants';
import { ingredientRegistry, storage } from '../app/container';

interface IngredientState {
  readonly init: () => void;
  readonly closeModal: () => void;
  readonly disabledCategories: ReadonlySet<symbol>;
  readonly disabledIngredients: ReadonlySet<symbol>;
  readonly isModalOpen: boolean;
  readonly openModal: () => void;
  readonly refreshRegistry: () => void;
  readonly registryVersion: number;
  readonly setFilters: (filters: { readonly categories: readonly symbol[]; readonly ingredients: readonly symbol[] }) => void;
  readonly toggleCategory: (category: symbol) => void;
  readonly toggleIngredient: (id: symbol) => void;
}

function loadFilters(key: string, forCategories: boolean): symbol[] {
  const storedItems = storage.get(key, 'Ingredient Filters');
  if (!Array.isArray(storedItems)) {
    return [];
  }

  const validatedItems = storedItems.filter((item): item is string => typeof item === 'string');

  if (forCategories) {
    const allCategorySymbols = ingredientRegistry.getAllCategories();
    return validatedItems.reduce<symbol[]>((acc, item) => {
      const symbol = allCategorySymbols.get(item);
      if (symbol) {
        acc.push(symbol);
      }
      return acc;
    }, []);
  }

  return validatedItems.reduce<symbol[]>((acc, item) => {
    const symbol = ingredientRegistry.getSymbolFromString(item);
    if (symbol) {
      acc.push(symbol);
    }
    return acc;
  }, []);
}

export const useIngredientStore = create<IngredientState>()(
  subscribeWithSelector((set) => ({
    disabledCategories: new Set(),
    disabledIngredients: new Set(),
    isModalOpen: false,
    registryVersion: 0,

    init: () => {
      const disabledCategories = loadFilters(STORAGE_CATEGORIES, true);
      const disabledIngredients = loadFilters(STORAGE_INGREDIENTS, false);
      set({ disabledCategories: new Set(disabledCategories), disabledIngredients: new Set(disabledIngredients) });
    },

    closeModal: () => {
      set({ isModalOpen: false });
    },

    openModal: () => {
      set({ isModalOpen: true });
    },

    refreshRegistry: () => {
      set((state) => ({ registryVersion: state.registryVersion + 1 }));
    },

    setFilters: ({ categories, ingredients }) => {
      set({ disabledCategories: new Set(categories), disabledIngredients: new Set(ingredients) });
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
    const categoryStrings = Array.from(categories)
      .map((cat) => cat.description)
      .filter((desc): desc is string => !!desc);
    storage.set(STORAGE_CATEGORIES, categoryStrings, 'Disabled Categories');
  },
);

useIngredientStore.subscribe(
  (state) => state.disabledIngredients,
  (ingredients) => {
    const ingredientStrings = Array.from(ingredients)
      .map((ing) => ingredientRegistry.getStringFromSymbol(ing))
      .filter((str): str is string => !!str);
    storage.set(STORAGE_INGREDIENTS, ingredientStrings, 'Disabled Ingredients');
  },
);
