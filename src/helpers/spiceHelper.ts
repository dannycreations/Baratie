import { errorHandler, logger } from '../app/container';
import { InputType } from '../core/InputType';

import type { IngredientDefinition, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

const sortedSpicesCache = new WeakMap<Readonly<IngredientDefinition>, ReadonlyArray<SpiceDefinition>>();
const spiceMapCache = new WeakMap<Readonly<IngredientDefinition>, ReadonlyMap<string, Readonly<SpiceDefinition>>>();

const getSpiceMap = (definition: Readonly<IngredientDefinition>): ReadonlyMap<string, Readonly<SpiceDefinition>> => {
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
};

const prepareSelectValue = (newValue: SpiceValue, spice: Readonly<SpiceDefinition>): SpiceValue => {
  if (spice.type !== 'select') {
    return newValue;
  }

  const selectedOption = spice.options.find((opt) => String(opt.value) === String(newValue));

  return selectedOption ? selectedOption.value : newValue;
};

export const getSortedSpices = (definition: Readonly<IngredientDefinition>): ReadonlyArray<SpiceDefinition> => {
  const cached = sortedSpicesCache.get(definition);
  if (cached) return cached;

  const result = definition.spices?.length ? [...definition.spices].sort((a, b) => a.id.localeCompare(b.id)) : [];
  sortedSpicesCache.set(definition, result);
  return result;
};

export const getVisibleSpices = (
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): Array<SpiceDefinition> => {
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
};

export const updateAndValidate = (
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
  spiceId: string,
  rawValue: SpiceValue,
): Record<string, SpiceValue> => {
  const spice = getSpiceMap(ingredientDefinition).get(spiceId);
  errorHandler.assert(spice, `Could not find spice definition for ID: ${spiceId} in ingredient ${ingredientDefinition.name}`);

  return validateSpices(ingredientDefinition, { ...currentSpices, [spiceId]: prepareSelectValue(rawValue, spice) });
};

export const validateSpices = (
  ingredientDefinition: Readonly<IngredientDefinition>,
  rawSpices: Readonly<Record<string, unknown>>,
): Record<string, SpiceValue> => {
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

    const getValidatedValue = (): SpiceValue => {
      switch (spice.type) {
        case 'number':
          return input.cast('number', { max: spice.max, min: spice.min, value: spice.value }).value;
        case 'boolean':
          return input.cast('boolean', { value: spice.value }).value;
        case 'select':
          const selectedValue = input.value;
          const isValidOption = spice.options.some((opt) => String(opt.value) === String(selectedValue));
          return isValidOption ? prepareSelectValue(selectedValue as SpiceValue, spice) : spice.value;
        case 'string':
        case 'textarea':
          return input.cast('string', { value: spice.value }).value;
        default:
          const unhandled = spice as SpiceDefinition;
          logger.warn(`An unhandled spice type was encountered: ${unhandled.id}`);
          return input.value as SpiceValue;
      }
    };

    validatedSpices[spice.id] = getValidatedValue();
  }
  return validatedSpices;
};
