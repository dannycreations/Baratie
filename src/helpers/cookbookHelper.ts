import * as v from 'valibot';
import { safeParse } from 'valibot';

import { STORAGE_COOKBOOK } from '../app/constants';
import { errorHandler, ingredientRegistry, logger, storage } from '../app/container';
import { useCookbookStore } from '../stores/useCookbookStore';
import { useRecipeStore } from '../stores/useRecipeStore';
import { readAsText, sanitizeFileName, triggerDownload } from '../utilities/fileUtil';
import { showNotification } from './notificationHelper';
import { validateSpices } from './spiceHelper';

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
  return JSON.stringify(
    ingredients.map((ing) => ({
      name: ingredientRegistry.getStringFromSymbol(ing.name) ?? ing.name.toString(),
      spices: ing.spices,
    })),
  );
}

function createInitialName(allRecipes: readonly RecipeBookItem[], ingredients: readonly Ingredient[], activeRecipeId: string | null): string {
  if (ingredients.length === 0) {
    return '';
  }
  if (activeRecipeId) {
    const activeRecipe = allRecipes.find((recipe) => recipe.id === activeRecipeId);
    if (activeRecipe) {
      return activeRecipe.name;
    }
  }
  const currentHash = createIngredientHash(ingredients);
  const existingRecipe = allRecipes.find((recipe) => createIngredientHash(recipe.ingredients) === currentHash);
  if (existingRecipe) {
    return existingRecipe.name;
  }
  const date = new Date();
  const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `My Recipe ${dateString}`;
}

