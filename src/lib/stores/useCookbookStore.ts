import { create } from 'zustand';

import { STORAGE_COOKBOOK } from '../app/constants';
import { errorHandler, logger, storage } from '../app/container';
import { createRecipeHash, processAndSanitizeRecipes, saveAllRecipes, serializeRecipe } from '../helpers/cookbookHelper';
import { readAsText, sanitizeFileName, triggerDownload } from '../utilities/fileUtil';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

import type { IngredientItem, RecipeBookItem } from '../core/IngredientRegistry';
import type { SanitizedRecipesResult } from '../helpers/cookbookHelper';

type OpenCookbookArgs =
  | { readonly mode: 'load' }
  | { readonly mode: 'save'; readonly ingredients: ReadonlyArray<IngredientItem>; readonly activeRecipeId: string | null; readonly name?: string };

interface OpenModalArgs {
  readonly mode: 'load' | 'save';
  readonly name: string;
}

interface CookbookState {
  readonly isModalOpen: boolean;
  readonly modalMode: 'load' | 'save' | null;
  readonly nameInput: string;
  readonly query: string;
  readonly recipes: ReadonlyArray<RecipeBookItem>;
  readonly recipeIdMap: ReadonlyMap<string, RecipeBookItem>;
  readonly recipeContentHashMap: ReadonlyMap<string, string>;
  readonly closeModal: () => void;
  readonly computeInitialName: (ingredients: ReadonlyArray<IngredientItem>, activeRecipeId: string | null) => string;
  readonly delete: (id: string) => void;
  readonly exportAll: () => void;
  readonly exportCurrent: () => void;
  readonly importFromFile: (file: File) => Promise<void>;
  readonly init: () => void;
  readonly load: (id: string) => void;
  readonly merge: (recipesToImport: ReadonlyArray<RecipeBookItem>) => void;
  readonly open: (args: Readonly<OpenCookbookArgs>) => void;
  readonly openModal: (args: Readonly<OpenModalArgs>) => void;
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: ReadonlyArray<RecipeBookItem>) => void;
  readonly upsert: () => void;
}

