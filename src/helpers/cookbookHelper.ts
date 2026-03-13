import { array, boolean, nonEmpty, number, object, optional, pipe, record, safeParse, string, union } from 'valibot';

import { ingredientRegistry, logger, storage } from '../app/container';
import { getSortedSpices, validateSpices } from './spiceHelper';

import type { InferInput } from 'valibot';
import type { IngredientItem, IngredientProps, RecipebookItem } from '../core/IngredientRegistry';

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

const recipeNameFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const ingredientsHashCache = new WeakMap<ReadonlyArray<IngredientItem>, string>();

const findIngredientDefinition = (rawIngredient: RawIngredient, source: 'fileImport' | 'storage', recipeName: string): IngredientProps | null => {
  const { ingredientId, name } = rawIngredient;

  if (ingredientId) {
    const defById = ingredientRegistry.get(ingredientId);
    if (defById) {
      return defById;
    }
  }

  const defByName = ingredientRegistry.getByName(name);

  if (!defByName) {
    logger.warn(`Skipping unknown ingredient '${name}' from ${source} for recipe '${recipeName}'. Its definition could not be found.`);
    return null;
  }

  if (ingredientId) {
    logger.warn(
      `Ingredient '${name}' in recipe '${recipeName}' from ${source} had a stale ID ('${ingredientId}'). It has been matched by name and updated to the new ID ('${defByName.id}').`,
    );
  }

  return defByName;
};

export const computeInitialRecipeName = (
  ingredients: ReadonlyArray<IngredientItem>,
  activeRecipeId: string | null,
  recipeIdMap: ReadonlyMap<string, RecipebookItem>,
  recipes: ReadonlyArray<RecipebookItem>,
): string => {
  if (ingredients.length === 0) {
    return '';
  }

  const activeRecipe = activeRecipeId ? recipeIdMap.get(activeRecipeId) : null;
  if (activeRecipe) {
    return activeRecipe.name;
  }

  const currentHash = createRecipeHash(ingredients);
  const existingRecipe = recipes.find((r) => createRecipeHash(r.ingredients) === currentHash);

  if (existingRecipe) {
    return existingRecipe.name;
  }

  const dateString = recipeNameFormatter.format(new Date());
  return `My Recipe ${dateString}`;
};

export const createRecipeHash = (ingredients: ReadonlyArray<IngredientItem>): string => {
  if (ingredientsHashCache.has(ingredients)) {
    return ingredientsHashCache.get(ingredients)!;
  }

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

  const hash = canonicalParts.join('||');
  ingredientsHashCache.set(ingredients, hash);
  return hash;
};

export const saveAllRecipes = (recipes: ReadonlyArray<RecipebookItem>): boolean => {
  logger.info(`Saving ${recipes.length} recipes to storage.`);
  return storage.set('baratie-cookbook', recipes, 'Saved Recipes');
};

export const sanitizeIngredient = (rawIngredient: RawIngredient, source: 'fileImport' | 'storage', recipeName: string): IngredientItem | null => {
  const definition = findIngredientDefinition(rawIngredient, source, recipeName);

  if (!definition) {
    return null;
  }

  const validatedSpices = validateSpices(definition, rawIngredient.spices);
  return { id: rawIngredient.id, name: definition.name, ingredientId: definition.id, spices: validatedSpices };
};

export const sanitizeRecipe = (rawRecipe: RawRecipeBookItem, source: 'fileImport' | 'storage'): SanitizationResult => {
  const { id, name, createdAt, updatedAt, ingredients: rawIngredients } = rawRecipe;
  const validIngredients: Array<IngredientItem> = [];

  for (const raw of rawIngredients) {
    const validIngredient = sanitizeIngredient(raw, source, name);

    if (!validIngredient) {
      continue;
    }

    validIngredients.push(validIngredient);
  }

  const ingredientDifference = rawIngredients.length - validIngredients.length;
  let warning: string | null = null;
  if (ingredientDifference > 0) {
    const pluralSuffix = ingredientDifference === 1 ? '' : 's';
    const verb = ingredientDifference === 1 ? 'was' : 'were';
    warning = `Recipe '${name}' had ${ingredientDifference} invalid ingredient${pluralSuffix} that ${verb} removed.`;
  }

  const recipe: RecipebookItem = { id, name, ingredients: validIngredients, createdAt, updatedAt };
  return { recipe, warning };
};

export const processAndSanitizeRecipes = (rawItems: ReadonlyArray<unknown>, source: 'fileImport' | 'storage'): SanitizedRecipesResult => {
  const allWarnings = new Set<string>();
  const sanitizedRecipes: Array<RecipebookItem> = [];
  let corruptionCount = 0;

  for (const rawItem of rawItems) {
    const itemValidation = safeParse(RecipeBookItemSchema, rawItem);

    if (!itemValidation.success) {
      corruptionCount++;
      continue;
    }

    const { recipe, warning } = sanitizeRecipe(itemValidation.output, source);

    if (recipe) {
      sanitizedRecipes.push(recipe);
    }

    if (warning) {
      allWarnings.add(warning);
    }
  }

  return { recipes: sanitizedRecipes, warnings: allWarnings, hasCorruption: corruptionCount > 0 };
};