function mergeRecipeLists(
  existingRecipes: readonly RecipeBookItem[],
  recipesToImport: readonly RecipeBookItem[],
): { readonly mergedList: readonly RecipeBookItem[]; readonly added: number; readonly updated: number; readonly skipped: number } {
  const mergedById = new Map<string, RecipeBookItem>();
  const finalNames = new Set<string>();
  for (const recipe of existingRecipes) {
    mergedById.set(recipe.id, recipe);
    finalNames.add(recipe.name.toLowerCase());
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of recipesToImport) {
    const existingItem = mergedById.get(item.id);
    if (existingItem) {
      if (item.updatedAt > existingItem.updatedAt) {
        mergedById.set(item.id, item);
        updated++;
      } else {
        skipped++;
      }
    } else {
      let uniqueName = item.name;
      let counter = 1;
      while (finalNames.has(uniqueName.toLowerCase()) && counter < 100) {
        uniqueName = `${item.name} (Imported ${counter})`;
        counter++;
      }
      const newItem = { ...item, name: uniqueName };
      mergedById.set(newItem.id, newItem);
      finalNames.add(uniqueName.toLowerCase());
      added++;
    }
  }

  const mergedList = Array.from(mergedById.values());
  mergedList.sort((a, b) => b.updatedAt - a.updatedAt);
  return { mergedList, added, updated, skipped };
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

export function deleteRecipe(id: string): void {
  const { recipes, setRecipes } = useCookbookStore.getState();
  const recipeToDelete = recipes.find((recipe) => recipe.id === id);
  const updatedList = recipes.filter((recipe) => recipe.id !== id);

  if (saveAllRecipes(updatedList)) {
    setRecipes(updatedList);
    if (recipeToDelete) {
      showNotification(`Recipe '${recipeToDelete.name}' was deleted.`, 'info', 'Cookbook Action');
    }
  }
}

export function exportAll(recipes: readonly RecipeBookItem[]): void {
  if (recipes.length === 0) {
    showNotification('There are no saved recipes to export.', 'info', 'Export All');
    return;
  }
  const fileName = 'baratie_cookbook_export.json';
  const serialized = recipes.map(serializeRecipe);
  triggerDownload(JSON.stringify(serialized, null, 2), fileName);
  showNotification(`${recipes.length} recipes are ready for download.`, 'success', 'Export All Successful');
}

export function exportSingle(name: string, ingredients: readonly Ingredient[]): void {
  const trimmedName = name.trim();
  if (!trimmedName) {
    showNotification('The recipe name cannot be empty.', 'warning', 'Export Error');
    return;
  }
  if (ingredients.length === 0) {
    showNotification('Cannot export an empty recipe. Please add ingredients first.', 'warning', 'Export Error');
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
  showNotification(`Recipe '${recipeToExport.name}' is ready for download.`, 'success', 'Export Successful');
}

export async function importFromFile(file: File): Promise<RecipeBookItem[] | null> {
  if (file.type !== 'application/json') {
    showNotification('Invalid file type. Please select a .json file.', 'error', 'Import Error');
    return null;
  }
  const { result: content } = await errorHandler.attemptAsync(() => readAsText(file), 'File Read for Import');
  if (!content) return null;
  const { result: jsonData } = errorHandler.attempt<unknown>(() => JSON.parse(content), 'JSON Parsing for Import');
  if (!jsonData) return null;

  const dataToValidate = Array.isArray(jsonData) ? jsonData : [jsonData];
  const validationResult = safeParse(CookbookImportSchema, dataToValidate);

  if (!validationResult.success) {
    const issue = validationResult.issues[0];
    const path = issue.path?.map((p) => p.key).join('.');
    const errorMessage = `Imported file has invalid structure: ${issue.message} at path '${path || 'root'}'.`;
    showNotification(errorMessage, 'error', 'Import Error', 7000);
    logger.warn('Cookbook import validation failed', { issues: validationResult.issues });
    return null;
  }

  const results = validationResult.output.map((rawRecipe) => sanitizeRecipe(rawRecipe, 'fileImport'));
  const recipes = results.map((res) => res.recipe).filter((recipe): recipe is RecipeBookItem => !!recipe);
  for (const { warning } of results) {
    if (warning) {
      showNotification(warning, 'warning', 'Recipe Load Notice', 7000);
    }
  }
  if (recipes.length === 0) {
    showNotification('No valid recipes were found in the selected file.', 'warning', 'Import Notice');
    return null;
  }
  return recipes;
}

export function initRecipes(): void {
  const storedRecipes = storage.get(STORAGE_COOKBOOK, 'Saved Recipes');
  if (!Array.isArray(storedRecipes)) {
    useCookbookStore.getState().setRecipes([]);
    return;
  }

  const validationResult = safeParse(CookbookImportSchema, storedRecipes);

  let recipesToSanitize: RawRecipeBookItem[];

  if (!validationResult.success) {
    logger.warn('Corrupted cookbook data in storage, attempting partial recovery.', { issues: validationResult.issues });
    showNotification(
      'Some saved recipes were corrupted and could not be loaded. Data will be cleaned on next save.',
      'warning',
      'Cookbook Warning',
      7000,
    );
    recipesToSanitize = storedRecipes.filter((r) => safeParse(RecipeBookItemSchema, r).success) as RawRecipeBookItem[];
  } else {
    recipesToSanitize = validationResult.output;
  }

  const sanitized = recipesToSanitize
    .map((rawRecipe) => sanitizeRecipe(rawRecipe, 'storage').recipe)
    .filter((recipe): recipe is RecipeBookItem => !!recipe);
  sanitized.sort((a, b) => b.updatedAt - a.updatedAt);
  useCookbookStore.getState().setRecipes(sanitized);
}

export function loadRecipe(id: string): RecipeBookItem | null {
  const recipeToLoad = useCookbookStore.getState().recipes.find((recipe) => recipe.id === id);
  if (recipeToLoad) {
    useRecipeStore.getState().setRecipe(recipeToLoad.ingredients, recipeToLoad.id);
    showNotification(`Recipe '${recipeToLoad.name}' loaded.`, 'success', 'Cookbook Action');
    return recipeToLoad;
  }
  return null;
}

export function mergeRecipes(recipesToImport: readonly RecipeBookItem[]): void {
  const { recipes, setRecipes } = useCookbookStore.getState();
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
    setRecipes(mergedList);
  }
}

export function openCookbook(args: Readonly<OpenCookbookArgs>): void {
  if (args.mode === 'load') {
    useCookbookStore.getState().openModal({ name: '', mode: 'load' });
    return;
  }
  const { ingredients, activeRecipeId } = args;
  const allRecipes = useCookbookStore.getState().recipes;
  const initialName = args.name ?? createInitialName(allRecipes, ingredients, activeRecipeId);
  useCookbookStore.getState().openModal({ name: initialName, mode: 'save' });
}

export function saveAllRecipes(recipes: readonly RecipeBookItem[]): boolean {
  const serialized = recipes.map(serializeRecipe);
  logger.info(`Saving ${serialized.length} recipes to storage.`);
  return storage.set(STORAGE_COOKBOOK, serialized, 'Saved Recipes');
}

export function serializeRecipe(recipe: Readonly<RecipeBookItem>): SerializedRecipeItem {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredientRegistry.getStringFromSymbol(ingredient.name),
      spices: ingredient.spices,
    })),
  };
}

export function upsertRecipe(name: string, ingredients: readonly Ingredient[], activeRecipeId: string | null): void {
  const trimmedName = name.trim();
  if (!trimmedName) {
    showNotification('The recipe name cannot be empty.', 'warning', 'Save Error');
    return;
  }
  if (ingredients.length === 0) {
    showNotification('Cannot save an empty recipe. Please add ingredients first.', 'warning', 'Save Error');
    return;
  }

  const { recipes, setRecipes } = useCookbookStore.getState();
  const now = Date.now();
  const recipeToUpdate = activeRecipeId ? recipes.find((r) => r.id === activeRecipeId) : null;
  const isUpdate = recipeToUpdate && recipeToUpdate.name.toLowerCase() === trimmedName.toLowerCase();
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
    setRecipes(newRecipes);
    useRecipeStore.getState().setActiveRecipeId(recipeToSave.id);
    showNotification(userMessage, 'success', 'Cookbook Action');
  }
}
