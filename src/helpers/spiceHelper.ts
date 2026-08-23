import { errorHandler } from '../app/container';
import { InputType } from '../core/InputType';

import type { IngredientDefinition, SpiceDefinition, SpiceValue } from '../core/IngredientRegistry';

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

export const getVisibleSpices = (
  ingredientDefinition: Readonly<IngredientDefinition>,
  currentSpices: Readonly<Record<string, SpiceValue>>,
): Array<SpiceDefinition> => {
  const allSpices = ingredientDefinition.spices;
  if (!allSpices || allSpices.length === 0) {
    return [];
  }

  const spiceMap = getSpiceMap(ingredientDefinition);
  const visibilityCache = new Map<string, boolean>();

  const checkVisibility = (spiceId: string): boolean => {
    const cached = visibilityCache.get(spiceId);
    if (cached !== undefined) return cached;

    const spice = spiceMap.get(spiceId);
    if (!spice || !spice.dependsOn || spice.dependsOn.length === 0) {
      if (spice) visibilityCache.set(spiceId, true);
      return true;
    }

    const isVisible = spice.dependsOn.every((rule) => {
      const targetId = rule.spiceId;
      if (!checkVisibility(targetId)) return false;

      const targetValue = currentSpices[targetId];
      if (targetValue === undefined || targetValue === null) return false;

      const ruleVal = rule.value;
      return Array.isArray(ruleVal) ? ruleVal.includes(targetValue) : targetValue === ruleVal;
    });

    visibilityCache.set(spiceId, isVisible);
    return isVisible;
  };

  const result: SpiceDefinition[] = [];
  const len = allSpices.length;
  for (let i = 0; i < len; i++) {
    const spice = allSpices[i];
    if (checkVisibility(spice.id)) {
      result.push(spice);
    }
  }
  return result;
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

  for (const spice of ingredientDefinition.spices ?? []) {
    const rawValue = rawSpices[spice.id];

    if (rawValue === undefined || rawValue === null) {
      validatedSpices[spice.id] = spice.value;
      continue;
    }

    const input = new InputType(rawValue);

    if (spice.type === 'number') {
      validatedSpices[spice.id] = input.cast('number', { max: spice.max, min: spice.min, value: spice.value }).value;
      continue;
    }

    if (spice.type === 'boolean') {
      validatedSpices[spice.id] = input.cast('boolean', { value: spice.value }).value;
      continue;
    }

    if (spice.type === 'select') {
      const isValid = spice.options.some((opt) => String(opt.value) === String(input.value));
      validatedSpices[spice.id] = isValid ? prepareSelectValue(input.value as SpiceValue, spice) : spice.value;
      continue;
    }

    validatedSpices[spice.id] = input.cast('string', { value: spice.value }).value;
  }
  return validatedSpices;
};
