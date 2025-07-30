import { CATEGORY_EFFECT, KEY_CUSTOM_INPUT } from '../app/constants';
import { ingredientRegistry } from '../app/container';

import type { IngredientDefinition, InputPanelConfig } from '../core/IngredientRegistry';

export const CUSTOM_INPUT_DEF: IngredientDefinition = {
  name: KEY_CUSTOM_INPUT,
  category: CATEGORY_EFFECT,
  description: 'Controls the Input Panel to display options for the next ingredient in the recipe.',
  run: (input, _spices, context) => {
    const { ingredient, recipe, currentIndex } = context;

    let config: InputPanelConfig | undefined;
    const nextIngredientIndex = currentIndex + 1;

    if (nextIngredientIndex < recipe.length) {
      const targetIngredient = recipe[nextIngredientIndex];
      const targetDefinition = ingredientRegistry.getIngredient(targetIngredient.ingredientId);
      if (targetDefinition?.spices && targetDefinition.spices.length > 0) {
        config = {
          mode: 'spiceEditor',
          targetIngredientId: targetIngredient.id,
          title: `Options: ${targetIngredient.name}`,
        };
      }
    }

    if (!config) {
      return input.warning('There are no ingredients with options below this one.');
    }

    return input.render({
      panelType: 'input',
      providerId: ingredient.id,
      config,
    });
  },
};
