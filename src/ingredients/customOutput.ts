import { CATEGORY_FLOW, KEY_CUSTOM_OUTPUT } from '../lib/app/constants';
import { Ingredient } from '../lib/structures/Ingredient';

import type { IngredientContext, OutputPanelConfig, PanelControlConfig, ResultType } from '../lib/core/IngredientRegistry';
import type { InputType } from '../lib/core/InputType';

export class CustomOutput extends Ingredient {
  public constructor() {
    super({
      name: KEY_CUSTOM_OUTPUT,
      category: CATEGORY_FLOW,
      description: 'Displays the output as plain text in the Output panel.',
    });
  }

  public run(input: InputType, _spices: unknown, context: IngredientContext): ResultType {
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
  }
}
