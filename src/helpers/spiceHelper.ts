import { errorHandler, logger } from '../app/container';
import { InputType } from '../core/InputType';

import type { IngredientDefinition, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

function isSpiceVisible(
  spice: Readonly<SpiceDefinition>,
  allSpices: readonly SpiceDefinition[],
  currentSpices: Readonly<Record<string, SpiceValue>>,
): boolean {
  if (!spice.dependsOn || spice.dependsOn.length === 0) return true;

  return spice.dependsOn.every((rule) => {
    const targetSpice = allSpices.find((s) => s.id === rule.spiceId);
    errorHandler.assert(targetSpice, `Dependency target spice ID was not found: ${rule.spiceId}`);
    const targetValue = currentSpices[rule.spiceId];
    const dependencyMet =
      targetValue !== undefined &&
      targetValue !== null &&
      (Array.isArray(rule.value) ? rule.value.some((v) => v === targetValue) : targetValue === rule.value);
    return isSpiceVisible(targetSpice, allSpices, currentSpices) && dependencyMet;
  });
}

function prepareSelectValue(newValue: SpiceValue, spice: Readonly<SpiceDefinition>): SpiceValue {
  if (spice.type !== 'select') {
    return newValue;
  }
  const selectedOption = spice.options.find((opt) => String(opt.value) === String(newValue));
  return selectedOption ? selectedOption.value : newValue;
}

export function getVisibleSpices(
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): SpiceDefinition[] {
  const allSpices = ingredientDefinition.spices || [];
  if (!allSpices.length) return [];
  return allSpices.filter((spice) => isSpiceVisible(spice, allSpices, currentSpices));
}

export function updateAndValidate(
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
  spiceId: string,
  rawValue: SpiceValue,
  spice: Readonly<SpiceDefinition>,
): Record<string, SpiceValue> {
  const processedValue = prepareSelectValue(rawValue, spice);
  const newSpices = { ...currentSpices, [spiceId]: processedValue };
  return validateSpices(ingredientDefinition, newSpices);
}

export function validateSpices(
  ingredientDefinition: Readonly<IngredientDefinition>,
  rawSpices: Readonly<Record<string, unknown>>,
): Record<string, SpiceValue> {
  const validatedSpices: Record<string, SpiceValue> = {};
  if (!ingredientDefinition.spices) return {};

  for (const spice of ingredientDefinition.spices) {
    const rawValue = rawSpices[spice.id];
    if (rawValue === undefined || rawValue === null) {
      validatedSpices[spice.id] = spice.value;
      continue;
    }

    const input = new InputType(rawValue);
    switch (spice.type) {
      case 'number':
        validatedSpices[spice.id] = input.cast('number', { max: spice.max, min: spice.min, value: spice.value }).getValue();
        break;
      case 'boolean':
        validatedSpices[spice.id] = input.cast('boolean', { value: spice.value }).getValue();
        break;
      case 'select': {
        const selectedValue = input.getValue();
        const isValidOption = spice.options.some((opt) => String(opt.value) === String(selectedValue));
        validatedSpices[spice.id] = isValidOption ? prepareSelectValue(selectedValue as SpiceValue, spice) : spice.value;
        break;
      }
      case 'string':
        validatedSpices[spice.id] = input.cast('string', { trim: true, value: spice.value }).getValue();
        break;
      case 'textarea':
        validatedSpices[spice.id] = input.cast('string', { trim: false, value: spice.value }).getValue();
        break;
      default: {
        const unhandled = spice as SpiceDefinition;
        logger.warn(`An unhandled spice type was encountered: ${unhandled.id}`);
        validatedSpices[unhandled.id] = input.getValue() as SpiceValue;
      }
    }
  }
  return validatedSpices;
}
