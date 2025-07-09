import { CUSTOM_INPUT_DEFINITION } from './customInput';
import { CUSTOM_OUTPUT_DEFINITION } from './customOutput';
import { REPEAT_STEP_DEFINITION } from './repeatStep';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export const internalIngredients = [CUSTOM_INPUT_DEFINITION, CUSTOM_OUTPUT_DEFINITION, REPEAT_STEP_DEFINITION] as readonly IngredientDefinition[];
