import { CATEGORY_FLOW, KEY_CUSTOM_OUTPUT } from '../app/constants';

import type { IngredientDefinition, OutputPanelConfig, PanelControlConfig } from '../core/IngredientRegistry';

export const CUSTOM_OUTPUT_DEF: IngredientDefinition = {
  name: KEY_CUSTOM_OUTPUT,
  category: CATEGORY_FLOW,
  description: 'Displays the output as plain text in the Output panel.',
  run: (input, _spices, context) => {
    const inputValue = input.cast('string').getValue().trim();
    if (!inputValue) {
      return null;
    }

    const { ingredient: currentIngredient } = context;

    const config: OutputPanelConfig = {
      mode: 'textarea',
      title: 'Output',
      placeholder: 'Your results will be presented here.',
    };

    const panelInstruction: PanelControlConfig = {
      panelType: 'output',
      providerId: currentIngredient.id,
      config,
    };

    return {
      output: input,
      panelControl: panelInstruction,
    };
  },
};
