import { CATEGORY_EFFECT, KEY_REPEAT_STEP } from '../app/constants';
import { errorHandler, ingredientRegistry, kitchen, logger } from '../app/container';
import { InputType } from '../core/InputType';
import { useNotificationStore } from '../stores/useNotificationStore';

import type { IngredientContext, IngredientDefinition, SpiceDefinition } from '../core/IngredientRegistry';

interface RepeatStepSpices {
  readonly delimiter: string;
  readonly intervalMs: number;
  readonly repeatCount: number;
  readonly retryDelayMs: number;
  readonly retriesOnError: number;
}

const REPEAT_STEP_SPICES: ReadonlyArray<SpiceDefinition> = [
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

export const REPEAT_STEP_DEF: IngredientDefinition<RepeatStepSpices> = {
  name: KEY_REPEAT_STEP,
  category: CATEGORY_EFFECT,
  description: 'Repeats a sequence of preceding ingredients a specified number of times.',
  spices: REPEAT_STEP_SPICES,
  run: async (input, spices, context) => {
    const { delimiter, repeatCount, retriesOnError, retryDelayMs, intervalMs } = spices;

    kitchen.setCookingInterval(intervalMs);

    if (!input.cast('string').value.trim()) {
      return input.warning();
    }

    const { currentIndex, initialInput, recipe } = context;
    const ingredientDisplayName = REPEAT_STEP_DEF.name;

    const ingredientsToRepeat = recipe.slice(0, currentIndex);

    if (ingredientsToRepeat.length === 0) {
      useNotificationStore
        .getState()
        .show(
          `'${ingredientDisplayName}' has no preceding ingredients to execute. Add one or more ingredients before it.`,
          'warning',
          'Configuration Warning',
        );
      return input.update('');
    }

    for (let attempt = 0; attempt <= retriesOnError; attempt++) {
      try {
        const collectedOutputs: Array<string> = [];
        for (let repetitionIndex = 0; repetitionIndex < repeatCount; repetitionIndex++) {
          const { result: output, error } = await errorHandler.attemptAsync(
            async () => {
              let currentData = initialInput;
              for (let subIndex = 0; subIndex < ingredientsToRepeat.length; subIndex++) {
                const ingredient = ingredientsToRepeat[subIndex];
                const definition = ingredientRegistry.get(ingredient.ingredientId);
                errorHandler.assert(definition, `Definition for '${ingredient.name}' not found during sub-recipe execution.`);

                const subContext: IngredientContext = { ...context, currentIndex: subIndex, ingredient: ingredient };
                const runResult = await definition.run(input.update(currentData), ingredient.spices, subContext);

                errorHandler.assert(runResult instanceof InputType, `Ingredient '${definition.name}' returned an invalid result type.`);

                if (runResult.warningMessage !== undefined) {
                  continue;
                }

                currentData = runResult.cast('string').value;
              }
              return currentData;
            },
            `Ingredient: ${ingredientDisplayName} > Repetition ${repetitionIndex + 1} (Attempt ${attempt + 1})`,
            {
              genericMessage: `An error occurred during repetition ${repetitionIndex + 1} for '${ingredientDisplayName}'.`,
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
        return input.update(collectedOutputs.join(processedDelimiter));
      } catch (error) {
        const isLastAttempt = attempt >= retriesOnError;
        if (isLastAttempt) {
          errorHandler.handle(error, `Ingredient: ${ingredientDisplayName}`, {
            defaultMessage: `The ingredient '${ingredientDisplayName}' failed after ${retriesOnError} retries.`,
            shouldNotify: true,
          });
          throw error;
        } else {
          logger.warn(`Repeat Step: Attempt ${attempt + 1} failed for '${ingredientDisplayName}'. Retrying in ${retryDelayMs}ms...`, error);
          if (retryDelayMs > 0) {
            await new Promise((resolve) => {
              setTimeout(resolve, retryDelayMs);
            });
          }
        }
      }
    }

    return input.update('');
  },
};
