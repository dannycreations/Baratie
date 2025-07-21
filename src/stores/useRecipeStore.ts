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

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set, get) => ({
    activeRecipeId: null,
    ingredients: [],
    ingredientMap: new Map(),
    ingredientIndexMap: new Map(),

    setActiveRecipeId(id) {
      set({ activeRecipeId: id });
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
        return ingredient;
      });

      const newActiveRecipeId = validIngredients.length > 0 ? activeRecipeId : null;
      const ingredientMap = new Map<string, Ingredient>();
      const ingredientIndexMap = new Map<string, number>();
      for (let i = 0; i < validIngredients.length; i++) {
        const ingredient = validIngredients[i];
        ingredientMap.set(ingredient.id, ingredient);
        ingredientIndexMap.set(ingredient.id, i);
      }
      set({ activeRecipeId: newActiveRecipeId, ingredients: validIngredients, ingredientMap, ingredientIndexMap });
    },

    addIngredient: (type, initialSpices) => {
      const { ingredients, activeRecipeId, setRecipe } = get();
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

      setRecipe([...ingredients, newIngredient], activeRecipeId);
    },

    removeIngredient: (id) => {
      const { ingredients, activeRecipeId, setRecipe } = get();
      const newIngredients = ingredients.filter((ingredient) => ingredient.id !== id);
      setRecipe(newIngredients, activeRecipeId);
    },

    reorderIngredients: (draggedId, targetId) => {
      const { ingredients, activeRecipeId, setRecipe, ingredientIndexMap } = get();
      const draggedIndex = ingredientIndexMap.get(draggedId);
      const targetIndex = ingredientIndexMap.get(targetId);

      if (draggedIndex === undefined || targetIndex === undefined || draggedIndex === targetIndex) {
        return;
      }

      const currentRecipe = [...ingredients];
      const [draggedItem] = currentRecipe.splice(draggedIndex, 1);
      currentRecipe.splice(targetIndex, 0, draggedItem);
      setRecipe(currentRecipe, activeRecipeId);
    },

    updateSpice: (id, spiceId, rawValue, spice) => {
      const { ingredients, ingredientMap, activeRecipeId, setRecipe } = get();
      const ingredientToUpdate = ingredientMap.get(id);
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
      const newIngredients = ingredients.map((ingredient) => (ingredient.id === id ? { ...ingredient, spices: newValidSpices } : ingredient));
      setRecipe(newIngredients, activeRecipeId);
    },

    clearRecipe: () => {
      get().setRecipe([], null);
    },

    getActiveRecipeId: () => {
      return get().activeRecipeId;
    },
  })),
);
