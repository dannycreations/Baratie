import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { ingredientRegistry, logger } from '../app/container';
import { validateSpices } from '../helpers/spiceHelper';

import type { Ingredient } from '../core/IngredientRegistry';

interface RecipeState {
  readonly activeRecipeId: string | null;
  readonly ingredients: readonly Ingredient[];
  readonly ingredientMap: ReadonlyMap<string, Ingredient>;
  readonly ingredientIndexMap: ReadonlyMap<string, number>;
  readonly setActiveRecipeId: (id: string | null) => void;
  readonly setRecipe: (ingredients: readonly Ingredient[], activeRecipeId: string | null) => void;
}

export const useRecipeStore = create<RecipeState>()(
  subscribeWithSelector((set) => ({
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
  })),
);
