import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_RECIPE } from '../app/constants';
import { errorHandler, ingredientRegistry, logger, storage } from '../app/container';
import { updateAndValidate, validateSpices } from '../helpers/spiceHelper';
import { isArrayEqual } from '../utilities/objectUtil';
import { createListHandlers, createSetHandlers, persistStore } from '../utilities/storeUtil';
import { useIngredientStore } from './useIngredientStore';
import { useNotificationStore } from './useNotificationStore';
import { useSettingStore } from './useSettingStore';

import type { IngredientItem, SpiceValue } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly editingIds: Set<string>;
  readonly ingredients: ReadonlyArray<IngredientItem>;
  readonly ingredientsMap: ReadonlyMap<string, IngredientItem>;
  readonly pausedIngredientIds: Set<string>;
  readonly addIngredient: (ingredientId: string, initialSpices?: Readonly<Record<string, unknown>>) => void;
  readonly clearEditingIds: () => void;
  readonly clearRecipe: () => void;
  readonly getActiveRecipeId: () => string | null;
  readonly init: () => void;
  readonly removeIngredient: (id: string) => void;
  readonly reorderIngredients: (draggedId: string, targetId: string) => void;
  readonly setActiveRecipeId: (id: string | null) => void;
  readonly toggleEditingId: (id: string) => void;
  readonly setRecipe: (ingredients: ReadonlyArray<IngredientItem>, activeRecipeId: string | null) => void;
  readonly toggleIngredientPause: (id: string) => void;
  readonly updateSpice: (id: string, spiceId: string, rawValue: SpiceValue) => void;
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set, get) => {
    const editingHandlers = createSetHandlers<RecipeState, 'editingIds', string>(set, 'editingIds');
    const pausedHandlers = createSetHandlers<RecipeState, 'pausedIngredientIds', string>(set, 'pausedIngredientIds');

    const ingredientHandlers = createListHandlers<RecipeState, 'ingredients', 'ingredientsMap', 'id', IngredientItem>(
      set,
      'ingredients',
      'ingredientsMap',
      'id',
    );

    return {
      activeRecipeId: null,
      editingIds: new Set(),
      ingredients: [],
      ingredientsMap: new Map(),
      pausedIngredientIds: new Set(),

      addIngredient: (ingredientId, initialSpices) => {
        const ingredientDefinition = ingredientRegistry.get(ingredientId);
        errorHandler.assert(ingredientDefinition, `Ingredient definition not found for ID: ${ingredientId}`, 'Recipe Add Ingredient', {
          genericMessage: `Ingredient "${ingredientId}" could not be added because its definition is missing.`,
        });

        const validSpices = validateSpices(ingredientDefinition, initialSpices || {});
        const newIngredient: IngredientItem = {
          id: crypto.randomUUID(),
          ingredientId: ingredientDefinition.id,
          name: ingredientDefinition.name,
          spices: validSpices,
        };

        ingredientHandlers.upsert(newIngredient);
      },

      clearEditingIds: editingHandlers.clear,

      clearRecipe: () => {
        ingredientHandlers.clear();
        set({ activeRecipeId: null });
        editingHandlers.clear();
        pausedHandlers.clear();
      },

      getActiveRecipeId: () => {
        return get().activeRecipeId;
      },

      init: () => {
        if (useSettingStore.getState().persistRecipe) {
          const stored = storage.get<{
            ingredients: ReadonlyArray<IngredientItem>;
            activeRecipeId: string | null;
          }>(STORAGE_RECIPE, 'Current Recipe');

          if (stored && Array.isArray(stored.ingredients)) {
            get().setRecipe(stored.ingredients, stored.activeRecipeId);
          }
        }
      },

      removeIngredient: (id) => {
        const { ingredients, activeRecipeId } = get();
        ingredientHandlers.remove(id);

        if (get().ingredients.length === ingredients.length) {
          logger.warn(`Attempted to remove non-existent ingredient with id: ${id}`);
          return;
        }

        editingHandlers.remove(id);
        pausedHandlers.remove(id);

        if (get().ingredients.length === 0 && activeRecipeId) {
          set({ activeRecipeId: null });
        }
      },

      reorderIngredients: ingredientHandlers.reorder,

      setActiveRecipeId: (activeRecipeId) => {
        set({
          activeRecipeId: activeRecipeId,
        });
      },

      setRecipe: (ingredients, activeRecipeId = null) => {
        const validIngredients = ingredients.map((ingredient) => {
          const ingredientDefinition = ingredientRegistry.get(ingredient.ingredientId);
          if (ingredientDefinition) {
            const validatedSpices = validateSpices(ingredientDefinition, ingredient.spices);
            return { ...ingredient, spices: validatedSpices };
          }
          logger.warn(
            `Ingredient definition not found for ID "${ingredient.ingredientId}" (${ingredient.name}) during setRecipe. Options may not be correctly validated.`,
          );
          return ingredient;
        });

        ingredientHandlers.setAll(validIngredients);
        set({
          activeRecipeId: activeRecipeId,
          editingIds: new Set(),
          pausedIngredientIds: new Set(),
        });
      },

      toggleEditingId: (id) => {
        if (useSettingStore.getState().multipleOpen) {
          editingHandlers.toggle(id);
        } else {
          set((state) => ({ editingIds: state.editingIds.has(id) ? new Set() : new Set([id]) }));
        }
      },

      toggleIngredientPause: pausedHandlers.toggle,

      updateSpice: (id, spiceId, rawValue) => {
        const { ingredientsMap } = get();
        const ingredientToUpdate = ingredientsMap.get(id);
        errorHandler.assert(ingredientToUpdate, `Ingredient with ID "${id}" not found for spice change.`, 'Recipe Change Spice');

        const ingredientDefinition = ingredientRegistry.get(ingredientToUpdate.ingredientId);
        errorHandler.assert(
          ingredientDefinition,
          `Ingredient definition not found for ID "${ingredientToUpdate.ingredientId}".`,
          'Recipe Change Spice',
        );

        const isSpiceInDefinition = ingredientDefinition.spices?.some((s) => s.id === spiceId);
        errorHandler.assert(
          isSpiceInDefinition,
          `Spice with ID "${spiceId}" is not a valid spice for ingredient "${ingredientDefinition.name}".`,
          'Recipe Change Spice',
          {
            genericMessage: `An internal error occurred while updating options for "${ingredientDefinition.name}".`,
          },
        );

        const newValidSpices = updateAndValidate(ingredientDefinition, ingredientToUpdate.spices, spiceId, rawValue);
        ingredientHandlers.upsert({ ...ingredientToUpdate, spices: newValidSpices });
      },
    };
  }),
);

useIngredientStore.subscribe(
  (state) => state.registryVersion,
  () => {
    const { ingredients, setRecipe, activeRecipeId } = useRecipeStore.getState();
    const updatedIngredients = ingredients.filter((ing) => !!ingredientRegistry.get(ing.ingredientId));

    if (updatedIngredients.length < ingredients.length) {
      useNotificationStore
        .getState()
        .show(
          `${ingredients.length - updatedIngredients.length} ingredient(s) were removed from your recipe because their extension was uninstalled.`,
          'info',
          'Recipe Updated',
        );
      setRecipe(updatedIngredients, activeRecipeId);
    }
  },
);

persistStore(useRecipeStore, {
  key: STORAGE_RECIPE,
  context: 'Current Recipe',
  pick: (state) => ({
    ingredients: state.ingredients,
    activeRecipeId: state.activeRecipeId,
  }),
  equalityFn: (a, b) => a.activeRecipeId === b.activeRecipeId && isArrayEqual(a.ingredients, b.ingredients),
  shouldPersist: () => useSettingStore.getState().persistRecipe,
});
