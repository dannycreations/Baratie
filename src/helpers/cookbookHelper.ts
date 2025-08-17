import { array, boolean, nonEmpty, number, object, optional, pipe, record, safeParse, string, union } from 'valibot';

import { ingredientRegistry, logger, storage } from '../app/container';
import { getSortedSpices, validateSpices } from './spiceHelper';

import type { InferInput } from 'valibot';
import type { IngredientItem, RecipebookItem } from '../core/IngredientRegistry';

const SpiceValueSchema = union([string(), number(), boolean()]);

const RawIngredientSchema = object({
  id: pipe(string(), nonEmpty('Ingredient ID cannot be empty.')),
  ingredientId: optional(string()),
  name: pipe(string(), nonEmpty('Ingredient name cannot be empty.')),
  spices: record(string(), optional(SpiceValueSchema)),
});

type RawIngredient = InferInput<typeof RawIngredientSchema>;

const RecipeBookItemSchema = object({
  id: pipe(string(), nonEmpty()),
  name: pipe(string(), nonEmpty()),
  ingredients: array(RawIngredientSchema),
  createdAt: number(),
  updatedAt: number(),
});

type RawRecipeBookItem = InferInput<typeof RecipeBookItemSchema>;

interface SanitizationResult {
  readonly recipe: RecipebookItem | null;
  readonly warning: string | null;
}

export interface SanitizedRecipesResult {
  readonly recipes: ReadonlyArray<RecipebookItem>;
  readonly warnings: ReadonlySet<string>;
  readonly hasCorruption: boolean;
}

export function createRecipeHash(ingredients: ReadonlyArray<IngredientItem>): string {
  const canonicalParts = ingredients.map((ing) => {
    const definition = ingredientRegistry.get(ing.ingredientId);

    if (!definition?.spices || definition.spices.length === 0) {
      return ing.ingredientId;
    }

    const sortedSpices = getSortedSpices(definition);
    const spicesString = sortedSpices
      .map((spiceDef) => {
        const value = ing.spices[spiceDef.id] ?? spiceDef.value;
        return `${spiceDef.id}:${String(value)}`;
      })
      .join(';');

    return `${ing.ingredientId}|${spicesString}`;
  });
  return canonicalParts.join('||');
}

export function saveAllRecipes(recipes: ReadonlyArray<RecipebookItem>): boolean {
  logger.info(`Saving ${recipes.length} recipes to storage.`);
  return storage.set('baratie-cookbook', recipes, 'Saved Recipes');
}

export function sanitizeIngredient(rawIngredient: RawIngredient, source: 'fileImport' | 'storage', recipeName: string): IngredientItem | null {
  let definition = rawIngredient.ingredientId ? ingredientRegistry.get(rawIngredient.ingredientId) : null;

  if (!definition) {
    const definitionByName = ingredientRegistry.getByName(rawIngredient.name);
    if (definitionByName) {
      if (rawIngredient.ingredientId) {
        logger.warn(
          `Ingredient '${rawIngredient.name}' in recipe '${recipeName}' from ${source} had a stale ID ('${rawIngredient.ingredientId}'). It has been matched by name and updated to the new ID ('${definitionByName.id}').`,
        );
      }
      definition = definitionByName;
    }
  }

  if (!definition) {
    logger.warn(`Skipping unknown ingredient '${rawIngredient.name}' from ${source} for recipe '${recipeName}'. Its definition could not be found.`);
    return null;
  }

  const validatedSpices = validateSpices(definition, rawIngredient.spices);
  return { id: rawIngredient.id, name: definition.name, ingredientId: definition.id, spices: validatedSpices };
}

export function sanitizeRecipe(rawRecipe: RawRecipeBookItem, source: 'fileImport' | 'storage'): SanitizationResult {
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
  const recipe: RecipebookItem = { id, name, ingredients: validIngredients, createdAt, updatedAt };
  return { recipe, warning };
}

export function processAndSanitizeRecipes(rawItems: ReadonlyArray<unknown>, source: 'fileImport' | 'storage'): SanitizedRecipesResult {
  const allWarnings = new Set<string>();
  const sanitizedRecipes: Array<RecipebookItem> = [];
  let corruptionCount = 0;

  for (const rawItem of rawItems) {
    const itemValidation = safeParse(RecipeBookItemSchema, rawItem);
    if (itemValidation.success) {
      const { recipe, warning } = sanitizeRecipe(itemValidation.output, source);
      if (recipe) {
        sanitizedRecipes.push(recipe);
      }
      if (warning) {
        allWarnings.add(warning);
      }
    } else {
      corruptionCount++;
    }
  }

  return { recipes: sanitizedRecipes, warnings: allWarnings, hasCorruption: corruptionCount > 0 };
}
