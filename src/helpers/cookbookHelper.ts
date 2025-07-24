import * as v from 'valibot';
import { safeParse } from 'valibot';

import { ingredientRegistry, logger, storage } from '../app/container';
import { validateSpices } from '../helpers/spiceHelper';
import { getSortedSpices } from './spiceHelper';

import type { IngredientItem, RecipeBookItem } from '../core/IngredientRegistry';

const SpiceValueSchema = v.union([v.string(), v.number(), v.boolean()]);

const RawIngredientSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty('Ingredient ID cannot be empty.')),
  ingredientId: v.optional(v.string()),
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

export interface SanitizedRecipesResult {
  readonly recipes: ReadonlyArray<RecipeBookItem>;
  readonly warnings: ReadonlySet<string>;
  readonly hasCorruption: boolean;
}

export function createRecipeHash(ingredients: ReadonlyArray<IngredientItem>): string {
  const canonicalParts = ingredients.map((ing) => {
    const ingredientId = ing.ingredientId;
    const definition = ingredientRegistry.getIngredient(ing.ingredientId);

    if (!definition?.spices || definition.spices.length === 0) {
      return ingredientId;
    }

    const sortedSpices = getSortedSpices(definition);
    const spicesString = sortedSpices.map((spiceDef) => `${spiceDef.id}:${String(ing.spices[spiceDef.id])}`).join(';');

    return `${ingredientId}|${spicesString}`;
  });
  return canonicalParts.join('||');
}

export function saveAllRecipes(recipes: ReadonlyArray<RecipeBookItem>): boolean {
  logger.info(`Saving ${recipes.length} recipes to storage.`);
  return storage.set('baratie-cookbook', recipes, 'Saved Recipes');
}

export function sanitizeIngredient(rawIngredient: RawIngredient, source: 'fileImport' | 'storage', recipeName: string): IngredientItem | null {
  const definition = rawIngredient.ingredientId
    ? ingredientRegistry.getIngredient(rawIngredient.ingredientId)
    : ingredientRegistry.getIngredientByName(rawIngredient.name);

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
  const recipe: RecipeBookItem = { id, name, ingredients: validIngredients, createdAt, updatedAt };
  return { recipe, warning };
}

export function processAndSanitizeRecipes(rawItems: ReadonlyArray<unknown>, source: 'fileImport' | 'storage'): SanitizedRecipesResult {
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
