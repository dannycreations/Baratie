import { ingredientRegistry } from '../app/container';
import { getSortedSpices } from './spiceHelper';

import type { IngredientItem } from '../core/IngredientRegistry';

export function createRecipeContentHash(ingredients: ReadonlyArray<IngredientItem>): string {
  const canonicalParts = ingredients.map((ing) => {
    const name = ing.name;
    const definition = ingredientRegistry.getIngredient(ing.name);

    if (!definition?.spices || definition.spices.length === 0) {
      return name;
    }

    const sortedSpices = getSortedSpices(definition);
    const spicesString = sortedSpices.map((spiceDef) => `${spiceDef.id}:${String(ing.spices[spiceDef.id])}`).join(';');

    return `${name}|${spicesString}`;
  });
  return canonicalParts.join('||');
}
