import { errorHandler, logger } from '../app/container';
import { InputType } from '../core/InputType';

import type { SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';
import type { Ingredient } from '../structures/Ingredient';

export function resolveSpices(
  ingredientDefinition: Readonly<Ingredient>,
  currentSpices: Readonly<Record<string, unknown>>,
): ReadonlyArray<SpiceDefinition> {
  if (typeof ingredientDefinition.spices === 'function') {
    return ingredientDefinition.spices(currentSpices as Record<string, SpiceValue>);
  }
  return [];
}

function getSpiceMap(
  ingredientDefinition: Readonly<Ingredient>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): ReadonlyMap<string, Readonly<SpiceDefinition>> {
  const spices = resolveSpices(ingredientDefinition, currentSpices);
  if (spices.length === 0) {
    return new Map();
  }
  return new Map(spices.map((s) => [s.id, s]));
}

export function getSortedSpices(
  ingredientDefinition: Readonly<Ingredient>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): ReadonlyArray<SpiceDefinition> {
  const spices = resolveSpices(ingredientDefinition, currentSpices);
  if (!spices || spices.length === 0) {
    return [];
  }
  return [...spices].sort((a, b) => a.id.localeCompare(b.id));
}

function prepareSelectValue(newValue: SpiceValue, spice: Readonly<SpiceDefinition>): SpiceValue {
  if (spice.type !== 'select') {
    return newValue;
  }
  const selectedOption = spice.options.find((opt) => String(opt.value) === String(newValue));
  return selectedOption ? selectedOption.value : newValue;
}

export function getVisibleSpices(
  ingredientDefinition: Readonly<Ingredient>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): Array<SpiceDefinition> {
  const allSpices = resolveSpices(ingredientDefinition, currentSpices);
  if (!allSpices.length) {
    return [];
  }

  const spiceMap = getSpiceMap(ingredientDefinition, currentSpices);
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
      return (
        targetValue !== undefined &&
        targetValue !== null &&
        (Array.isArray(rule.value) ? rule.value.includes(targetValue) : targetValue === rule.value)
      );
    });

    visibilityCache.set(spiceId, isVisible);
    return isVisible;
  };

  return allSpices.filter((spice) => checkVisibility(spice.id));
}

export function updateAndValidate(
  ingredientDefinition: Readonly<Ingredient>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
  spiceId: string,
  rawValue: SpiceValue,
  spice: Readonly<SpiceDefinition>,
): Record<string, SpiceValue> {
  const processedValue = prepareSelectValue(rawValue, spice);
  const newSpices = { ...currentSpices, [spiceId]: processedValue };
  return validateSpices(ingredientDefinition, newSpices);
}

export function validateSpices(ingredientDefinition: Readonly<Ingredient>, rawSpices: Readonly<Record<string, unknown>>): Record<string, SpiceValue> {
  const validatedSpices: Record<string, SpiceValue> = {};
  const allSpices = resolveSpices(ingredientDefinition, rawSpices);

  if (!allSpices || allSpices.length === 0) {
    return {};
  }

  for (const spice of allSpices) {
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
        validatedSpices[spice.id] = input.cast('string', { value: spice.value }).getValue().trim();
        break;
      case 'textarea':
        validatedSpices[spice.id] = input.cast('string', { value: spice.value }).getValue();
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
