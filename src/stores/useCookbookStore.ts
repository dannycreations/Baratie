import { create } from 'zustand';

import { STORAGE_COOKBOOK } from '../app/constants';
import { errorHandler, logger, storage } from '../app/container';
import { createRecipeHash, processAndSanitizeRecipes, saveAllRecipes } from '../helpers/cookbookHelper';
import { readFile, sanitizeFileName, triggerDownload } from '../utilities/fileUtil';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

import type { IngredientItem, RecipebookItem } from '../core/IngredientRegistry';
import type { SanitizedRecipesResult } from '../helpers/cookbookHelper';

export type CookbookModalProps =
  | {
      readonly mode: 'load';
    }
  | {
      readonly mode: 'save';
      readonly ingredients: ReadonlyArray<IngredientItem>;
      readonly activeRecipeId: string | null;
      readonly name?: string;
    };

interface CookbookState {
  readonly nameInput: string;
  readonly query: string;
  readonly recipes: ReadonlyArray<RecipebookItem>;
  readonly recipeIdMap: ReadonlyMap<string, RecipebookItem>;
  readonly recipeContentHashMap: ReadonlyMap<string, string>;
  readonly computeInitialName: (ingredients: ReadonlyArray<IngredientItem>, activeRecipeId: string | null) => string;
  readonly delete: (id: string) => void;
  readonly exportAll: () => void;
  readonly exportCurrent: () => void;
  readonly importFromFile: (file: File) => Promise<void>;
  readonly init: () => void;
  readonly load: (id: string) => void;
  readonly merge: (recipesToImport: ReadonlyArray<RecipebookItem>) => void;
  readonly prepareToOpen: (args: Readonly<CookbookModalProps>) => void;
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: ReadonlyArray<RecipebookItem>) => void;
  readonly upsert: () => void;
}

