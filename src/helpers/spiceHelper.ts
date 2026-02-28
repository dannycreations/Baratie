import { errorHandler } from '../app/container';
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
  const spices = ingredientDefinition.spices;

  if (!spices || spices.length === 0) {
    return validatedSpices;
  }

  const len = spices.length;
  for (let i = 0; i < len; i++) {
    const spice = spices[i];
    const spiceId = spice.id;
    const rawValue = rawSpices[spiceId];

    if (rawValue === undefined || rawValue === null) {
      validatedSpices[spiceId] = spice.value;
      continue;
    }

    const spiceType = spice.type;
    const rawValueType = typeof rawValue;

    if (spiceType === 'number' && rawValueType === 'number') {
      const num = rawValue as number;
      const { min, max } = spice;
      validatedSpices[spiceId] = min !== undefined || max !== undefined ? Math.min(max ?? num, Math.max(min ?? num, num)) : num;
      continue;
    }

    if (spiceType === 'boolean' && rawValueType === 'boolean') {
      validatedSpices[spiceId] = rawValue as boolean;
      continue;
    }

    if ((spiceType === 'string' || spiceType === 'textarea') && rawValueType === 'string') {
      validatedSpices[spiceId] = rawValue as string;
      continue;
    }

    const input = new InputType(rawValue);
    switch (spiceType) {
      case 'number':
        validatedSpices[spiceId] = input.cast('number', { max: spice.max, min: spice.min, value: spice.value }).value;
        break;
      case 'boolean':
        validatedSpices[spiceId] = input.cast('boolean', { value: spice.value }).value;
        break;
      case 'select': {
        const val = input.value;
        const isValid = spice.options.some((opt) => String(opt.value) === String(val));
        validatedSpices[spiceId] = isValid ? prepareSelectValue(val as SpiceValue, spice) : spice.value;
        break;
      }
      case 'string':
      case 'textarea':
        validatedSpices[spiceId] = input.cast('string', { value: spice.value }).value;
        break;
      default:
        validatedSpices[spiceId] = input.value as SpiceValue;
    }
  }
  return validatedSpices;
};
