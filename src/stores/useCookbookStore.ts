import * as v from 'valibot';
import { safeParse } from 'valibot';
import { create } from 'zustand';

import { STORAGE_COOKBOOK } from '../app/constants';
import { errorHandler, ingredientRegistry, logger, storage } from '../app/container';
import { validateSpices } from '../helpers/spiceHelper';
import { readAsText, sanitizeFileName, triggerDownload } from '../utilities/fileUtil';
import { useNotificationStore } from './useNotificationStore';
import { useRecipeStore } from './useRecipeStore';

import type { Ingredient, RecipeBookItem } from '../core/IngredientRegistry';

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

const CookbookImportSchema = v.array(RecipeBookItemSchema);

interface SanitizationResult {
  readonly recipe: RecipeBookItem | null;
  readonly warning: string | null;
}

interface SerializedRecipeItem extends Omit<RecipeBookItem, 'ingredients'> {
  readonly ingredients: readonly {
    readonly id: string;
    readonly name: string | undefined;
    readonly spices: Readonly<Record<string, unknown>>;
  }[];
}

type OpenCookbookArgs =
  | { readonly mode: 'load' }
  | { readonly mode: 'save'; readonly ingredients: readonly Ingredient[]; readonly activeRecipeId: string | null; readonly name?: string };

function createIngredientHash(ingredients: readonly Ingredient[]): string {
  const canonicalParts = ingredients.map((ing) => {
    const name = ingredientRegistry.getStringFromSymbol(ing.name) ?? ing.name.toString();
    const definition = ingredientRegistry.getIngredient(ing.name);

    if (!definition?.spices || definition.spices.length === 0) {
      return name;
    }

    const spicesString = [...definition.spices]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((spiceDef) => `${spiceDef.id}:${String(ing.spices[spiceDef.id])}`)
      .join(';');

    return `${name}|${spicesString}`;
  });
  return canonicalParts.join('||');
}

function serializeRecipe(recipe: Readonly<RecipeBookItem>): SerializedRecipeItem {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredientRegistry.getStringFromSymbol(ingredient.name),
      spices: ingredient.spices,
    })),
  };
}

function saveAllRecipes(recipes: readonly RecipeBookItem[]): boolean {
  const serialized = recipes.map(serializeRecipe);
  logger.info(`Saving ${serialized.length} recipes to storage.`);
  return storage.set(STORAGE_COOKBOOK, serialized, 'Saved Recipes');
}

function sanitizeIngredient(rawIngredient: RawIngredient, source: 'fileImport' | 'storage', recipeName: string): Ingredient | null {
  const ingredientNameSymbol = ingredientRegistry.getSymbolFromString(rawIngredient.name);
  if (!ingredientNameSymbol) {
    logger.warn(`Skipping unknown ingredient name '${rawIngredient.name}' from ${source} for recipe '${recipeName}'.`);
    return null;
  }
  const definition = ingredientRegistry.getIngredient(ingredientNameSymbol);
  if (!definition) {
    logger.warn(`Definition not found for known name symbol: '${rawIngredient.name}'.`);
    return null;
  }
  const validatedSpices = validateSpices(definition, rawIngredient.spices);
  return { id: rawIngredient.id, name: ingredientNameSymbol, spices: validatedSpices };
}

function sanitizeRecipe(rawRecipe: RawRecipeBookItem, source: 'fileImport' | 'storage'): SanitizationResult {
  const { id, name, createdAt, updatedAt, ingredients: rawIngredients } = rawRecipe;
  const validIngredients: Ingredient[] = [];
  for (const raw of rawIngredients) {
    const validIngredient = sanitizeIngredient(raw, source, name);
    if (validIngredient) {
      validIngredients.push(validIngredient);
    }
  }
  const ingredientDifference = rawIngredients.length - validIngredients.length;
  const warning =
    ingredientDifference > 0
      ? `Recipe '${name}' had ${ingredientDifference} invalid ingredient${ingredientDifference === 1 ? '' : 's'} that ${
          ingredientDifference === 1 ? 'was' : 'were'
        } removed.`
      : null;
  const recipe: RecipeBookItem = { id, name, ingredients: validIngredients, createdAt, updatedAt };
  return { recipe, warning };
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
  readonly _internalSetRecipes: (recipes: readonly RecipeBookItem[]) => void;
  readonly init: () => void;
  readonly resetModal: () => void;
  readonly setName: (name: string) => void;
  readonly setQuery: (term: string) => void;
  readonly setRecipes: (recipes: readonly RecipeBookItem[]) => void;
  readonly computeInitialName: (ingredients: readonly Ingredient[], activeRecipeId: string | null) => string;
  readonly upsert: () => void;
  readonly delete: (id: string) => void;
  readonly load: (id: string) => void;
  readonly merge: (recipesToImport: readonly RecipeBookItem[]) => void;
  readonly open: (args: Readonly<OpenCookbookArgs>) => void;
  readonly exportAll: () => void;
  readonly exportCurrent: () => void;
  readonly importFromFile: (file: File) => Promise<void>;
}