export const useCookbookStore = create<CookbookState>()((set, get) => ({
  nameInput: '',
  query: '',
  recipes: [],
  recipeIdMap: new Map(),
  recipeContentHashMap: new Map(),

  computeInitialName: (ingredients, activeRecipeId) => {
    if (ingredients.length === 0) {
      return '';
    }

    const { recipeIdMap, recipeContentHashMap } = get();

    // 1. If there's an active recipe, use its name.
    if (activeRecipeId) {
      const activeRecipe = recipeIdMap.get(activeRecipeId);
      if (activeRecipe) {
        return activeRecipe.name;
      }
    }

    // 2. Check if a saved recipe has the exact same content.
    const currentHash = createRecipeHash(ingredients);
    const existingRecipeIdByContent = recipeContentHashMap.get(currentHash);
    if (existingRecipeIdByContent) {
      const existingRecipe = recipeIdMap.get(existingRecipeIdByContent);
      if (existingRecipe) {
        return existingRecipe.name;
      }
    }

    // 3. Fallback to a generated name.
    const date = new Date();
    const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `My Recipe ${dateString}`;
  },

  delete: (id) => {
    const { show } = useNotificationStore.getState();
    const { recipes, recipeIdMap, setRecipes } = get();
    const recipeToDelete = recipeIdMap.get(id);

    if (!recipeToDelete) {
      return;
    }

    const updatedList = recipes.filter((r) => r.id !== id);
    if (saveAllRecipes(updatedList)) {
      setRecipes(updatedList);
      show(`Recipe '${recipeToDelete.name}' was deleted.`, 'info', 'Cookbook Action');
    }
  },

  exportAll: () => {
    const { recipes } = get();
    const { show } = useNotificationStore.getState();

    if (recipes.length === 0) {
      show('There are no saved recipes to export.', 'info', 'Export All');
      return;
    }

    const fileName = 'baratie_cookbook_export.json';
    triggerDownload(JSON.stringify(recipes, null, 2), fileName);
    show(`${recipes.length} recipes are ready for download.`, 'success', 'Export All Successful');
  },

  exportCurrent: () => {
    const { nameInput } = get();
    const { ingredients } = useRecipeStore.getState();
    const { show } = useNotificationStore.getState();
    const trimmedName = nameInput.trim();

    if (!trimmedName) {
      show('The recipe name cannot be empty.', 'warning', 'Export Error');
      return;
    }

    if (ingredients.length === 0) {
      show('Cannot export an empty recipe. Please add ingredients first.', 'warning', 'Export Error');
      return;
    }

    const recipeToExport: RecipebookItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      ingredients: ingredients,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const fileName = `${sanitizeFileName(recipeToExport.name, 'recipe')}.json`;
    triggerDownload(JSON.stringify(recipeToExport, null, 2), fileName);
    show(`Recipe '${recipeToExport.name}' is ready for download.`, 'success', 'Export Successful');
  },

  importFromFile: async (file) => {
    const { show } = useNotificationStore.getState();

    if (file.type !== 'application/json') {
      show('Invalid file type. Please select a .json file.', 'error', 'Import Error');
      return;
    }

    const { result: content } = await errorHandler.attemptAsync<string>(() => {
      return readFile(file, 'readAsText', 'File to String');
    }, 'File Read for Import');
    if (!content) {
      return;
    }

    const { result: jsonData } = errorHandler.attempt<unknown>(() => JSON.parse(content), 'JSON Parsing for Import');
    if (!jsonData) {
      return;
    }

    const dataToValidate = Array.isArray(jsonData) ? jsonData : [jsonData];
    const { recipes, warnings, hasCorruption }: SanitizedRecipesResult = processAndSanitizeRecipes(dataToValidate, 'fileImport');

    const mutableWarnings = new Set(warnings);
    if (hasCorruption) {
      mutableWarnings.add('Some recipe entries in the file were malformed and have been skipped.');
    }

    for (const warning of mutableWarnings) {
      show(warning, 'warning', 'Import Notice', 7000);
    }

    if (recipes.length === 0) {
      show('No valid recipes were found in the selected file.', 'warning', 'Import Notice');
      return;
    }

    get().merge(recipes);
  },

  init: () => {
    const { show } = useNotificationStore.getState();
    const storedRecipes = storage.get<Array<unknown>>(STORAGE_COOKBOOK, 'Saved Recipes');

    if (!Array.isArray(storedRecipes)) {
      get().setRecipes([]);
      return;
    }

    const { recipes, hasCorruption }: SanitizedRecipesResult = processAndSanitizeRecipes(storedRecipes, 'storage');

    if (hasCorruption) {
      logger.warn('Corrupted cookbook data in storage; attempting partial recovery.');
      show('Some saved recipes may be corrupted and could not be loaded. Data will be cleaned on next save.', 'warning', 'Cookbook Warning', 7000);
    }

    get().setRecipes(recipes);
  },

  load: (id) => {
    const { show } = useNotificationStore.getState();
    const recipeToLoad = get().recipeIdMap.get(id);

    if (recipeToLoad) {
      useRecipeStore.getState().setRecipe(recipeToLoad.ingredients, recipeToLoad.id);
      show(`Recipe '${recipeToLoad.name}' loaded.`, 'success', 'Cookbook Action');
    }
  },

  merge: (recipesToImport) => {
    const { show } = useNotificationStore.getState();
    const { recipes, setRecipes } = get();
    logger.info('Merging imported recipes...', {
      importedCount: recipesToImport.length,
      existingCount: recipes.length,
    });

    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of recipesToImport) {
      const existingItem = recipeMap.get(item.id);
      if (!existingItem) {
        recipeMap.set(item.id, item);
        added++;
      } else if (item.updatedAt > existingItem.updatedAt) {
        recipeMap.set(item.id, item);
        updated++;
      } else {
        skipped++;
      }
    }

    if (added > 0 || updated > 0) {
      const mergedList = [...recipeMap.values()];
      if (saveAllRecipes(mergedList)) {
        const summary = [
          added > 0 ? `${added} new recipe${added > 1 ? 's' : ''} added.` : '',
          updated > 0 ? `${updated} recipe${updated > 1 ? 's' : ''} updated.` : '',
          skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (older versions).` : '',
        ]
          .filter(Boolean)
          .join(' ');
        if (summary) {
          show(summary, 'success', 'Import Complete');
        }
        setRecipes(mergedList);
      }
    } else {
      const summary = skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (duplicates or outdated).` : 'No new recipes to import.';
      show(summary, 'info', 'Import Notice');
    }
  },

  prepareToOpen: (args) => {
    const { computeInitialName, setName } = get();

    if (args.mode === 'save') {
      const initialName = args.name ?? computeInitialName(args.ingredients, args.activeRecipeId);
      setName(initialName);
    }
  },

  resetModal: () => {
    set({ nameInput: '', query: '' });
  },

  setName: (nameInput) => {
    set({ nameInput });
  },

  setQuery: (query) => {
    set({ query });
  },

  setRecipes: (newRecipes) => {
    const recipes = [...newRecipes].sort((a, b) => b.updatedAt - a.updatedAt);
    const recipeIdMap = new Map<string, RecipebookItem>();
    const recipeContentHashMap = new Map<string, string>();

    for (const recipe of recipes) {
      recipeIdMap.set(recipe.id, recipe);
      recipeContentHashMap.set(createRecipeHash(recipe.ingredients), recipe.id);
    }

    set({ recipes, recipeIdMap, recipeContentHashMap });
  },

  upsert: () => {
    const { nameInput, recipes, recipeIdMap, setRecipes } = get();
    const { ingredients, activeRecipeId, setActiveRecipeId } = useRecipeStore.getState();
    const { show } = useNotificationStore.getState();
    const trimmedName = nameInput.trim();

    if (!trimmedName) {
      show('The recipe name cannot be empty.', 'warning', 'Save Error');
      return;
    }

    const shouldForceCreate = ingredients.length === 0 || activeRecipeId === null;
    const recipeToUpdate = activeRecipeId ? recipeIdMap.get(activeRecipeId) : null;
    const isUpdate = !shouldForceCreate && !!recipeToUpdate && recipeToUpdate.name.trim().toLowerCase() === trimmedName.toLowerCase();

    const now = Date.now();
    let finalRecipes: ReadonlyArray<RecipebookItem>;
    let recipeToSave: RecipebookItem;
    let userMessage: string;

    if (isUpdate && recipeToUpdate) {
      recipeToSave = { ...recipeToUpdate, name: trimmedName, ingredients: ingredients, updatedAt: now };
      const recipeIndex = recipes.findIndex((r) => r.id === recipeToUpdate.id);
      const updatedRecipes = [...recipes];
      if (recipeIndex !== -1) {
        updatedRecipes[recipeIndex] = recipeToSave;
      }
      finalRecipes = updatedRecipes;
      userMessage = `Recipe '${trimmedName}' was updated.`;
    } else {
      recipeToSave = {
        id: crypto.randomUUID(),
        name: trimmedName,
        ingredients: ingredients,
        createdAt: now,
        updatedAt: now,
      };
      finalRecipes = [recipeToSave, ...recipes];
      userMessage = recipeToUpdate ? `Recipe '${trimmedName}' saved as a new copy.` : `Recipe '${trimmedName}' was saved.`;
    }

    if (saveAllRecipes(finalRecipes)) {
      setRecipes(finalRecipes);
      setActiveRecipeId(recipeToSave.id);
      show(userMessage, 'success', 'Cookbook Action');
    }
  },
}));
