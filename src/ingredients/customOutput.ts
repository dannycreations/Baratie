import { CATEGORY_EFFECT, KEY_CUSTOM_OUTPUT } from '../app/constants';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export const CUSTOM_OUTPUT_DEF: IngredientDefinition = {
  name: KEY_CUSTOM_OUTPUT,
  category: CATEGORY_EFFECT,
  description: 'Displays the output as plain text in the Output panel.',
  run: (input, _spices, context) => {
    const inputValue = input.cast('string').value.trim();
    if (!inputValue) {
      return input.warning(null);
    }

    return input.render({
      panelType: 'output',
      providerId: context.ingredient.id,
      config: {
        mode: 'textarea',
        title: 'Output',
        placeholder: 'Your results will be presented here.',
      },
    });
  },
};
