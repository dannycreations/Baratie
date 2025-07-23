import { CATEGORY_FLOW, KEY_CUSTOM_INPUT } from '../lib/app/constants';
import { ingredientRegistry } from '../lib/app/container';
import { Ingredient } from '../lib/structures/Ingredient';

import type { IngredientContext, InputPanelConfig, PanelControlConfig, ResultType } from '../lib/core/IngredientRegistry';
import type { InputType } from '../lib/core/InputType';

export class CustomInput extends Ingredient {
  public constructor() {
    super({
      name: KEY_CUSTOM_INPUT,
      category: CATEGORY_FLOW,
      description: 'Controls the Input Panel to display options for the next ingredient in the recipe.',
    });
  }

  public run(input: InputType, _spices: unknown, context: IngredientContext): ResultType {
    const { ingredient: currentIngredient, recipe, currentIndex } = context;

    let config: InputPanelConfig;
    const nextIngredientIndex = currentIndex + 1;

    if (nextIngredientIndex < recipe.length) {
      const targetIngredient = recipe[nextIngredientIndex];
      const targetDefinition = ingredientRegistry.getIngredient(targetIngredient.ingredientId);

      const targetHasSpices = !!(
        targetDefinition &&
        typeof targetDefinition.spices === 'function' &&
        targetDefinition.spices(targetIngredient.spices).length > 0
      );

      if (targetHasSpices) {
        config = {
          mode: 'spiceEditor',
          targetIngredientId: targetIngredient.id,
          title: `Options: ${targetIngredient.name}`,
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
  }
}
