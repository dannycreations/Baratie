import { create } from 'zustand';

import { ingredientRegistry, logger } from '../app/container';
import { saveAllRecipes } from '../helpers/cookbookHelper';
import { showNotification } from '../helpers/notificationHelper';
import { useRecipeStore } from './useRecipeStore';

import type { Ingredient, RecipeBookItem } from '../core/IngredientRegistry';

type OpenModalArgs = { mode: 'load' } | { mode: 'save'; readonly ingredients: readonly Ingredient[] };

interface CookbookState {
  readonly isModalOpen: boolean;
  readonly nameInput: string;
  readonly modalMode: 'load' | 'save' | null;
  readonly query: string;
  readonly recipes: readonly RecipeBookItem[];
  readonly upsertRecipe: (name: string, ingredients: readonly Ingredient[], activeRecipeId: string | null) => void;
  readonly closeModal: () => void;
  readonly deleteRecipe: (id: string) => void;
  readonly load: (id: string) => RecipeBookItem | null;
  readonly merge: (recipesToImport: readonly RecipeBookItem[]) => void;
  readonly openModal: (args: OpenModalArgs) => void;
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
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

  const activeRecipeId = useRecipeStore.getState().activeRecipeId;
  if (activeRecipeId) {
    const activeRecipe = allRecipes.find((recipe) => recipe.id === activeRecipeId);
    if (activeRecipe) {
      return activeRecipe.name;
    }
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
  isModalOpen: false,
  nameInput: '',
  modalMode: null,
  query: '',
  recipes: [],

  upsertRecipe(name, ingredients, activeRecipeId) {
    const { recipes } = get();
    const trimmedName = name.trim();

    const recipeById = activeRecipeId ? recipes.find((r) => r.id === activeRecipeId) : null;

    const now = Date.now();
    const updatedList = [...recipes];
    let recipeToSave: RecipeBookItem;
    let userMessage: string;

    if (recipeById && recipeById.name.toLowerCase() === trimmedName.toLowerCase()) {
      const index = updatedList.findIndex((r) => r.id === recipeById.id);
      recipeToSave = { ...recipeById, name: trimmedName, ingredients, updatedAt: now };
      if (index !== -1) {
        updatedList[index] = recipeToSave;
      } else {
        updatedList.push(recipeToSave);
      }
      userMessage = `Recipe '${trimmedName}' was updated.`;
    } else {
      recipeToSave = { id: crypto.randomUUID(), name: trimmedName, ingredients, createdAt: now, updatedAt: now };
      updatedList.push(recipeToSave);
      userMessage = recipeById ? `Recipe '${trimmedName}' saved as a new copy.` : `Recipe '${trimmedName}' was saved.`;
    }

    updatedList.sort((a, b) => b.updatedAt - a.updatedAt);

    if (saveAllRecipes(updatedList)) {
      set({ recipes: updatedList });
      useRecipeStore.getState().setActiveRecipeId(recipeToSave.id);
      showNotification(userMessage, 'success', 'Cookbook Action');
    }
  },

  closeModal() {
    set({ isModalOpen: false });
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
      useRecipeStore.getState().setRecipe([...recipeToLoad.ingredients], recipeToLoad.id);
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

  openModal(args) {
    const { mode } = args;
    let initialName = '';
    if (mode === 'save') {
      initialName = createInitialName(get().recipes, args.ingredients);
    }
    set({
      isModalOpen: true,
      nameInput: initialName,
      modalMode: mode,
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

  setRecipes(recipes) {
    set({ recipes: [...recipes].sort((a, b) => b.updatedAt - a.updatedAt) });
  },
}));
