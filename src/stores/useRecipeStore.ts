import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { STORAGE_RECIPE } from '../app/constants';
import { errorHandler, ingredientRegistry, logger, storage } from '../app/container';
import { updateAndValidate, validateSpices } from '../helpers/spiceHelper';
import { toggleSetItem } from '../utilities/objectUtil';
import { persistStore } from '../utilities/storeUtil';
import { useIngredientStore } from './useIngredientStore';
import { useNotificationStore } from './useNotificationStore';
import { useSettingStore } from './useSettingStore';

import type { IngredientItem, SpiceValue } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly editingIds: Set<string>;
  readonly ingredients: ReadonlyArray<IngredientItem>;
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
  subscribeWithSelector((set, get) => ({
    activeRecipeId: null,
    editingIds: new Set(),
    ingredients: [],
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

      set((state) => ({ ingredients: [...state.ingredients, newIngredient] }));
    },

    clearEditingIds: () => {
      set({ editingIds: new Set() });
    },

    clearRecipe: () => {
      set({
        activeRecipeId: null,
        ingredients: [],
        editingIds: new Set(),
        pausedIngredientIds: new Set(),
      });
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
      set((state) => {
        const newIngredients = state.ingredients.filter((ingredient) => ingredient.id !== id);

        if (newIngredients.length === state.ingredients.length) {
          logger.warn(`Attempted to remove non-existent ingredient with id: ${id}`);
          return state;
        }

        const newEditingIds = new Set(state.editingIds);
        newEditingIds.delete(id);

        const newPausedIds = new Set(state.pausedIngredientIds);
        newPausedIds.delete(id);

        return {
          ingredients: newIngredients,
          activeRecipeId: newIngredients.length > 0 ? state.activeRecipeId : null,
          editingIds: newEditingIds,
          pausedIngredientIds: newPausedIds,
        };
      });
    },

    reorderIngredients: (draggedId, targetId) => {
      set((state) => {
        const { ingredients } = state;
        const draggedIndex = ingredients.findIndex((ingredient) => ingredient.id === draggedId);
        const targetIndex = ingredients.findIndex((ingredient) => ingredient.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
          return state;
        }

        const newIngredients = [...ingredients];
        const [draggedItem] = newIngredients.splice(draggedIndex, 1);
        newIngredients.splice(targetIndex, 0, draggedItem);

        return {
          ingredients: newIngredients,
        };
      });
    },

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

      set({
        activeRecipeId: activeRecipeId,
        ingredients: validIngredients,
        editingIds: new Set(),
        pausedIngredientIds: new Set(),
      });
    },

    toggleEditingId: (id) => {
      set((state) => {
        const { multipleOpen } = useSettingStore.getState();
        const newEditingIds = new Set(state.editingIds);
        const isCurrentlyEditing = newEditingIds.has(id);

        const nextEditingIds = toggleSetItem(state.editingIds, id, isCurrentlyEditing ? false : undefined);
        if (!isCurrentlyEditing && !multipleOpen) {
          nextEditingIds.clear();
          nextEditingIds.add(id);
        }

        return { editingIds: nextEditingIds };
      });
    },

    toggleIngredientPause: (id) => {
      set((state) => ({
        pausedIngredientIds: toggleSetItem(state.pausedIngredientIds, id),
      }));
    },

    updateSpice: (id, spiceId, rawValue) => {
      set((state) => {
        const { ingredients } = state;
        const index = ingredients.findIndex((ingredient) => ingredient.id === id);
        errorHandler.assert(index !== -1, `Ingredient with ID "${id}" not found for spice change.`, 'Recipe Change Spice');

        const ingredientToUpdate = ingredients[index];
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
        const updatedIngredient = { ...ingredientToUpdate, spices: newValidSpices };
        const newIngredients = [...ingredients];
        newIngredients[index] = updatedIngredient;

        return {
          ingredients: newIngredients,
        };
      });
    },
  })),
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
  shouldPersist: () => useSettingStore.getState().persistRecipe,
});
