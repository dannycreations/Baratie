import { CATEGORY_FLOW, KEY_REPEAT_STEP } from '../app/constants';
import { errorHandler, kitchen, logger } from '../app/container';
import { AppError } from '../core/ErrorHandler';
import { InputType } from '../core/InputType';

import type { IngredientContext, IngredientDefinition, SpiceDefinition } from '../core/IngredientRegistry';

interface RepeatStepSpices {
  readonly delimiter: string;
  readonly intervalMs: number;
  readonly repeatCount: number;
  readonly retryDelayMs: number;
  readonly retriesOnError: number;
}

const REPEAT_STEP_SPICES: readonly SpiceDefinition[] = [
  {
    id: 'repeatCount',
    label: 'Number of Repetitions',
    type: 'number',
    value: 3,
    min: 1,
    max: 100,
    description: 'How many times to execute the preceding ingredients.',
  },
  {
    id: 'delimiter',
    label: 'Output Delimiter',
    type: 'string',
    value: '\\n',
    placeholder: 'e.g., \\n, ---, <br>',
    description: "String used to separate the outputs of each repetition. Use '\\n' for newlines.",
  },
  {
    id: 'intervalMs',
    label: 'Refresh Interval (ms)',
    type: 'number',
    value: 0,
    min: 0,
    step: 1000,
    max: 60000,
    description: 'If > 0, re-cooks the entire recipe every N milliseconds. Use 0 to disable. Only one interval can be active in a recipe.',
  },
  {
    id: 'retriesOnError',
    label: 'Retries on Error',
    type: 'number',
    value: 0,
    min: 0,
    max: 10,
    description: 'Number of times to retry the entire block of repetitions if an error occurs. Zero means no retries.',
  },
  {
    id: 'retryDelayMs',
    label: 'Retry Delay (ms)',
    type: 'number',
    value: 1000,
    min: 0,
    max: 30000,
    description: 'Delay in milliseconds between each retry attempt. This is only used if "Retries on Error" is greater than zero.',
  },
];

export const REPEAT_STEP_DEFINITION: IngredientDefinition<RepeatStepSpices> = {
  name: KEY_REPEAT_STEP,
  category: CATEGORY_FLOW,
  description: 'Repeats a sequence of preceding ingredients a specified number of times.',
  spices: REPEAT_STEP_SPICES,
  run: async (input: InputType<unknown>, spices: RepeatStepSpices, context: IngredientContext): Promise<InputType<string> | null> => {
    const { delimiter, repeatCount, retriesOnError, retryDelayMs, intervalMs } = spices;

    kitchen.setCookingInterval(intervalMs);

    if (input.cast('string').getValue().trim() === '') {
      return null;
    }

    const { ingredient: currentIngredient, currentIndex, initialInput, recipe, cookVersion } = context;
    const ingredientName = currentIngredient.name.description ?? 'Unnamed Ingredient';

    const ingredientsToRepeat = recipe.slice(0, currentIndex);

    if (ingredientsToRepeat.length === 0) {
      errorHandler.handle(
        new AppError(
          'REPEAT_STEP: No ingredients above to repeat.',
          `Ingredient: ${ingredientName}`,
          "'Repeat Step' has no preceding ingredients to execute. Add one or more ingredients before it.",
        ),
        undefined,
        {
          notificationTitle: 'Configuration Warning',
          shouldNotify: true,
        },
      );
      return new InputType('');
    }

    for (let attempt = 0; attempt <= retriesOnError; attempt++) {
      try {
        const collectedOutputs: string[] = [];
        for (let i = 0; i < repeatCount; i++) {
          const { result: output, error } = await errorHandler.attemptAsync(
            () => kitchen.cookSubRecipe(ingredientsToRepeat, initialInput, context, cookVersion),
            `Ingredient: ${ingredientName} > Repetition ${i + 1} (Attempt ${attempt + 1})`,
            {
              genericMessage: `An error occurred during repetition ${i + 1} for '${ingredientName}'.`,
              shouldNotify: false,
            },
          );

          if (error) {
            throw error;
          }
          if (output !== null) {
            collectedOutputs.push(output);
          }
        }

        const processedDelimiter = delimiter.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        return new InputType(collectedOutputs.join(processedDelimiter));
      } catch (e) {
        const isLastAttempt = attempt >= retriesOnError;
        if (isLastAttempt) {
          errorHandler.handle(e, `Ingredient: ${ingredientName}`, {
            defaultMessage: `The ingredient '${ingredientName}' failed after ${retriesOnError} retries.`,
            shouldNotify: true,
          });
          throw e;
        } else {
          logger.warn(`Repeat Step: Attempt ${attempt + 1} failed for '${ingredientName}'. Retrying in ${retryDelayMs}ms...`, e);
          if (retryDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          }
        }
      }
    }

    return new InputType('');
  },
};
