import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_FILTERS } from '../app/constants';
import { ingredientRegistry } from '../app/container';
import { filterExistingIngredients } from '../helpers/ingredientHelper';
import { isArrayEqual } from '../utilities/objectUtil';
import { createSetHandlers, persistStore } from '../utilities/storeUtil';

interface IngredientState {
  readonly disabledCategories: ReadonlySet<string>;
  readonly disabledIngredients: ReadonlySet<string>;
  readonly registryVersion: number;
  readonly isHydrated: boolean;
  readonly init: () => void;
  readonly refreshRegistry: () => void;
  readonly toggleCategory: (category: string) => void;
  readonly toggleIngredient: (id: string) => void;
}

export const useIngredientStore = create<IngredientState>()(
  subscribeWithSelector((set, get) => {
    const categoryHandlers = createSetHandlers<IngredientState, 'disabledCategories', string>(set, 'disabledCategories');
    const ingredientHandlers = createSetHandlers<IngredientState, 'disabledIngredients', string>(set, 'disabledIngredients');

    return {
      disabledCategories: new Set(),
      disabledIngredients: new Set(),
      registryVersion: 0,
      isHydrated: false,

      init: () => {
        const { disabledCategories, disabledIngredients } = get();
        const allCategories = ingredientRegistry.getAllCategories();

        const validCategories = [...disabledCategories].filter((c) => allCategories.has(c));
        const validIngredients = filterExistingIngredients([...disabledIngredients].map((id) => ({ ingredientId: id }))).map((i) => i.ingredientId);

        categoryHandlers.set(validCategories);
        ingredientHandlers.set(validIngredients);
      },

      refreshRegistry: () => {
        set((state) => ({ registryVersion: state.registryVersion + 1 }));
      },

      toggleCategory: categoryHandlers.toggle,
      toggleIngredient: ingredientHandlers.toggle,
    };
  }),
);

persistStore(useIngredientStore, {
  key: STORAGE_FILTERS,
  context: 'Ingredient Filters',
  autoHydrate: true,
  pick: (state) => ({
    disabledCategories: [...state.disabledCategories],
    disabledIngredients: [...state.disabledIngredients],
  }),
  onHydrate: (state) => {
    useIngredientStore.setState({
      disabledCategories: new Set(state.disabledCategories),
      disabledIngredients: new Set(state.disabledIngredients),
      isHydrated: true,
    });
  },
  equalityFn: (a, b) => isArrayEqual(a.disabledCategories, b.disabledCategories) && isArrayEqual(a.disabledIngredients, b.disabledIngredients),
});
