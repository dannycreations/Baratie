import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { updateAndValidate, validateSpices } from '../helpers/spiceHelper';
import { useSettingStore } from './useSettingStore';

import type { IngredientItem, SpiceValue } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly editingIds: ReadonlySet<string>;
  readonly ingredients: ReadonlyArray<IngredientItem>;
  readonly addIngredient: (ingredientId: string, initialSpices?: Readonly<Record<string, unknown>>) => void;
  readonly clearEditingIds: () => void;
  readonly clearRecipe: () => void;
  readonly getActiveRecipeId: () => string | null;
  readonly removeIngredient: (id: string) => void;
  readonly reorderIngredients: (draggedId: string, targetId: string) => void;
  readonly setActiveRecipeId: (id: string | null) => void;
  readonly toggleEditingId: (id: string) => void;
  readonly setRecipe: (ingredients: ReadonlyArray<IngredientItem>, activeRecipeId: string | null) => void;
  readonly updateSpice: (id: string, spiceId: string, rawValue: SpiceValue) => void;
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set, get) => ({
    activeRecipeId: null,
    editingIds: new Set(),
    ingredients: [],

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

      set((state) => {
        return {
          ingredients: [...state.ingredients, newIngredient],
        };
      });
    },

    clearEditingIds: () => {
      set({ editingIds: new Set() });
    },

    clearRecipe: () => {
      set({
        activeRecipeId: null,
        ingredients: [],
        editingIds: new Set(),
      });
    },

    getActiveRecipeId: () => {
      return get().activeRecipeId;
    },

    removeIngredient: (id) => {
      set((state) => {
        const index = state.ingredients.findIndex((ingredient) => ingredient.id === id);

        if (index === -1) {
          logger.warn(`Attempted to remove non-existent ingredient with id: ${id}`);
          return {};
        }

        const newIngredients = [...state.ingredients];
        newIngredients.splice(index, 1);
        const newEditingIds = new Set(state.editingIds);
        newEditingIds.delete(id);

        return {
          ingredients: newIngredients,
          activeRecipeId: state.activeRecipeId === id ? null : state.activeRecipeId,
          editingIds: newEditingIds,
        };
      });
    },

    reorderIngredients: (draggedId, targetId) => {
      set((state) => {
        const { ingredients } = state;
        const draggedIndex = ingredients.findIndex((ingredient) => ingredient.id === draggedId);
        const targetIndex = ingredients.findIndex((ingredient) => ingredient.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
          return {};
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

    toggleEditingId: (id) => {
      set((state) => {
        const { allowMultipleOpen } = useSettingStore.getState();
        const newEditingIds = new Set(state.editingIds);
        const isCurrentlyEditing = newEditingIds.has(id);

        if (isCurrentlyEditing) {
          newEditingIds.delete(id);
        } else {
          if (!allowMultipleOpen) {
            newEditingIds.clear();
          }
          newEditingIds.add(id);
        }

        return { editingIds: newEditingIds };
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
      });
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
