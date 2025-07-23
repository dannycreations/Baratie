import * as v from 'valibot';
import { safeParse } from 'valibot';
import { create } from 'zustand';

import { STORAGE_COOKBOOK } from '../app/constants';
import { errorHandler, ingredientRegistry, logger, storage } from '../app/container';
import { createRecipeContentHash } from '../helpers/recipeHelper';
import { validateSpices } from '../helpers/spiceHelper';
import { readAsText, sanitizeFileName, triggerDownload } from '../utilities/fileUtil';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

import type { IngredientItem, RecipeBookItem } from '../core/IngredientRegistry';

const SpiceValueSchema = v.union([v.string(), v.number(), v.boolean()]);

const RawIngredientSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty('Ingredient ID cannot be empty.')),
  name: v.pipe(v.string(), v.nonEmpty('Ingredient name cannot be empty.')),
  spices: v.record(v.string(), v.optional(SpiceValueSchema)),
});

type RawIngredient = v.InferInput<typeof RawIngredientSchema>;

const RecipeBookItemSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  name: v.pipe(v.string(), v.nonEmpty()),
  ingredients: v.array(RawIngredientSchema),
  createdAt: v.number(),
  updatedAt: v.number(),
});

type RawRecipeBookItem = v.InferInput<typeof RecipeBookItemSchema>;

interface SanitizationResult {
  readonly recipe: RecipeBookItem | null;
  readonly warning: string | null;
}

interface SanitizedRecipesResult {
  readonly recipes: ReadonlyArray<RecipeBookItem>;
  readonly warnings: ReadonlySet<string>;
  readonly hasCorruption: boolean;
}

interface SerializedRecipeItem extends Omit<RecipeBookItem, 'ingredients'> {
  readonly ingredients: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly spices: Readonly<Record<string, unknown>>;
  }>;
}

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

function serializeRecipe(recipe: Readonly<RecipeBookItem>): SerializedRecipeItem {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      spices: ingredient.spices,
    })),
  };
}

function saveAllRecipes(recipes: ReadonlyArray<RecipeBookItem>): boolean {
  const serialized = recipes.map(serializeRecipe);
  logger.info(`Saving ${serialized.length} recipes to storage.`);
  return storage.set(STORAGE_COOKBOOK, serialized, 'Saved Recipes');
}

function sanitizeIngredient(rawIngredient: RawIngredient, source: 'fileImport' | 'storage', recipeName: string): IngredientItem | null {
  const definition = ingredientRegistry.getIngredient(rawIngredient.name);

  if (!definition) {
    logger.warn(`Skipping unknown ingredient name or ID '${rawIngredient.name}' from ${source} for recipe '${recipeName}'.`);
    return null;
  }

  const validatedSpices = validateSpices(definition, rawIngredient.spices);
  return { id: rawIngredient.id, name: definition.id, spices: validatedSpices };
}

function sanitizeRecipe(rawRecipe: RawRecipeBookItem, source: 'fileImport' | 'storage'): SanitizationResult {
  const { id, name, createdAt, updatedAt, ingredients: rawIngredients } = rawRecipe;
  const validIngredients: Array<IngredientItem> = [];
  for (const raw of rawIngredients) {
    const validIngredient = sanitizeIngredient(raw, source, name);
    if (validIngredient) {
      validIngredients.push(validIngredient);
    }
  }
  const ingredientDifference = rawIngredients.length - validIngredients.length;
  const warning =
    ingredientDifference > 0
      ? `Recipe '${name}' had ${ingredientDifference} invalid ingredient${
          ingredientDifference === 1 ? '' : 's'
        } that ${ingredientDifference === 1 ? 'was' : 'were'} removed.`
      : null;
  const recipe: RecipeBookItem = { id, name, ingredients: validIngredients, createdAt, updatedAt };
  return { recipe, warning };
}

