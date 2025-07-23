import { CustomInput } from './customInput';
import { CustomOutput } from './customOutput';
import { RepeatStep } from './repeatStep';

import type { Ingredient } from '../core/Ingredient';

export const internalIngredients: ReadonlyArray<new () => Ingredient> = [CustomInput, CustomOutput, RepeatStep];
