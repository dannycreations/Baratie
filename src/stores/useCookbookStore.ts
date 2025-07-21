import { create } from 'zustand';

import { ingredientRegistry } from '../app/container';

import type { Ingredient, RecipeBookItem } from '../core/IngredientRegistry';

function createIngredientHash(ingredients: readonly Ingredient[]): string {
  const canonicalParts = ingredients.map((ing) => {
    const name = ingredientRegistry.getStringFromSymbol(ing.name) ?? ing.name.toString();
    const definition = ingredientRegistry.getIngredient(ing.name);

    if (!definition?.spices || definition.spices.length === 0) {
      return name;
    }

    const spicesString = definition.spices
      .map((spiceDef) => ({ id: spiceDef.id, value: ing.spices[spiceDef.id] }))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((s) => `${s.id}:${String(s.value)}`)
      .join(';');

    return `${name}|${spicesString}`;
  });
  return canonicalParts.join('||');
}

interface OpenModalArgs {
  readonly mode: 'load' | 'save';
  readonly name: string;
}

interface CookbookState {
  readonly closeModal: () => void;
  readonly isModalOpen: boolean;
  readonly modalMode: 'load' | 'save' | null;
  readonly nameInput: string;
  readonly openModal: (args: Readonly<OpenModalArgs>) => void;
  readonly query: string;
  readonly recipes: readonly RecipeBookItem[];
  readonly recipeIdMap: ReadonlyMap<string, RecipeBookItem>;
  readonly recipeContentHashMap: ReadonlyMap<string, string>;
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
  readonly computeInitialName: (ingredients: readonly Ingredient[], activeRecipeId: string | null) => string;
}

export const useCookbookStore = create<CookbookState>()((set, get) => ({
  isModalOpen: false,
  modalMode: null,
  nameInput: '',
  query: '',
  recipes: [],
  recipeIdMap: new Map(),
  recipeContentHashMap: new Map(),

  closeModal() {
    set({ isModalOpen: false });
  },

  openModal(args) {
    set({
      isModalOpen: true,
      modalMode: args.mode,
      nameInput: args.name,
      query: '',
    });
  },

  resetModal() {
    set({ nameInput: '', modalMode: null, query: '' });
  },

  setName(name) {
    set({ nameInput: name });
  },

  setQuery(term) {
    set({ query: term });
  },

  setRecipes(newRecipes) {
    const recipes = [...newRecipes].sort((a, b) => b.updatedAt - a.updatedAt);
    const idMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const contentHashMap = new Map<string, string>();
    for (const recipe of recipes) {
      const hash = createIngredientHash(recipe.ingredients);
      contentHashMap.set(hash, recipe.id);
    }
    set({
      recipes,
      recipeIdMap: idMap,
      recipeContentHashMap: contentHashMap,
    });
  },

  computeInitialName(ingredients, activeRecipeId) {
    if (ingredients.length === 0) {
      return '';
    }

    const { recipeIdMap, recipeContentHashMap } = get();

    if (activeRecipeId) {
      const activeRecipe = recipeIdMap.get(activeRecipeId);
      if (activeRecipe) {
        return activeRecipe.name;
      }
    }

    const currentHash = createIngredientHash(ingredients);
    const existingRecipeId = recipeContentHashMap.get(currentHash);
    if (existingRecipeId) {
      const existingRecipe = recipeIdMap.get(existingRecipeId);
      if (existingRecipe) {
        return existingRecipe.name;
      }
    }

    const date = new Date();
    const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `My Recipe ${dateString}`;
  },
}));
