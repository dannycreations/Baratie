import { create } from 'zustand';

import { ingredientRegistry } from '../app/container';

import type { Ingredient, RecipeBookItem } from '../core/IngredientRegistry';

function createIngredientHash(ingredients: readonly Ingredient[]): string {
  const canonicalParts = ingredients.map((ing) => {
    const name = ingredientRegistry.getStringFromSymbol(ing.name) ?? ing.name.toString();
    const spices = Object.keys(ing.spices)
      .sort()
      .map((key) => `${key}:${String(ing.spices[key])}`)
      .join(';');
    return `${name}|${spices}`;
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
  readonly recipeHashMap: ReadonlyMap<string, RecipeBookItem>;
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
  recipeHashMap: new Map(),

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
    const sortedRecipes = [...newRecipes].sort((a, b) => b.updatedAt - a.updatedAt);
    const idMap = new Map<string, RecipeBookItem>();
    const hashMap = new Map<string, RecipeBookItem>();
    for (const recipe of sortedRecipes) {
      idMap.set(recipe.id, recipe);
      const hash = createIngredientHash(recipe.ingredients);
      if (!hashMap.has(hash)) {
        hashMap.set(hash, recipe);
      }
    }
    set({
      recipes: sortedRecipes,
      recipeIdMap: idMap,
      recipeHashMap: hashMap,
    });
  },

  computeInitialName(ingredients, activeRecipeId) {
    if (ingredients.length === 0) {
      return '';
    }

    const { recipeIdMap, recipeHashMap } = get();

    if (activeRecipeId) {
      const activeRecipe = recipeIdMap.get(activeRecipeId);
      if (activeRecipe) {
        return activeRecipe.name;
      }
    }

    const currentHash = createIngredientHash(ingredients);
    const existingRecipe = recipeHashMap.get(currentHash);
    if (existingRecipe) {
      return existingRecipe.name;
    }

    const date = new Date();
    const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `My Recipe ${dateString}`;
  },
}));
