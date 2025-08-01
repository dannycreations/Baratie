import { errorHandler, logger } from '../app/container';
import { InputType } from '../core/InputType';

import type { IngredientDefinition, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

const sortedSpicesCache = new WeakMap<Readonly<IngredientDefinition>, ReadonlyArray<SpiceDefinition>>();
const spiceMapCache = new WeakMap<Readonly<IngredientDefinition>, ReadonlyMap<string, Readonly<SpiceDefinition>>>();

function getSpiceMap(definition: Readonly<IngredientDefinition>): ReadonlyMap<string, Readonly<SpiceDefinition>> {
  if (spiceMapCache.has(definition)) {
    return spiceMapCache.get(definition)!;
  }

  if (!definition.spices || definition.spices.length === 0) {
    const result = new Map<string, Readonly<SpiceDefinition>>();
    spiceMapCache.set(definition, result);
    return result;
  }

  const result = new Map(definition.spices.map((s) => [s.id, s]));
  spiceMapCache.set(definition, result);
  return result;
}

function prepareSelectValue(newValue: SpiceValue, spice: Readonly<SpiceDefinition>): SpiceValue {
  if (spice.type !== 'select') {
    return newValue;
  }

  const selectedOption = spice.options.find((opt) => String(opt.value) === String(newValue));

  return selectedOption ? selectedOption.value : newValue;
}

export function getSortedSpices(definition: Readonly<IngredientDefinition>): ReadonlyArray<SpiceDefinition> {
  if (sortedSpicesCache.has(definition)) {
    return sortedSpicesCache.get(definition)!;
  }

  if (!definition.spices || definition.spices.length === 0) {
    const result: ReadonlyArray<SpiceDefinition> = [];
    sortedSpicesCache.set(definition, result);
    return result;
  }

  const result = [...definition.spices].sort((a, b) => a.id.localeCompare(b.id));
  sortedSpicesCache.set(definition, result);
  return result;
}

export function getVisibleSpices(
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): Array<SpiceDefinition> {
  const allSpices = ingredientDefinition.spices || [];
  if (!allSpices.length) {
    return [];
  }

  const spiceMap = getSpiceMap(ingredientDefinition);
  const visibilityCache = new Map<string, boolean>();

  const checkVisibility = (spiceId: string): boolean => {
    if (visibilityCache.has(spiceId)) {
      return visibilityCache.get(spiceId)!;
    }

    const spice = spiceMap.get(spiceId);

    if (!spice || !spice.dependsOn || spice.dependsOn.length === 0) {
      if (spice) {
        visibilityCache.set(spiceId, true);
      }
      return true;
    }

    const isVisible = spice.dependsOn.every((rule) => {
      errorHandler.assert(spiceMap.has(rule.spiceId), `Dependency target spice ID was not found: ${rule.spiceId}`);

      if (!checkVisibility(rule.spiceId)) {
        return false;
      }

      const targetValue = currentSpices[rule.spiceId];
      const isValueMet =
        targetValue !== undefined &&
        targetValue !== null &&
        (Array.isArray(rule.value) ? rule.value.includes(targetValue) : targetValue === rule.value);

      return isValueMet;
    });

    visibilityCache.set(spiceId, isVisible);
    return isVisible;
  };

  return allSpices.filter((spice) => checkVisibility(spice.id));
}

export function updateAndValidate(
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
  spiceId: string,
  rawValue: SpiceValue,
): Record<string, SpiceValue> {
  const spiceMap = getSpiceMap(ingredientDefinition);
  const spice = spiceMap.get(spiceId);
  errorHandler.assert(spice, `Could not find spice definition for ID: ${spiceId} in ingredient ${ingredientDefinition.name}`);

  const processedValue = prepareSelectValue(rawValue, spice);
  const newSpices = { ...currentSpices, [spiceId]: processedValue };

  return validateSpices(ingredientDefinition, newSpices);
}

export function validateSpices(
  ingredientDefinition: Readonly<IngredientDefinition>,
  rawSpices: Readonly<Record<string, unknown>>,
): Record<string, SpiceValue> {
  const validatedSpices: Record<string, SpiceValue> = {};

  if (!ingredientDefinition.spices) {
    return {};
  }

  for (const spice of ingredientDefinition.spices) {
    const rawValue = rawSpices[spice.id];

    if (rawValue === undefined || rawValue === null) {
      validatedSpices[spice.id] = spice.value;
      continue;
    }

    const input = new InputType(rawValue);

    switch (spice.type) {
      case 'number': {
        validatedSpices[spice.id] = input.cast('number', { max: spice.max, min: spice.min, value: spice.value }).value;
        break;
      }
      case 'boolean': {
        validatedSpices[spice.id] = input.cast('boolean', { value: spice.value }).value;
        break;
      }
      case 'select': {
        const selectedValue = input.value;
        const isValidOption = spice.options.some((opt) => String(opt.value) === String(selectedValue));
        validatedSpices[spice.id] = isValidOption ? prepareSelectValue(selectedValue as SpiceValue, spice) : spice.value;
        break;
      }
      case 'string':
      case 'textarea': {
        validatedSpices[spice.id] = input.cast('string', { value: spice.value }).value;
        break;
      }
      default: {
        const unhandled = spice as SpiceDefinition;
        logger.warn(`An unhandled spice type was encountered: ${unhandled.id}`);
        validatedSpices[unhandled.id] = input.value as SpiceValue;
        break;
      }
    }
  }
  return validatedSpices;
}
