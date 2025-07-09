import { useRecipeStore } from '../stores/useRecipeStore';

import type { Ingredient, SpiceDefinition } from '../core/IngredientRegistry';

export function addIngredient(type: symbol, initialSpices?: Record<string, unknown>): void {
  useRecipeStore.getState().addIngredient(type, initialSpices);
}

export function clearRecipe(): void {
  useRecipeStore.getState().clear();
}

export function getActiveRecipeId(): string | null {
  return useRecipeStore.getState().activeRecipeId;
}

export function getAllIngredients(): readonly Ingredient[] {
  return useRecipeStore.getState().ingredients;
}

export function removeIngredient(instanceId: string): void {
  useRecipeStore.getState().removeIngredient(instanceId);
}

export function reorderIngredients(draggedId: string, targetId: string): void {
  useRecipeStore.getState().reorderIngredients(draggedId, targetId);
}

export function setIngredientSpices(instanceId: string, newSpices: Record<string, unknown>): void {
  useRecipeStore.getState().setIngredientSpices(instanceId, newSpices);
}

export function setRecipe(ingredients: readonly Ingredient[], activeRecipeId: string | null = null): void {
  useRecipeStore.getState().set(ingredients, activeRecipeId);
}

export function updateSpiceValue(instanceId: string, spiceId: string, rawValue: string | boolean | number, spice: SpiceDefinition): void {
  useRecipeStore.getState().updateSpice(instanceId, spiceId, rawValue, spice);
}
