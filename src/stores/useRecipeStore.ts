import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { ingredientRegistry, logger } from '../app/container';
import { validateSpices } from '../helpers/spiceHelper';

import type { Ingredient } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly ingredients: readonly Ingredient[];
  readonly setRecipe: (ingredients: readonly Ingredient[], activeRecipeId: string | null) => void;
  readonly setActiveRecipeId: (id: string | null) => void;
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set) => ({
    activeRecipeId: null,
    ingredients: [],

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
      set({ activeRecipeId: newActiveRecipeId, ingredients: validIngredients });
    },

    setActiveRecipeId(id) {
      set({ activeRecipeId: id });
    },
  })),
);
