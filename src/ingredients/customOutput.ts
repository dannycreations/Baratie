import { CATEGORY_FLOW, KEY_CUSTOM_OUTPUT } from '../app/constants';
import { InputType } from '../core/InputType';

import type { IngredientContext, IngredientDefinition, OutputPanelConfig, PanelControlConfig, PanelControlSignal } from '../core/IngredientRegistry';

export const CUSTOM_OUTPUT_DEF: IngredientDefinition<unknown> = {
  name: KEY_CUSTOM_OUTPUT,
  category: CATEGORY_FLOW,
  description: 'Displays the output as plain text in the Output panel. Can be used to reset any custom output settings from other ingredients.',
  spices: [],
  run: (input: InputType<unknown>, _spices: unknown, context: IngredientContext): PanelControlSignal | null => {
    if (input.cast('string').getValue().trim() === '') {
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
