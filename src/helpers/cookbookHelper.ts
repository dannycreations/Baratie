import { STORAGE_COOKBOOK } from '../app/constants';
import { errorHandler, ingredientRegistry, logger, storage } from '../app/container';
import { InputType } from '../core/InputType';
import { useCookbookStore } from '../stores/useCookbookStore';
import { readAsText, triggerDownload } from '../utilities/fileUtil';
import { showNotification } from './notificationHelper';
import { validateSpices } from './spiceHelper';

import type { Ingredient, RecipeBookItem } from '../core/IngredientRegistry';

interface RawIngredient {
  readonly id: string;
  readonly name: string;
  readonly spices: Readonly<Record<string, unknown>>;
}

interface SerializedRecipeItem extends Omit<RecipeBookItem, 'ingredients'> {
  readonly ingredients: readonly {
    readonly id: string;
    readonly name: string | undefined;
    readonly spices: Readonly<Record<string, unknown>>;
  }[];
}

type OpenCookbookArgs = { readonly mode: 'load' } | { readonly mode: 'save'; readonly ingredients: readonly Ingredient[] };

function isRawIngredient(data: unknown): data is RawIngredient {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    obj.id.trim() !== '' &&
    typeof obj.name === 'string' &&
    obj.name.trim() !== '' &&
    typeof obj.spices === 'object' &&
    obj.spices !== null &&
    !Array.isArray(obj.spices)
  );
}

function sanitizeRecipe(recipeData: unknown, source: 'fileImport' | 'storage'): RecipeBookItem | null {
  if (typeof recipeData !== 'object' || recipeData === null) {
    logger.warn(`Skipping non-object item during recipe sanitization from ${source}:`, recipeData);
    return null;
  }
  const rawRecipe = recipeData as Record<string, unknown>;

  const id = typeof rawRecipe.id === 'string' && rawRecipe.id.trim() ? rawRecipe.id.trim() : crypto.randomUUID();
  const name = typeof rawRecipe.name === 'string' && rawRecipe.name.trim() ? rawRecipe.name.trim() : `Untitled from ${source}`;
  const createdAt = typeof rawRecipe.createdAt === 'number' ? rawRecipe.createdAt : Date.now();
  const updatedAt = typeof rawRecipe.updatedAt === 'number' ? rawRecipe.updatedAt : Date.now();
  const rawIngredients: readonly unknown[] = Array.isArray(rawRecipe.ingredients) ? rawRecipe.ingredients : [];
  const validIngredients: Ingredient[] = [];

  for (const rawIngredient of rawIngredients) {
    if (!isRawIngredient(rawIngredient)) {
      logger.warn(`Skipping ingredient with invalid structure from ${source} for recipe '${name}':`, rawIngredient);
      continue;
    }
    const ingredientNameSymbol = ingredientRegistry.getSymbolFromString(rawIngredient.name);
    if (!ingredientNameSymbol) {
      logger.warn(`Skipping unknown ingredient name '${rawIngredient.name}' from ${source} for recipe '${name}'.`);
      continue;
    }
    const definition = ingredientRegistry.getIngredient(ingredientNameSymbol);
    if (!definition) {
      logger.warn(`Definition not found for known name symbol: '${rawIngredient.name}'.`);
      continue;
    }
    const validatedSpices = validateSpices(definition, rawIngredient.spices);
    validIngredients.push({ id: rawIngredient.id, name: ingredientNameSymbol, spices: validatedSpices });
  }

  if (validIngredients.length !== rawIngredients.length && rawIngredients.length > 0) {
    const ingredientDifference = rawIngredients.length - validIngredients.length;
    const plural = ingredientDifference > 1;
    const ingredientText = `ingredient${plural ? 's' : ''}`;
    const verbText = plural ? 'were' : 'was';
    showNotification(
      `Recipe '${name}' had ${ingredientDifference} invalid ${ingredientText} that ${verbText} removed.`,
      'warning',
      'Recipe Load Notice',
      7000,
    );
  }

  return { id, name, ingredients: validIngredients, createdAt, updatedAt };
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

function validateRecipe(name: string, ingredients: readonly Ingredient[]): string | null {
  if (!name.trim()) {
    return 'The recipe name cannot be empty.';
  }
  if (ingredients.length === 0) {
    return 'Cannot save an empty recipe. Please add ingredients first.';
  }
  return null;
}

export function upsertRecipe(name: string, ingredients: readonly Ingredient[], activeRecipeId: string | null): void {
  const error = validateRecipe(name, ingredients);
  if (error) {
    showNotification(error, 'warning', 'Save Error');
    return;
  }
  useCookbookStore.getState().upsertRecipe(name, ingredients, activeRecipeId);
}

export function closeCookbook(): void {
  useCookbookStore.getState().closeModal();
}

export function deleteRecipe(id: string): void {
  useCookbookStore.getState().deleteRecipe(id);
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
  const error = validateRecipe(name, ingredients);
  if (error) {
    showNotification(error, 'warning', 'Export Error');
    return;
  }

  const trimmedName = name.trim();
  const recipeToExport: RecipeBookItem = {
    id: crypto.randomUUID(),
    name: trimmedName,
    ingredients,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const fileName = `${new InputType(recipeToExport.name).asFileName('recipe')}.json`;
  triggerDownload(JSON.stringify(serializeRecipe(recipeToExport), null, 2), fileName);
  showNotification(`Recipe '${recipeToExport.name}' is ready for download.`, 'success', 'Export Successful');
}

export function getAllRecipes(): readonly RecipeBookItem[] {
  return useCookbookStore.getState().recipes;
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

  const recipes = (Array.isArray(jsonData) ? jsonData : [jsonData])
    .map((rawRecipe) => sanitizeRecipe(rawRecipe, 'fileImport'))
    .filter((recipe): recipe is RecipeBookItem => recipe !== null);
  if (recipes.length === 0) {
    showNotification('No valid recipes were found in the selected file.', 'warning', 'Import Notice');
    return null;
  }
  return recipes;
}

export function initRecipes(): void {
  const recipes = storage.get(STORAGE_COOKBOOK, 'Saved Recipes');
  const sanitized = (Array.isArray(recipes) ? recipes : [])
    .map((rawRecipe) => sanitizeRecipe(rawRecipe, 'storage'))
    .filter((recipe): recipe is RecipeBookItem => recipe !== null);
  useCookbookStore.getState().setRecipes(sanitized);
}

export function loadRecipe(id: string): void {
  useCookbookStore.getState().load(id);
}

export function mergeRecipes(recipesToImport: readonly RecipeBookItem[]): void {
  useCookbookStore.getState().merge(recipesToImport);
}

export function openCookbook(args: OpenCookbookArgs): void {
  useCookbookStore.getState().openModal(args);
}

export function saveAllRecipes(recipes: readonly RecipeBookItem[]): boolean {
  const serialized = recipes.map(serializeRecipe);
  logger.info(`Saving ${serialized.length} recipes to storage.`);
  return storage.set(STORAGE_COOKBOOK, serialized, 'Saved Recipes');
}

export function setRecipeName(name: string): void {
  useCookbookStore.getState().setName(name);
}

export function setQuery(term: string): void {
  useCookbookStore.getState().setQuery(term);
}