export const useCookbookStore = create<CookbookState>()((set, get) => ({
  isModalOpen: false,
  modalMode: null,
  nameInput: '',
  query: '',
  recipes: [] as ReadonlyArray<RecipeBookItem>,
  recipeIdMap: new Map<string, RecipeBookItem>(),
  recipeContentHashMap: new Map<string, string>(),
  closeModal: () => {
    set({ isModalOpen: false });
  },
  computeInitialName: (ingredients, activeRecipeId) => {
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
    const currentHash = createRecipeHash(ingredients);
    const existingRecipeId = recipeContentHashMap.get(currentHash);
    if (existingRecipeId) {
      const existingRecipe = recipeIdMap.get(existingRecipeId);
      if (existingRecipe) {
        return existingRecipe.name;
      }
    }
    const date = new Date();
    const dateString = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return `My Recipe ${dateString}`;
  },
  delete: (id) => {
    const { recipes, recipeIdMap, setRecipes } = get();
    const recipeToDelete = recipeIdMap.get(id);
    if (!recipeToDelete) {
      return;
    }
    const updatedList = recipes.filter((r) => r.id !== id);
    if (saveAllRecipes(updatedList)) {
      setRecipes(updatedList);
      useNotificationStore.getState().internalShow({
        message: `Recipe '${recipeToDelete.name}' was deleted.`,
        type: 'info',
        title: 'Cookbook Action',
      });
    }
  },
  exportAll: () => {
    const { recipes } = get();
    if (recipes.length === 0) {
      useNotificationStore.getState().internalShow({ message: 'There are no saved recipes to export.', type: 'info', title: 'Export All' });
      return;
    }
    const fileName = 'baratie_cookbook_export.json';
    const serialized = recipes.map(serializeRecipe);
    triggerDownload(JSON.stringify(serialized, null, 2), fileName);
    useNotificationStore.getState().internalShow({
      message: `${recipes.length} recipes are ready for download.`,
      type: 'success',
      title: 'Export All Successful',
    });
  },
  exportCurrent: () => {
    const { nameInput } = get();
    const { ingredients } = useRecipeStore.getState();
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      useNotificationStore.getState().internalShow({ message: 'The recipe name cannot be empty.', type: 'warning', title: 'Export Error' });
      return;
    }
    if (ingredients.length === 0) {
      useNotificationStore.getState().internalShow({
        message: 'Cannot export an empty recipe. Please add ingredients first.',
        type: 'warning',
        title: 'Export Error',
      });
      return;
    }
    const recipeToExport: RecipeBookItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      ingredients,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const fileName = `${sanitizeFileName(recipeToExport.name, 'recipe')}.json`;
    triggerDownload(JSON.stringify(serializeRecipe(recipeToExport), null, 2), fileName);
    useNotificationStore.getState().internalShow({
      message: `Recipe '${recipeToExport.name}' is ready for download.`,
      type: 'success',
      title: 'Export Successful',
    });
  },
  importFromFile: async (file) => {
    if (file.type !== 'application/json') {
      useNotificationStore
        .getState()
        .internalShow({ message: 'Invalid file type. Please select a .json file.', type: 'error', title: 'Import Error' });
      return;
    }
    const { result: content } = await errorHandler.attemptAsync(() => readAsText(file), 'File Read for Import');
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
      useNotificationStore.getState().internalShow({ message: warning, type: 'warning', title: 'Import Notice', duration: 7000 });
    }

    if (recipes.length === 0) {
      useNotificationStore.getState().internalShow({
        message: 'No valid recipes were found in the selected file.',
        type: 'warning',
        title: 'Import Notice',
      });
      return;
    }

    get().merge(recipes);
  },
  init: () => {
    const storedRecipes = storage.get<Array<unknown>>(STORAGE_COOKBOOK, 'Saved Recipes');
    if (!Array.isArray(storedRecipes)) {
      get().setRecipes([]);
      return;
    }

    const { recipes, hasCorruption }: SanitizedRecipesResult = processAndSanitizeRecipes(storedRecipes, 'storage');

    if (hasCorruption) {
      logger.warn('Corrupted cookbook data in storage; attempting partial recovery.');
      useNotificationStore.getState().internalShow({
        message: 'Some saved recipes may be corrupted and could not be loaded. Data will be cleaned on next save.',
        type: 'warning',
        title: 'Cookbook Warning',
        duration: 7000,
      });
    }

    get().setRecipes(recipes);
  },
  load: (id) => {
    const recipeToLoad = get().recipeIdMap.get(id);
    if (recipeToLoad) {
      useRecipeStore.getState().setRecipe(recipeToLoad.ingredients, recipeToLoad.id);
      useNotificationStore.getState().internalShow({ message: `Recipe '${recipeToLoad.name}' loaded.`, type: 'success', title: 'Cookbook Action' });
      get().closeModal();
    }
  },
  merge: (recipesToImport: ReadonlyArray<RecipeBookItem>) => {
    const { recipes, setRecipes } = get();
    logger.info('Merging imported recipes...', { importedCount: recipesToImport.length, existingCount: recipes.length });

    const recipeMap: Map<string, RecipeBookItem> = new Map(recipes.map((r) => [r.id, r]));
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
      const mergedList = Array.from(recipeMap.values());
      if (saveAllRecipes(mergedList)) {
        const summary = [
          added > 0 ? `${added} new recipe${added > 1 ? 's' : ''} added.` : '',
          updated > 0 ? `${updated} recipe${updated > 1 ? 's' : ''} updated.` : '',
          skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (older versions).` : '',
        ]
          .filter(Boolean)
          .join(' ');
        if (summary) {
          useNotificationStore.getState().internalShow({ message: summary, type: 'success', title: 'Import Complete' });
        }
        setRecipes(mergedList);
      }
    } else {
      const summary = skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (duplicates or outdated).` : 'No new recipes to import.';
      useNotificationStore.getState().internalShow({ message: summary, type: 'info', title: 'Import Notice' });
    }
  },
  open: (args) => {
    if (args.mode === 'load') {
      get().openModal({
        name: '',
        mode: 'load',
      });
      return;
    }
    const { ingredients, activeRecipeId } = args;
    const initialName = args.name ?? get().computeInitialName(ingredients, activeRecipeId);
    get().openModal({
      name: initialName,
      mode: 'save',
    });
  },
  openModal: (args) => {
    set({
      isModalOpen: true,
      modalMode: args.mode,
      nameInput: args.name,
      query: '',
    });
  },
  resetModal: () => {
    set({
      nameInput: '',
      modalMode: null,
      query: '',
    });
  },
  setName: (nameInput) => {
    set({ nameInput });
  },
  setQuery: (query) => {
    set({ query });
  },
  setRecipes: (newRecipes: ReadonlyArray<RecipeBookItem>) => {
    const recipes = [...newRecipes].sort((a, b) => b.updatedAt - a.updatedAt);
    const idMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const contentHashMap = new Map<string, string>();
    for (const recipe of recipes) {
      contentHashMap.set(createRecipeHash(recipe.ingredients), recipe.id);
    }
    set({
      recipes,
      recipeIdMap: idMap,
      recipeContentHashMap: contentHashMap,
    });
  },
  upsert: () => {
    const { nameInput, recipes, recipeIdMap, setRecipes } = get();
    const { ingredients, activeRecipeId, setActiveRecipeId } = useRecipeStore.getState();
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      useNotificationStore.getState().internalShow({ message: 'The recipe name cannot be empty.', type: 'warning', title: 'Save Error' });
      return;
    }

    const shouldForceCreate = ingredients.length === 0 || activeRecipeId === null;
    const recipeToUpdate = activeRecipeId ? recipeIdMap.get(activeRecipeId) : null;
    const isUpdate = !shouldForceCreate && !!recipeToUpdate && recipeToUpdate.name.trim().toLowerCase() === trimmedName.toLowerCase();

    const now = Date.now();
    let finalRecipes: ReadonlyArray<RecipeBookItem>;
    let recipeToSave: RecipeBookItem;
    let userMessage: string;

    if (isUpdate && recipeToUpdate) {
      recipeToSave = { ...recipeToUpdate, name: trimmedName, ingredients, updatedAt: now };
      const recipeIndex = recipes.findIndex((r) => r.id === recipeToUpdate.id);
      const updatedRecipes = [...recipes];
      if (recipeIndex !== -1) {
        updatedRecipes[recipeIndex] = recipeToSave;
      }
      finalRecipes = updatedRecipes;
      userMessage = `Recipe '${trimmedName}' was updated.`;
    } else {
      recipeToSave = { id: crypto.randomUUID(), name: trimmedName, ingredients, createdAt: now, updatedAt: now };
      finalRecipes = [recipeToSave, ...recipes];
      userMessage = recipeToUpdate ? `Recipe '${trimmedName}' saved as a new copy.` : `Recipe '${trimmedName}' was saved.`;
    }

    if (saveAllRecipes(finalRecipes)) {
      setRecipes(finalRecipes);
      setActiveRecipeId(recipeToSave.id);
      useNotificationStore.getState().internalShow({ message: userMessage, type: 'success', title: 'Cookbook Action' });
    }
  },
}));