function processAndSanitizeRecipes(rawItems: ReadonlyArray<unknown>, source: 'fileImport' | 'storage'): SanitizedRecipesResult {
  const allWarnings = new Set<string>();
  let corruptionCount = 0;
  const recipes = rawItems.reduce<Array<RecipeBookItem>>((acc, rawItem) => {
    const itemValidation = safeParse(RecipeBookItemSchema, rawItem);
    if (itemValidation.success) {
      const { recipe, warning } = sanitizeRecipe(itemValidation.output, source);
      if (recipe) {
        acc.push(recipe);
      }
      if (warning) {
        allWarnings.add(warning);
      }
    } else {
      corruptionCount++;
    }
    return acc;
  }, []);
  return { recipes, warnings: allWarnings, hasCorruption: corruptionCount > 0 };
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
    const currentHash = createRecipeContentHash(ingredients);
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
    const { show } = useNotificationStore.getState();
    const { recipes, recipeIdMap, recipeContentHashMap } = get();
    const recipeToDelete = recipeIdMap.get(id);
    if (!recipeToDelete) {
      return;
    }

    const indexToDelete = recipes.findIndex((r) => r.id === id);

    if (indexToDelete === -1) {
      logger.error(`Cookbook state inconsistency: recipe ${id} found in map but not in array.`);
      return;
    }

    const updatedList = [...recipes];
    updatedList.splice(indexToDelete, 1);

    if (saveAllRecipes(updatedList)) {
      const hash = createRecipeContentHash(recipeToDelete.ingredients);
      const newIdMap = new Map(recipeIdMap);
      newIdMap.delete(id);
      const newContentHashMap = new Map(recipeContentHashMap);
      if (newContentHashMap.get(hash) === id) {
        newContentHashMap.delete(hash);
      }
      set({
        recipes: updatedList,
        recipeIdMap: newIdMap,
        recipeContentHashMap: newContentHashMap,
      });
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
    const serialized = recipes.map(serializeRecipe);
    triggerDownload(JSON.stringify(serialized, null, 2), fileName);
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
    const recipeToExport: RecipeBookItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      ingredients,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const fileName = `${sanitizeFileName(recipeToExport.name, 'recipe')}.json`;
    triggerDownload(JSON.stringify(serializeRecipe(recipeToExport), null, 2), fileName);
    show(`Recipe '${recipeToExport.name}' is ready for download.`, 'success', 'Export Successful');
  },
  importFromFile: async (file) => {
    const { show } = useNotificationStore.getState();
    if (file.type !== 'application/json') {
      show('Invalid file type. Please select a .json file.', 'error', 'Import Error');
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
    const { recipes, warnings, hasCorruption } = processAndSanitizeRecipes(dataToValidate, 'fileImport');

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

    const { recipes, hasCorruption } = processAndSanitizeRecipes(storedRecipes, 'storage');

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
      get().closeModal();
    }
  },
  merge: (recipesToImport: ReadonlyArray<RecipeBookItem>) => {
    const { show } = useNotificationStore.getState();
    const { recipeIdMap, recipeContentHashMap } = get();
    logger.info('Merging imported recipes...', { importedCount: recipesToImport.length, existingCount: recipeIdMap.size });

    const newIdMap = new Map<string, RecipeBookItem>(recipeIdMap);
    const newContentHashMap = new Map<string, string>(recipeContentHashMap);
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of recipesToImport) {
      const existingItem = newIdMap.get(item.id);
      if (!existingItem) {
        newIdMap.set(item.id, item);
        newContentHashMap.set(createRecipeContentHash(item.ingredients), item.id);
        added++;
      } else if (item.updatedAt > existingItem.updatedAt) {
        const oldHash = createRecipeContentHash(existingItem.ingredients);
        if (newContentHashMap.get(oldHash) === existingItem.id) {
          newContentHashMap.delete(oldHash);
        }
        newIdMap.set(item.id, item);
        newContentHashMap.set(createRecipeContentHash(item.ingredients), item.id);
        updated++;
      } else {
        skipped++;
      }
    }

    if (added > 0 || updated > 0) {
      const mergedList = Array.from(newIdMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
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
        set({
          recipes: mergedList,
          recipeIdMap: newIdMap,
          recipeContentHashMap: newContentHashMap,
        });
      }
    } else {
      const summary = skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (duplicates or outdated).` : 'No new recipes to import.';
      show(summary, 'info', 'Import Notice');
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
      contentHashMap.set(createRecipeContentHash(recipe.ingredients), recipe.id);
    }
    set({
      recipes,
      recipeIdMap: idMap,
      recipeContentHashMap: contentHashMap,
    });
  },
  upsert: () => {
    const { nameInput, recipes, recipeIdMap, recipeContentHashMap } = get();
    const { ingredients, activeRecipeId } = useRecipeStore.getState();
    const { show } = useNotificationStore.getState();
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      show('The recipe name cannot be empty.', 'warning', 'Save Error');
      return;
    }
    if (ingredients.length === 0) {
      show('Cannot save an empty recipe. Please add ingredients first.', 'warning', 'Save Error');
      return;
    }
    const now = Date.now();
    const recipeToUpdate = activeRecipeId ? recipeIdMap.get(activeRecipeId) : null;
    const isUpdate = !!recipeToUpdate && recipeToUpdate.name.toLowerCase() === trimmedName.toLowerCase();

    let finalRecipes: ReadonlyArray<RecipeBookItem>;
    let recipeToSave: RecipeBookItem;
    let userMessage: string;
    const newIdMap = new Map<string, RecipeBookItem>(recipeIdMap);
    const newContentHashMap = new Map<string, string>(recipeContentHashMap);

    if (isUpdate) {
      recipeToSave = { ...recipeToUpdate, name: trimmedName, ingredients, updatedAt: now };
      const oldHash = createRecipeContentHash(recipeToUpdate.ingredients);
      if (newContentHashMap.get(oldHash) === recipeToUpdate.id) {
        newContentHashMap.delete(oldHash);
      }
      finalRecipes = [recipeToSave, ...recipes.filter((r) => r.id !== recipeToUpdate.id)];
      userMessage = `Recipe '${trimmedName}' was updated.`;
    } else {
      recipeToSave = { id: crypto.randomUUID(), name: trimmedName, ingredients, createdAt: now, updatedAt: now };
      finalRecipes = [recipeToSave, ...recipes];
      userMessage = recipeToUpdate ? `Recipe '${trimmedName}' saved as a new copy.` : `Recipe '${trimmedName}' was saved.`;
    }

    newContentHashMap.set(createRecipeContentHash(recipeToSave.ingredients), recipeToSave.id);
    newIdMap.set(recipeToSave.id, recipeToSave);

    if (saveAllRecipes(finalRecipes)) {
      set({
        recipes: finalRecipes,
        recipeIdMap: newIdMap,
        recipeContentHashMap: newContentHashMap,
      });
      useRecipeStore.getState().setActiveRecipeId(recipeToSave.id);
      show(userMessage, 'success', 'Cookbook Action');
    }
  },
}));
