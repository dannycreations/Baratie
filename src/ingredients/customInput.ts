import { CATEGORY_FLOW, KEY_CUSTOM_INPUT } from '../app/constants';
import { ingredientRegistry } from '../app/container';
import { InputType } from '../core/InputType';

import type { IngredientContext, IngredientDefinition, InputPanelConfig, PanelControlConfig, PanelControlSignal } from '../core/IngredientRegistry';

export const CUSTOM_INPUT_DEF: IngredientDefinition = {
  name: KEY_CUSTOM_INPUT,
  category: CATEGORY_FLOW,
  description: 'Controls the Input Panel to display options for the next ingredient in the recipe.',
  run: (input: InputType<unknown>, _spices: unknown, context: IngredientContext): PanelControlSignal => {
    const { ingredient: currentIngredient, recipe, currentIndex } = context;

    let config: InputPanelConfig;
    const nextIngredientIndex = currentIndex + 1;

    if (nextIngredientIndex < recipe.length) {
      const targetIngredient = recipe[nextIngredientIndex];
      const targetDefinition = ingredientRegistry.getIngredient(targetIngredient.name);
      if (targetDefinition?.spices && targetDefinition.spices.length > 0) {
        config = {
          mode: 'spiceEditor',
          targetIngredientId: targetIngredient.id,
          title: `Options: ${targetDefinition.name.description}`,
        };
      } else {
        config = {
          mode: 'textarea',
          title: 'Input',
          placeholder: 'The next ingredient has no configurable options.',
          disabled: true,
          showClear: false,
        };
      }
    } else {
      config = {
        mode: 'textarea',
        title: 'Input',
        placeholder: 'There is no subsequent ingredient to configure.',
        disabled: true,
        showClear: false,
      };
    }

    const panelInstruction: PanelControlConfig = {
      panelType: 'input',
      providerId: currentIngredient.id,
      config,
    };

    return {
      output: input,
      panelControl: panelInstruction,
    };
  },
};