export const useCookbookStore = create<CookbookState>()((set, get) => ({
  isModalOpen: false,
  modalMode: null,
  nameInput: '',
  query: '',
  recipes: [],
  recipeIdMap: new Map(),
  recipeContentHashMap: new Map(),

  closeModal: () => set({ isModalOpen: false }),
  openModal: (args) => set({ isModalOpen: true, modalMode: args.mode, nameInput: args.name, query: '' }),
  resetModal: () => set({ nameInput: '', modalMode: null, query: '' }),
  setName: (name) => set({ nameInput: name }),
  setQuery: (term) => set({ query: term }),

  _internalSetRecipes: (recipes) => {
    const idMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const contentHashMap = new Map<string, string>();
    for (const recipe of recipes) {
      const hash = createIngredientHash(recipe.ingredients);
      contentHashMap.set(hash, recipe.id);
    }
    set({ recipes, recipeIdMap: idMap, recipeContentHashMap: contentHashMap });
  },

  setRecipes: (newRecipes) => {
    const recipes = [...newRecipes].sort((a, b) => b.updatedAt - a.updatedAt);
    get()._internalSetRecipes(recipes);
  },

  computeInitialName: (ingredients, activeRecipeId) => {
    if (ingredients.length === 0) return '';
    const { recipeIdMap, recipeContentHashMap } = get();
    if (activeRecipeId) {
      const activeRecipe = recipeIdMap.get(activeRecipeId);
      if (activeRecipe) return activeRecipe.name;
    }
    const currentHash = createIngredientHash(ingredients);
    const existingRecipeId = recipeContentHashMap.get(currentHash);
    if (existingRecipeId) {
      const existingRecipe = recipeIdMap.get(existingRecipeId);
      if (existingRecipe) return existingRecipe.name;
    }
    const date = new Date();
    const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `My Recipe ${dateString}`;
  },

  init: () => {
    const { show } = useNotificationStore.getState();
    const storedRecipes = storage.get(STORAGE_COOKBOOK, 'Saved Recipes');
    if (!Array.isArray(storedRecipes)) {
      get().setRecipes([]);
      return;
    }
    const rawItems: unknown[] = storedRecipes;
    const validationResult = safeParse(CookbookImportSchema, rawItems);
    if (!validationResult.success) {
      logger.warn('Corrupted cookbook data in storage, attempting partial recovery.', { issues: validationResult.issues });
      show('Some saved recipes were corrupted and could not be loaded. Data will be cleaned on next save.', 'warning', 'Cookbook Warning', 7000);
    }
    const sanitizedRecipes = rawItems.reduce<RecipeBookItem[]>((acc, item) => {
      const itemValidation = safeParse(RecipeBookItemSchema, item);
      if (itemValidation.success) {
        const { recipe } = sanitizeRecipe(itemValidation.output, 'storage');
        if (recipe) acc.push(recipe);
      }
      return acc;
    }, []);
    get().setRecipes(sanitizedRecipes);
  },

  upsert: () => {
    const { nameInput, recipes, _internalSetRecipes, recipeIdMap } = get();
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
    let newRecipes: RecipeBookItem[];
    let recipeToSave: RecipeBookItem;
    let userMessage: string;

    if (isUpdate) {
      recipeToSave = { ...recipeToUpdate, name: trimmedName, ingredients, updatedAt: now };
      newRecipes = [recipeToSave, ...recipes.filter((r) => r.id !== recipeToSave.id)];
      userMessage = `Recipe '${trimmedName}' was updated.`;
    } else {
      recipeToSave = { id: crypto.randomUUID(), name: trimmedName, ingredients, createdAt: now, updatedAt: now };
      newRecipes = [recipeToSave, ...recipes];
      userMessage = recipeToUpdate ? `Recipe '${trimmedName}' saved as a new copy.` : `Recipe '${trimmedName}' was saved.`;
    }

    if (saveAllRecipes(newRecipes)) {
      _internalSetRecipes(newRecipes);
      useRecipeStore.getState().setActiveRecipeId(recipeToSave.id);
      show(userMessage, 'success', 'Cookbook Action');
    }
  },

  delete: (id) => {
    const { show } = useNotificationStore.getState();
    const { recipes, recipeIdMap, _internalSetRecipes } = get();
    const recipeToDelete = recipeIdMap.get(id);
    const updatedList = recipes.filter((recipe) => recipe.id !== id);
    if (saveAllRecipes(updatedList)) {
      _internalSetRecipes(updatedList);
      if (recipeToDelete) {
        show(`Recipe '${recipeToDelete.name}' was deleted.`, 'info', 'Cookbook Action');
      }
    }
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

  merge: (recipesToImport) => {
    const { show } = useNotificationStore.getState();
    const { recipes, setRecipes } = get();
    logger.info('Merging imported recipes...', { importedCount: recipesToImport.length, existingCount: recipes.length });
    const existingRecipes = recipes;
    const mergedById = new Map<string, RecipeBookItem>();
    for (const recipe of existingRecipes) mergedById.set(recipe.id, recipe);
    let added = 0,
      updated = 0,
      skipped = 0;
    for (const item of recipesToImport) {
      const existingItem = mergedById.get(item.id);
      if (!existingItem) {
        mergedById.set(item.id, item);
        added++;
      } else if (item.updatedAt > existingItem.updatedAt) {
        mergedById.set(item.id, item);
        updated++;
      } else {
        skipped++;
      }
    }
    const mergedList = Array.from(mergedById.values());
    if (saveAllRecipes(mergedList)) {
      const summary = [
        added > 0 ? `${added} new recipe${added > 1 ? 's' : ''} added.` : '',
        updated > 0 ? `${updated} recipe${updated > 1 ? 's' : ''} updated.` : '',
        skipped > 0 ? `${skipped} recipe${skipped > 1 ? 's' : ''} skipped (older versions).` : '',
      ]
        .filter(Boolean)
        .join(' ');
      if (summary) show(summary, 'success', 'Import Complete');
      else show('No changes were made; recipes may be duplicates or outdated.', 'info', 'Import Notice');
      setRecipes(mergedList);
    }
  },

  open: (args) => {
    if (args.mode === 'load') {
      get().openModal({ name: '', mode: 'load' });
      return;
    }
    const { ingredients, activeRecipeId } = args;
    const initialName = args.name ?? get().computeInitialName(ingredients, activeRecipeId);
    get().openModal({ name: initialName, mode: 'save' });
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
    if (!content) return;
    const { result: jsonData } = errorHandler.attempt<unknown>(() => JSON.parse(content), 'JSON Parsing for Import');
    if (!jsonData) return;
    const dataToValidate = Array.isArray(jsonData) ? jsonData : [jsonData];
    const fullValidation = safeParse(CookbookImportSchema, dataToValidate);
    let validRawRecipes: RawRecipeBookItem[];
    if (fullValidation.success) {
      validRawRecipes = fullValidation.output;
    } else {
      logger.warn('Cookbook import validation failed, attempting partial recovery.', { issues: fullValidation.issues });
      validRawRecipes = dataToValidate.reduce<RawRecipeBookItem[]>((acc, item) => {
        const itemValidation = safeParse(RecipeBookItemSchema, item);
        if (itemValidation.success) acc.push(itemValidation.output);
        return acc;
      }, []);
      if (validRawRecipes.length < dataToValidate.length) {
        show('Some recipe entries in the file were malformed and have been skipped.', 'warning', 'Import Notice', 7000);
      }
    }
    if (validRawRecipes.length === 0) {
      show('No valid recipes were found in the selected file.', 'warning', 'Import Notice');
      return;
    }
    const allWarnings = new Set<string>();
    const recipes = validRawRecipes.reduce<RecipeBookItem[]>((acc, rawRecipe) => {
      const { recipe, warning } = sanitizeRecipe(rawRecipe, 'fileImport');
      if (recipe) acc.push(recipe);
      if (warning) allWarnings.add(warning);
      return acc;
    }, []);
    for (const warning of allWarnings) show(warning, 'warning', 'Recipe Load Notice', 7000);
    if (recipes.length === 0) {
      show('No valid recipes were found after sanitization.', 'warning', 'Import Notice');
      return;
    }
    if (recipes) get().merge(recipes);
  },
}));
