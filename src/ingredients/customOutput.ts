import { CATEGORY_FLOW, KEY_CUSTOM_OUTPUT } from '../app/constants';
import { Ingredient } from '../core/Ingredient';

import type { IngredientContext, OutputPanelConfig, PanelControlConfig, ResultType } from '../core/IngredientRegistry';
import type { InputType } from '../core/InputType';

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
