import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { updateAndValidate, validateSpices } from '../helpers/spiceHelper';

import type { Ingredient, SpiceDefinition } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly ingredients: readonly Ingredient[];
  readonly addIngredient: (type: symbol, initialSpices?: Readonly<Record<string, unknown>>) => void;
  readonly clear: () => void;
  readonly removeIngredient: (id: string) => void;
  readonly reorderIngredients: (draggedId: string, targetId: string) => void;
  readonly setRecipe: (ingredients: readonly Ingredient[], activeRecipeId?: string | null) => void;
  readonly setActiveRecipeId: (id: string | null) => void;
  readonly setIngredientSpices: (id: string, newSpices: Readonly<Record<string, unknown>>) => void;
  readonly updateSpice: (id: string, spiceId: string, rawValue: string | boolean | number, spice: Readonly<SpiceDefinition>) => void;
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set, get) => ({
    activeRecipeId: null,
    ingredients: [],

    addIngredient(type, initialSpices) {
      const ingredientDefinition = ingredientRegistry.getIngredient(type);
      errorHandler.assert(ingredientDefinition, `Ingredient definition not found for type: ${String(type)}`, 'Recipe Add Ingredient', {
        genericMessage: `Ingredient "${String(type)}" could not be added because its definition is missing.`,
      });

      const validSpices = validateSpices(ingredientDefinition, initialSpices || {});
      const newIngredient: Ingredient = {
        id: crypto.randomUUID(),
        name: ingredientDefinition.name,
        spices: validSpices,
      };
      set((state) => ({ ingredients: [...state.ingredients, newIngredient] }));
    },

    clear() {
      set({ activeRecipeId: null, ingredients: [] });
    },

    removeIngredient(id) {
      set((state) => {
        const newIngredients = state.ingredients.filter((ingredient) => ingredient.id !== id);
        const newActiveRecipeId = newIngredients.length > 0 ? state.activeRecipeId : null;
        return {
          activeRecipeId: newActiveRecipeId,
          ingredients: newIngredients,
        };
      });
    },

    reorderIngredients(draggedId, targetId) {
      const currentRecipe = [...get().ingredients];
      const draggedIndex = currentRecipe.findIndex((ingredient) => ingredient.id === draggedId);
      const targetIndex = currentRecipe.findIndex((ingredient) => ingredient.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return;
      }

      const [draggedItem] = currentRecipe.splice(draggedIndex, 1);
      currentRecipe.splice(targetIndex, 0, draggedItem);
      set({ ingredients: currentRecipe });
    },

    setRecipe(ingredients, activeRecipeId = null) {
      const validIngredients = ingredients.map((ingredient) => {
        const ingredientDefinition = ingredientRegistry.getIngredient(ingredient.name);
        if (ingredientDefinition) {
          const validatedSpices = validateSpices(ingredientDefinition, ingredient.spices);
          return { ...ingredient, spices: validatedSpices };
        }
        logger.warn(
          `Ingredient definition not found for type "${String(ingredient.name)}" during setRecipe. Options may not be correctly validated.`,
        );
        return { ...ingredient, spices: ingredient.spices };
      });

      const newActiveRecipeId = validIngredients.length > 0 ? activeRecipeId : null;
      set({ activeRecipeId: newActiveRecipeId, ingredients: validIngredients });
    },

    setActiveRecipeId(id) {
      set({ activeRecipeId: id });
    },

    setIngredientSpices(id, newSpices) {
      const ingredientToUpdate = get().ingredients.find((ingredient) => ingredient.id === id);
      errorHandler.assert(ingredientToUpdate, `Ingredient with ID "${id}" not found for spice update.`, 'Recipe Update Spices');

      const ingredientDefinition = ingredientRegistry.getIngredient(ingredientToUpdate.name);
      const validatedSpices = ingredientDefinition ? validateSpices(ingredientDefinition, newSpices) : newSpices;

      set((state) => ({
        ingredients: state.ingredients.map((ingredient) => (ingredient.id === id ? { ...ingredient, spices: validatedSpices } : ingredient)),
      }));
    },

    updateSpice(id, spiceId, rawValue, spice) {
      const ingredientToUpdate = get().ingredients.find((ingredient) => ingredient.id === id);
      errorHandler.assert(ingredientToUpdate, `Ingredient with ID "${id}" not found for spice change.`, 'Recipe Change Spice');

      const ingredientDefinition = ingredientRegistry.getIngredient(ingredientToUpdate.name);
      errorHandler.assert(
        ingredientDefinition,
        `Ingredient definition not found for type "${String(ingredientToUpdate.name)}".`,
        'Recipe Change Spice',
      );

      const isSpiceInDefinition = ingredientDefinition.spices?.some((s) => s.id === spiceId);
      errorHandler.assert(
        isSpiceInDefinition,
        `Spice with ID "${spiceId}" is not a valid spice for ingredient "${ingredientDefinition.name.description}".`,
        'Recipe Spice Update',
        {
          genericMessage: `An internal error occurred while updating options for "${ingredientDefinition.name.description}".`,
        },
      );

      const newValidSpices = updateAndValidate(ingredientDefinition, ingredientToUpdate.spices, spiceId, rawValue, spice);

      set((state) => ({
        ingredients: state.ingredients.map((ingredient) => (ingredient.id === id ? { ...ingredient, spices: newValidSpices } : ingredient)),
      }));
    },
  })),
);
