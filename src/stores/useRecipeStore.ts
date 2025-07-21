import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { updateAndValidate, validateSpices } from '../helpers/spiceHelper';

import type { Ingredient, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly ingredients: readonly Ingredient[];
  readonly ingredientMap: ReadonlyMap<string, Ingredient>;
  readonly ingredientIndexMap: ReadonlyMap<string, number>;
  readonly setActiveRecipeId: (id: string | null) => void;
  readonly setRecipe: (ingredients: readonly Ingredient[], activeRecipeId: string | null) => void;
  readonly addIngredient: (type: symbol, initialSpices?: Readonly<Record<string, unknown>>) => void;
  readonly removeIngredient: (id: string) => void;
  readonly reorderIngredients: (draggedId: string, targetId: string) => void;
  readonly updateSpice: (id: string, spiceId: string, rawValue: SpiceValue, spice: Readonly<SpiceDefinition>) => void;
  readonly clearRecipe: () => void;
  readonly getActiveRecipeId: () => string | null;
}

function getDerivedRecipeState(ingredients: readonly Ingredient[]) {
  const ingredientMap = new Map<string, Ingredient>();
  const ingredientIndexMap = new Map<string, number>();
  for (let i = 0; i < ingredients.length; i++) {
    const ingredient = ingredients[i];
    ingredientMap.set(ingredient.id, ingredient);
    ingredientIndexMap.set(ingredient.id, i);
  }
  return { ingredientMap, ingredientIndexMap };
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set, get) => ({
    activeRecipeId: null,
    ingredients: [],
    ingredientMap: new Map(),
    ingredientIndexMap: new Map(),

    setActiveRecipeId: (id) => {
      set({ activeRecipeId: id });
    },

    setRecipe: (ingredients, activeRecipeId = null) => {
      const validIngredients = ingredients.map((ingredient) => {
        const ingredientDefinition = ingredientRegistry.getIngredient(ingredient.name);
        if (ingredientDefinition) {
          const validatedSpices = validateSpices(ingredientDefinition, ingredient.spices);
          return { ...ingredient, spices: validatedSpices };
        }
        logger.warn(
          `Ingredient definition not found for type "${String(ingredient.name)}" during setRecipe. Options may not be correctly validated.`,
        );
        return ingredient;
      });

      const { ingredientMap, ingredientIndexMap } = getDerivedRecipeState(validIngredients);
      const newActiveRecipeId = activeRecipeId && ingredientMap.has(activeRecipeId) ? activeRecipeId : null;
      set({ activeRecipeId: newActiveRecipeId, ingredients: validIngredients, ingredientMap, ingredientIndexMap });
    },

    addIngredient: (type, initialSpices) => {
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

    removeIngredient: (id) => {
      set((state) => {
        if (!state.ingredientMap.has(id)) return {};

        const newIngredients = state.ingredients.filter((ingredient) => ingredient.id !== id);
        const { ingredientMap, ingredientIndexMap } = getDerivedRecipeState(newIngredients);
        const activeRecipeId = state.activeRecipeId === id ? null : state.activeRecipeId;

        return { ingredients: newIngredients, ingredientMap, ingredientIndexMap, activeRecipeId };
      });
    },

    reorderIngredients: (draggedId, targetId) => {
      set((state) => {
        const { ingredients, ingredientIndexMap } = state;
        const draggedIndex = ingredientIndexMap.get(draggedId);
        const targetIndex = ingredientIndexMap.get(targetId);

        if (draggedIndex === undefined || targetIndex === undefined || draggedIndex === targetIndex) return {};

        const newIngredients = [...ingredients];
        const [draggedItem] = newIngredients.splice(draggedIndex, 1);
        newIngredients.splice(targetIndex, 0, draggedItem);

        const { ingredientIndexMap: newIndexMap } = getDerivedRecipeState(newIngredients);

        return { ingredients: newIngredients, ingredientIndexMap: newIndexMap };
      });
    },

    updateSpice: (id, spiceId, rawValue, spice) => {
      set((state) => {
        const ingredientToUpdate = state.ingredientMap.get(id);
        if (!ingredientToUpdate) {
          errorHandler.assert(false, `Ingredient with ID "${id}" not found for spice change.`, 'Recipe Change Spice');
          return {};
        }

        const ingredientDefinition = ingredientRegistry.getIngredient(ingredientToUpdate.name);
        if (!ingredientDefinition) {
          errorHandler.assert(false, `Ingredient definition not found for type "${String(ingredientToUpdate.name)}".`, 'Recipe Change Spice');
          return {};
        }

        const isSpiceInDefinition = ingredientDefinition.spices?.some((s) => s.id === spiceId);
        if (!isSpiceInDefinition) {
          errorHandler.assert(
            false,
            `Spice with ID "${spiceId}" is not a valid spice for ingredient "${ingredientDefinition.name.description}".`,
            'Recipe Spice Update',
            { genericMessage: `An internal error occurred while updating options for "${ingredientDefinition.name.description}".` },
          );
          return {};
        }

        const newValidSpices = updateAndValidate(ingredientDefinition, ingredientToUpdate.spices, spiceId, rawValue, spice);
        const updatedIngredient = { ...ingredientToUpdate, spices: newValidSpices };
        const index = state.ingredientIndexMap.get(id)!;
        const newIngredients = [...state.ingredients];
        newIngredients[index] = updatedIngredient;
        const newIngredientMap = new Map(state.ingredientMap).set(id, updatedIngredient);

        return { ingredients: newIngredients, ingredientMap: newIngredientMap };
      });
    },

    clearRecipe: () => {
      set({
        activeRecipeId: null,
        ingredients: [],
        ingredientMap: new Map(),
        ingredientIndexMap: new Map(),
      });
    },

    getActiveRecipeId: () => {
      return get().activeRecipeId;
    },
  })),
);
