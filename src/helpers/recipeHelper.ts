import { useRecipeStore } from '../stores/useRecipeStore';

import type { Ingredient, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

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

export function removeIngredient(id: string): void {
  useRecipeStore.getState().removeIngredient(id);
}

export function reorderIngredients(draggedId: string, targetId: string): void {
  useRecipeStore.getState().reorderIngredients(draggedId, targetId);
}

export function setIngredientSpices(id: string, newSpices: Record<string, unknown>): void {
  useRecipeStore.getState().setIngredientSpices(id, newSpices);
}

export function setRecipe(ingredients: readonly Ingredient[], activeRecipeId: string | null = null): void {
  useRecipeStore.getState().setRecipe(ingredients, activeRecipeId);
}

export function updateSpice(id: string, spiceId: string, rawValue: SpiceValue, spice: SpiceDefinition): void {
  useRecipeStore.getState().updateSpice(id, spiceId, rawValue, spice);
}
