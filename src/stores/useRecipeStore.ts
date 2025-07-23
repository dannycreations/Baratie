import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { updateAndValidate, validateSpices } from '../helpers/spiceHelper';

import type { IngredientItem, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly ingredients: ReadonlyArray<IngredientItem>;
  readonly ingredientMap: ReadonlyMap<string, IngredientItem>;
  readonly ingredientIndexMap: ReadonlyMap<string, number>;
  readonly editingId: string | null;
  readonly addIngredient: (type: string, initialSpices?: Readonly<Record<string, unknown>>) => void;
  readonly clearRecipe: () => void;
  readonly getActiveRecipeId: () => string | null;
  readonly removeIngredient: (id: string) => void;
  readonly reorderIngredients: (draggedId: string, targetId: string) => void;
  readonly setActiveRecipeId: (id: string | null) => void;
  readonly setEditingId: (id: string | null) => void;
  readonly setRecipe: (ingredients: ReadonlyArray<IngredientItem>, activeRecipeId: string | null) => void;
  readonly updateSpice: (id: string, spiceId: string, rawValue: SpiceValue, spice: Readonly<SpiceDefinition>) => void;
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set, get) => ({
    activeRecipeId: null,
    ingredients: [],
    ingredientMap: new Map(),
    ingredientIndexMap: new Map(),
    editingId: null,
    addIngredient: (type, initialSpices) => {
      const ingredientDefinition = ingredientRegistry.getIngredient(type);
      errorHandler.assert(ingredientDefinition, `Ingredient definition not found for type: ${type}`, 'Recipe Add Ingredient', {
        genericMessage: `Ingredient "${type}" could not be added because its definition is missing.`,
      });

      const validSpices = validateSpices(ingredientDefinition, initialSpices || {});
      const newIngredient: IngredientItem = {
        id: crypto.randomUUID(),
        name: ingredientDefinition.id,
        spices: validSpices,
      };

      set((state) => {
        const newIngredients = [...state.ingredients, newIngredient];
        const newIngredientMap = new Map(state.ingredientMap).set(newIngredient.id, newIngredient);
        const newIngredientIndexMap = new Map(state.ingredientIndexMap).set(newIngredient.id, newIngredients.length - 1);
        return {
          ingredients: newIngredients,
          ingredientMap: newIngredientMap,
          ingredientIndexMap: newIngredientIndexMap,
        };
      });
    },
    clearRecipe: () => {
      set({
        activeRecipeId: null,
        ingredients: [],
        ingredientMap: new Map(),
        ingredientIndexMap: new Map(),
        editingId: null,
      });
    },
    getActiveRecipeId: () => {
      return get().activeRecipeId;
    },
    removeIngredient: (id) => {
      set((state) => {
        const { ingredientMap, ingredientIndexMap, ingredients } = state;
        const indexToRemove = ingredientIndexMap.get(id);

        if (indexToRemove === undefined) {
          logger.warn(`Attempted to remove non-existent ingredient with id: ${id}`);
          return {};
        }

        const newIngredients = [...ingredients];
        newIngredients.splice(indexToRemove, 1);

        const newIngredientMap = new Map(ingredientMap);
        newIngredientMap.delete(id);

        const newIngredientIndexMap = new Map(ingredientIndexMap);
        newIngredientIndexMap.delete(id);
        for (let i = indexToRemove; i < newIngredients.length; i++) {
          newIngredientIndexMap.set(newIngredients[i].id, i);
        }

        return {
          ingredients: newIngredients,
          ingredientMap: newIngredientMap,
          ingredientIndexMap: newIngredientIndexMap,
          activeRecipeId: state.activeRecipeId === id ? null : state.activeRecipeId,
          editingId: state.editingId === id ? null : state.editingId,
        };
      });
    },
    reorderIngredients: (draggedId, targetId) => {
      set((state) => {
        const { ingredients, ingredientMap, ingredientIndexMap } = state;
        const draggedIndex = ingredientIndexMap.get(draggedId);
        const targetIndex = ingredientIndexMap.get(targetId);

        if (draggedIndex === undefined || targetIndex === undefined || draggedIndex === targetIndex) {
          return {};
        }

        const newIngredients = [...ingredients];
        const [draggedItem] = newIngredients.splice(draggedIndex, 1);
        newIngredients.splice(targetIndex, 0, draggedItem);

        const newIngredientIndexMap = new Map(ingredientIndexMap);
        const start = Math.min(draggedIndex, targetIndex);
        const end = Math.max(draggedIndex, targetIndex);
        for (let i = start; i <= end; i++) {
          newIngredientIndexMap.set(newIngredients[i].id, i);
        }

        return {
          ingredients: newIngredients,
          ingredientMap,
          ingredientIndexMap: newIngredientIndexMap,
        };
      });
    },
    setActiveRecipeId: (activeRecipeId) => {
      set({ activeRecipeId });
    },
    setEditingId: (editingId) => {
      set({ editingId });
    },
    setRecipe: (ingredients, activeRecipeId = null) => {
      const newIngredientMap = new Map<string, IngredientItem>();
      const newIngredientIndexMap = new Map<string, number>();

      const validIngredients = ingredients.map((ingredient) => {
        const ingredientDefinition = ingredientRegistry.getIngredient(ingredient.name);
        if (ingredientDefinition) {
          const validatedSpices = validateSpices(ingredientDefinition, ingredient.spices);
          return { ...ingredient, spices: validatedSpices };
        }
        logger.warn(`Ingredient definition not found for type "${ingredient.name}" during setRecipe. Options may not be correctly validated.`);
        return ingredient;
      });

      for (let i = 0; i < validIngredients.length; i++) {
        const ingredient = validIngredients[i];
        newIngredientMap.set(ingredient.id, ingredient);
        newIngredientIndexMap.set(ingredient.id, i);
      }

      set({
        activeRecipeId: activeRecipeId && newIngredientMap.has(activeRecipeId) ? activeRecipeId : null,
        ingredients: validIngredients,
        ingredientMap: newIngredientMap,
        ingredientIndexMap: newIngredientIndexMap,
        editingId: null,
      });
    },
    updateSpice: (id, spiceId, rawValue, spice) => {
      set((state) => {
        const ingredientToUpdate = state.ingredientMap.get(id);
        errorHandler.assert(ingredientToUpdate, `Ingredient with ID "${id}" not found for spice change.`, 'Recipe Change Spice');

        const ingredientDefinition = ingredientRegistry.getIngredient(ingredientToUpdate.name);
        errorHandler.assert(ingredientDefinition, `Ingredient definition not found for type "${ingredientToUpdate.name}".`, 'Recipe Change Spice');

        const isSpiceInDefinition = ingredientDefinition.spices?.some((s) => s.id === spiceId);
        errorHandler.assert(
          isSpiceInDefinition,
          `Spice with ID "${spiceId}" is not a valid spice for ingredient "${ingredientDefinition.name}".`,
          'Recipe Spice Update',
          { genericMessage: `An internal error occurred while updating options for "${ingredientDefinition.name}".` },
        );

        const newValidSpices = updateAndValidate(ingredientDefinition, ingredientToUpdate.spices, spiceId, rawValue, spice);
        const updatedIngredient = { ...ingredientToUpdate, spices: newValidSpices };
        const index = state.ingredientIndexMap.get(id)!;
        const newIngredients = [...state.ingredients];
        newIngredients[index] = updatedIngredient;
        const newIngredientMap = new Map(state.ingredientMap).set(id, updatedIngredient);

        return { ingredients: newIngredients, ingredientMap: newIngredientMap };
      });
    },
  })),
);
