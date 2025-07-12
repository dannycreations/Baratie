import { create } from 'zustand';

import { ingredientRegistry, logger } from '../app/container';
import { saveAllRecipes } from '../helpers/cookbookHelper';
import { showNotification } from '../helpers/notificationHelper';
import { useRecipeStore } from './useRecipeStore';

import type { Ingredient, RecipeBookItem } from '../core/IngredientRegistry';

type OpenPanelArgs = { mode: 'load' } | { mode: 'save'; readonly ingredients: readonly Ingredient[] };

interface CookbookState {
  readonly isPanelOpen: boolean;
  readonly nameInput: string;
  readonly panelMode: 'load' | 'save' | null;
  readonly query: string;
  readonly recipes: readonly RecipeBookItem[];
  readonly upsertRecipe: (name: string, ingredients: readonly Ingredient[], activeRecipeId: string | null) => void;
  readonly closePanel: () => void;
  readonly deleteRecipe: (id: string) => void;
  readonly load: (id: string) => RecipeBookItem | null;
  readonly merge: (recipesToImport: readonly RecipeBookItem[]) => void;
  readonly openPanel: (args: OpenPanelArgs) => void;
  readonly reset: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
}

function findRecipeConflict(recipes: readonly RecipeBookItem[], name: string, activeRecipeId: string | null): RecipeBookItem | undefined {
  const lowerCaseName = name.toLowerCase();
  return recipes.find((recipe) => recipe.name.toLowerCase() === lowerCaseName && recipe.id !== activeRecipeId);
}

function upsertRecipe(
  recipes: readonly RecipeBookItem[],
  name: string,
  ingredients: readonly Ingredient[],
  activeRecipeId: string | null,
): { readonly updatedList: readonly RecipeBookItem[]; readonly recipeId: string; readonly userMessage: string } {
  const now = Date.now();
  const updatedList = [...recipes];
  const recipeIndex = activeRecipeId ? updatedList.findIndex((recipe) => recipe.id === activeRecipeId) : -1;
  let userMessage: string;
  let recipeId: string;

  if (recipeIndex !== -1 && activeRecipeId) {
    const originalRecipe = updatedList[recipeIndex];
    updatedList[recipeIndex] = { ...originalRecipe, name, ingredients, updatedAt: now };
    userMessage = `Recipe '${name}' was updated.`;
    recipeId = activeRecipeId;
  } else {
    recipeId = crypto.randomUUID();
    const newRecipe: RecipeBookItem = { id: recipeId, name, ingredients, createdAt: now, updatedAt: now };
    updatedList.push(newRecipe);
    userMessage = `Recipe '${name}' was saved.`;
  }

  updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
  return { updatedList, recipeId, userMessage };
}

function mergeRecipeLists(
  existingRecipes: readonly RecipeBookItem[],
  recipesToImport: readonly RecipeBookItem[],
): { readonly mergedList: readonly RecipeBookItem[]; readonly added: number; readonly updated: number; readonly skipped: number } {
  const mergedList = [...existingRecipes];
  const existingById = new Map<string, RecipeBookItem>(existingRecipes.map((recipe) => [recipe.id, recipe]));
  const existingNames = new Set<string>(existingRecipes.map((r) => r.name.toLowerCase()));
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of recipesToImport) {
    const existingItem = existingById.get(item.id);
    if (existingItem) {
      if (item.updatedAt > existingItem.updatedAt) {
        const index = mergedList.findIndex((recipe) => recipe.id === item.id);
        if (index !== -1) {
          mergedList[index] = item;
          updated++;
        }
      } else {
        skipped++;
      }
    } else {
      let uniqueName = item.name;
      let counter = 1;
      while (existingNames.has(uniqueName.toLowerCase()) && counter < 100) {
        uniqueName = `${item.name} (Imported ${counter})`;
        counter++;
      }
      mergedList.push({ ...item, name: uniqueName });
      existingNames.add(uniqueName.toLowerCase());
      added++;
    }
  }

  mergedList.sort((a, b) => b.updatedAt - a.updatedAt);
  return { mergedList, added, updated, skipped };
}

