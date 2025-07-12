import { CATEGORY_FLOW, KEY_CUSTOM_INPUT } from '../app/constants';
import { ingredientRegistry } from '../app/container';
import { InputType } from '../core/InputType';

import type {
  IngredientContext,
  IngredientDefinition,
  InputPanelConfig,
  PanelControlConfig,
  PanelControlSignal,
  SpiceDefinition,
} from '../core/IngredientRegistry';

interface CustomInputSpice {
  readonly inputMode: 'defaultTextarea' | 'ingredientOptions';
}

const CUSTOM_INPUT_SPICES: readonly SpiceDefinition[] = [
  {
    id: 'inputMode',
    type: 'select',
    label: 'Input Panel Mode',
    value: 'defaultTextarea',
    options: [
      { label: 'Standard Text Input', value: 'defaultTextarea' },
      { label: 'Ingredient Options', value: 'ingredientOptions' },
    ],
    description: "Controls the Input Panel. 'Ingredient Options' displays controls for the next ingredient in the recipe, if any are available.",
  },
];

export const CUSTOM_INPUT_DEF: IngredientDefinition<CustomInputSpice> = {
  name: KEY_CUSTOM_INPUT,
  category: CATEGORY_FLOW,
  description: 'Controls the Input Panel for text, a binary file, or options for the next ingredient.',
  spices: CUSTOM_INPUT_SPICES,
  run: (input: InputType<unknown>, spices: CustomInputSpice, context: IngredientContext): PanelControlSignal => {
    const { ingredient: currentIngredient, recipe, currentIndex } = context;
    const requestedMode = spices.inputMode;

    let config: InputPanelConfig;

    if (requestedMode === 'ingredientOptions') {
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
            title: 'Input (Next Ingredient Has No Options)',
            placeholder: 'The next ingredient has no configurable options.',
            disabled: true,
            showClear: false,
          };
        }
      } else {
        config = {
          mode: 'textarea',
          title: 'Input (No Next Ingredient)',
          placeholder: 'There is no subsequent ingredient to configure.',
          disabled: true,
          showClear: false,
        };
      }
    } else {
      config = {
        mode: 'textarea',
        title: 'Input (Text)',
        placeholder: 'Enter your data here.',
        showClear: true,
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
