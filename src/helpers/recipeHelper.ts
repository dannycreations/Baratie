import { errorHandler, ingredientRegistry, logger } from '../app/container';
import { useRecipeStore } from '../stores/useRecipeStore';
import { updateAndValidate, validateSpices } from './spiceHelper';

import type { Ingredient, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

export function addIngredient(type: symbol, initialSpices?: Readonly<Record<string, unknown>>): void {
  const { ingredients, activeRecipeId, setRecipe } = useRecipeStore.getState();

  const ingredientDefinition = ingredientRegistry.getIngredient(type);
  errorHandler.assert(ingredientDefinition, `Ingredient definition not found for type: ${String(type)}`, 'Recipe Add Ingredient', {
    genericMessage: `Ingredient "${String(type)}" could not be added because its definition is missing.`,
  });

  const validSpices = validateSpices(ingredientDefinition, initialSpices || {});
  const newIngredient: Ingredient = {
    id: crypto.randomUUID(),
    name: ingredientDefinition.name,
    spices: validSpices,
  };

  setRecipe([...ingredients, newIngredient], activeRecipeId);
}

export function clearRecipe(): void {
  useRecipeStore.getState().setRecipe([], null);
}

export function getActiveRecipeId(): string | null {
  return useRecipeStore.getState().activeRecipeId;
}

export function getAllIngredients(): readonly Ingredient[] {
  return useRecipeStore.getState().ingredients;
}

export function removeIngredient(id: string): void {
  const { ingredients, activeRecipeId, setRecipe } = useRecipeStore.getState();
  const newIngredients = ingredients.filter((ingredient) => ingredient.id !== id);
  setRecipe(newIngredients, activeRecipeId);
}

export function reorderIngredients(draggedId: string, targetId: string): void {
  const { ingredients, activeRecipeId, setRecipe } = useRecipeStore.getState();
  const currentRecipe = [...ingredients];
  const draggedIndex = currentRecipe.findIndex((ingredient) => ingredient.id === draggedId);
  const targetIndex = currentRecipe.findIndex((ingredient) => ingredient.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
    return;
  }

  const [draggedItem] = currentRecipe.splice(draggedIndex, 1);
  currentRecipe.splice(targetIndex, 0, draggedItem);
  setRecipe(currentRecipe, activeRecipeId);
}

export function setIngredientSpices(id: string, newSpices: Readonly<Record<string, unknown>>): void {
  const { ingredients, activeRecipeId, setRecipe } = useRecipeStore.getState();

  const ingredientToUpdate = ingredients.find((ingredient) => ingredient.id === id);
  errorHandler.assert(ingredientToUpdate, `Ingredient with ID "${id}" not found for spice update.`, 'Recipe Update Spices');

  const ingredientDefinition = ingredientRegistry.getIngredient(ingredientToUpdate.name);
  if (!ingredientDefinition) {
    logger.warn(
      `Cannot update spices for ingredient "${ingredientToUpdate.name.description}" because its definition is missing. Spices will not be updated.`,
    );
    return;
  }

  const validatedSpices = validateSpices(ingredientDefinition, newSpices);
  const newIngredients = ingredients.map((ingredient) => (ingredient.id === id ? { ...ingredient, spices: validatedSpices } : ingredient));
  setRecipe(newIngredients, activeRecipeId);
}

export function setRecipe(ingredients: readonly Ingredient[], activeRecipeId: string | null = null): void {
  useRecipeStore.getState().setRecipe(ingredients, activeRecipeId);
}

export function updateSpice(id: string, spiceId: string, rawValue: SpiceValue, spice: Readonly<SpiceDefinition>): void {
  const { ingredients, activeRecipeId, setRecipe } = useRecipeStore.getState();

  const ingredientToUpdate = ingredients.find((ingredient) => ingredient.id === id);
  errorHandler.assert(ingredientToUpdate, `Ingredient with ID "${id}" not found for spice change.`, 'Recipe Change Spice');

  const ingredientDefinition = ingredientRegistry.getIngredient(ingredientToUpdate.name);
  errorHandler.assert(ingredientDefinition, `Ingredient definition not found for type "${String(ingredientToUpdate.name)}".`, 'Recipe Change Spice');

  const isSpiceInDefinition = ingredientDefinition.spices?.some((s) => s.id === spiceId);
  errorHandler.assert(
    isSpiceInDefinition,
    `Spice with ID "${spiceId}" is not a valid spice for ingredient "${ingredientDefinition.name.description}".`,
    'Recipe Spice Update',
    {
      genericMessage: `An internal error occurred while updating options for "${ingredientDefinition.name.description}".`,
    },
  );

  const newValidSpices = updateAndValidate(ingredientDefinition, ingredientToUpdate.spices, spiceId, rawValue, spice);
  const newIngredients = ingredients.map((ingredient) => (ingredient.id === id ? { ...ingredient, spices: newValidSpices } : ingredient));
  setRecipe(newIngredients, activeRecipeId);
}