function createInitialName(allRecipes: readonly RecipeBookItem[], ingredients: readonly Ingredient[]): string {
  if (ingredients.length === 0) {
    return '';
  }

  const currentHash = JSON.stringify(
    ingredients.map((ing) => ({
      name: ingredientRegistry.getStringFromSymbol(ing.name) ?? ing.name.toString(),
      spices: ing.spices,
    })),
  );

  const existingRecipe = allRecipes.find((recipe) => {
    const recipeHash = JSON.stringify(
      recipe.ingredients.map((ing) => ({
        name: ingredientRegistry.getStringFromSymbol(ing.name) ?? ing.name.toString(),
        spices: ing.spices,
      })),
    );
    return recipeHash === currentHash;
  });

  if (existingRecipe) {
    return existingRecipe.name;
  }

  const date = new Date();
  const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `My Recipe ${dateString}`;
}

export const useCookbookStore = create<CookbookState>()((set, get) => ({
  isPanelOpen: false,
  nameInput: '',
  panelMode: null,
  query: '',
  recipes: [],

  upsertRecipe(name, ingredients, activeRecipeId) {
    const { recipes } = get();
    const trimmedName = name.trim();

    if (findRecipeConflict(recipes, trimmedName, activeRecipeId)) {
      showNotification(`A different recipe named '${trimmedName}' already exists. Please choose a new name.`, 'warning', 'Save Error');
      return;
    }

    const { updatedList, recipeId, userMessage } = upsertRecipe(recipes, trimmedName, ingredients, activeRecipeId);

    if (saveAllRecipes(updatedList)) {
      set({ recipes: updatedList });
      useRecipeStore.getState().setActiveRecipeId(recipeId);
      showNotification(userMessage, 'success', 'Cookbook Action');
    }
  },

  closePanel() {
    set({ isPanelOpen: false });
  },

  deleteRecipe(id) {
    const { recipes } = get();
    const recipeToDelete = recipes.find((recipe) => recipe.id === id);
    const updatedList = recipes.filter((recipe) => recipe.id !== id);
    if (saveAllRecipes(updatedList)) {
      set({ recipes: updatedList });
      if (recipeToDelete) {
        showNotification(`Recipe '${recipeToDelete.name}' was deleted.`, 'info', 'Cookbook Action');
      }
    }
  },

  load(id) {
    const recipeToLoad = get().recipes.find((recipe) => recipe.id === id);
    if (recipeToLoad) {
      useRecipeStore.getState().set([...recipeToLoad.ingredients], recipeToLoad.id);
      showNotification(`Recipe '${recipeToLoad.name}' loaded.`, 'success', 'Cookbook Action');
      return recipeToLoad;
    }
    return null;
  },

  merge(recipesToImport) {
    const { recipes } = get();
    logger.info('Merging imported recipes...', { importedCount: recipesToImport.length, existingCount: recipes.length });

    const { mergedList, added, updated, skipped } = mergeRecipeLists(recipes, recipesToImport);

    if (saveAllRecipes(mergedList)) {
      const summary = [
        added > 0 ? `${added} new recipe${added > 1 ? 's' : ''} added.` : '',
        updated > 0 ? `${updated} recipe${updated > 1 ? 's' : ''} updated.` : '',
        skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (older versions).` : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (summary) {
        showNotification(summary, 'success', 'Import Complete');
      } else {
        showNotification('No changes were made; recipes may be duplicates or outdated.', 'info', 'Import Notice');
      }
      set({ recipes: mergedList });
    }
  },

  openPanel(args) {
    const { mode } = args;
    let initialName = '';
    if (mode === 'save') {
      initialName = createInitialName(get().recipes, args.ingredients);
    }
    set({
      isPanelOpen: true,
      nameInput: initialName,
      panelMode: mode,
      query: '',
    });
  },

  reset() {
    set({ nameInput: '', panelMode: null, query: '' });
  },

  setName(name) {
    set({ nameInput: name });
  },

  setQuery(term) {
    set({ query: term });
  },

  setRecipes(recipes) {
    set({ recipes: [...recipes].sort((a, b) => b.updatedAt - a.updatedAt) });
  },
}));
