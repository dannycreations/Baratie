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
  readonly addOrUpdate: (name: string, ingredients: readonly Ingredient[], activeRecipeId: string | null) => void;
  readonly closePanel: () => void;
  readonly delete: (id: string) => void;
  readonly load: (id: string) => RecipeBookItem | null;
  readonly merge: (recipesToImport: readonly RecipeBookItem[]) => void;
  readonly openPanel: (args: OpenPanelArgs) => void;
  readonly reset: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
}

export const useCookbookStore = create<CookbookState>()(function (set, get) {
  return {
    isPanelOpen: false,
    nameInput: '',
    panelMode: null,
    query: '',
    recipes: [],

    addOrUpdate(name, ingredients, activeRecipeId) {
      const { recipes } = get();
      const trimmedName = name.trim();
      const now = Date.now();

      const conflictingRecipe = recipes.find((recipe) => recipe.name.toLowerCase() === trimmedName.toLowerCase() && recipe.id !== activeRecipeId);

      if (conflictingRecipe) {
        showNotification(`A different recipe named '${trimmedName}' already exists. Please choose a new name.`, 'warning', 'Save Error');
        return;
      }

      const newRecipesList = [...recipes];
      const recipeIndex = activeRecipeId ? newRecipesList.findIndex((recipe) => recipe.id === activeRecipeId) : -1;
      let userMessage: string;
      let finalId: string;

      if (recipeIndex !== -1) {
        const originalRecipe = newRecipesList[recipeIndex];
        newRecipesList[recipeIndex] = { ...originalRecipe, name: trimmedName, ingredients, updatedAt: now };
        userMessage = `Recipe '${trimmedName}' was updated.`;
        finalId = activeRecipeId!;
      } else {
        finalId = crypto.randomUUID();
        const newRecipe: RecipeBookItem = { id: finalId, name: trimmedName, ingredients, createdAt: now, updatedAt: now };
        newRecipesList.push(newRecipe);
        userMessage = `Recipe '${trimmedName}' was saved.`;
      }

      newRecipesList.sort((a, b) => b.updatedAt - a.updatedAt);
      if (saveAllRecipes(newRecipesList)) {
        set({ recipes: newRecipesList });
        useRecipeStore.getState().setActiveRecipeId(finalId);
        showNotification(userMessage, 'success', 'Cookbook Action');
      }
    },

    closePanel() {
      set({ isPanelOpen: false });
    },

    delete(id) {
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
      const mergedList = [...recipes];
      const existingById = new Map<string, RecipeBookItem>(recipes.map((recipe) => [recipe.id, recipe]));
      const existingNames = new Set<string>(recipes.map((recipe) => recipe.name.toLowerCase()));
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

      if (saveAllRecipes(mergedList)) {
        const summary = [
          added > 0 ? `${added} new recipes added.` : '',
          updated > 0 ? `${updated} recipes updated.` : '',
          skipped > 0 ? `${skipped} recipes skipped (older versions).` : '',
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
      if (mode === 'save' && args.ingredients.length > 0) {
        const { ingredients } = args;
        const { recipes } = get();
        const currentHash = JSON.stringify(
          ingredients.map((ingredient) => ({
            id: ingredientRegistry.getStringFromSymbol(ingredient.id) ?? ingredient.id.toString(),
            spices: ingredient.spices,
          })),
        );
        const existingRecipe = recipes.find(
          (recipe) =>
            JSON.stringify(
              recipe.ingredients.map((ingredient) => ({
                id: ingredientRegistry.getStringFromSymbol(ingredient.id) ?? ingredient.id.toString(),
                spices: ingredient.spices,
              })),
            ) === currentHash,
        );
        if (existingRecipe) {
          initialName = existingRecipe.name;
        } else {
          const date = new Date();
          const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          initialName = `My Recipe ${dateString}`;
        }
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
  };
});
