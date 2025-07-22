import { CUSTOM_INPUT_DEF } from './customInput';
import { CUSTOM_OUTPUT_DEF } from './customOutput';
import { REPEAT_STEP_DEF } from './repeatStep';

import type { IngredientDefinition } from '../core/IngredientRegistry';

export const internalIngredients = [CUSTOM_INPUT_DEF, CUSTOM_OUTPUT_DEF, REPEAT_STEP_DEF] as ReadonlyArray<IngredientDefinition>;
