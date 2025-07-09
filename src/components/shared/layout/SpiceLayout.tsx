import { memo, useCallback } from 'react';

import { logger } from '../../../app/container';
import { getVisibleSpices } from '../../../helpers/spiceHelper';
import { useThemeStore } from '../../../stores/useThemeStore';
import { BooleanInput } from '../input/BooleanInput';
import { NumberInput } from '../input/NumberInput';
import { SelectInput } from '../input/SelectInput';
import { StringInput } from '../input/StringInput';
import { FormLayout } from './FormLayout';

import type { ChangeEvent, JSX, ReactNode } from 'react';
import type { IngredientDefinition, SpiceDefinition } from '../../../core/IngredientRegistry';

interface SpiceRendererProps {
  readonly ingredientDefinition: IngredientDefinition;
  readonly isLast: boolean;
  readonly onSpiceChange: (spiceId: string, newValue: boolean | number | string, spice: SpiceDefinition) => void;
  readonly spice: SpiceDefinition;
  readonly value: unknown;
}

const SpiceRenderer = memo(function SpiceRenderer({ ingredientDefinition, spice, value: rawValue, onSpiceChange, isLast }: SpiceRendererProps) {
  const theme = useThemeStore((state) => state.theme);
  const inputId = `spice-${String(ingredientDefinition.id)}-${spice.id}`;

  const handleBooleanChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onSpiceChange(spice.id, event.target.checked, spice),
    [onSpiceChange, spice],
  );
  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onSpiceChange(spice.id, event.target.value, spice),
    [onSpiceChange, spice],
  );
  const handleSelectChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onSpiceChange(spice.id, event.target.value, spice);
    },
    [onSpiceChange, spice],
  );

  const renderInput = (id: string): ReactNode => {
    switch (spice.type) {
      case 'boolean': {
        const value = typeof rawValue === 'boolean' ? rawValue : spice.value;
        return <BooleanInput id={id} checked={value} onChange={handleBooleanChange} />;
      }
      case 'number': {
        const value = typeof rawValue === 'number' ? rawValue : spice.value;
        return (
          <NumberInput
            id={id}
            max={spice.max}
            min={spice.min}
            placeholder={spice.placeholder}
            step={spice.step || 1}
            value={String(value)}
            onChange={handleValueChange}
          />
        );
      }
      case 'string': {
        const value = typeof rawValue === 'string' ? rawValue : spice.value;
        return <StringInput id={id} placeholder={spice.placeholder} value={value} onChange={handleValueChange} />;
      }
      case 'textarea': {
        const value = typeof rawValue === 'string' ? rawValue : spice.value;
        return (
          <textarea
            id={id}
            className={`w-full rounded-md border p-2 outline-none disabled:cursor-not-allowed disabled:opacity-50 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} ${theme.textPlaceholder} ${theme.inputFocusRing}`}
            placeholder={spice.placeholder}
            rows={4}
            value={value}
            onChange={handleValueChange}
          />
        );
      }
      case 'select': {
        const value = rawValue ?? spice.value;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          return null;
        }
        return <SelectInput id={id} options={spice.options} value={String(value)} onChange={handleSelectChange} />;
      }
      default: {
        const exhaustiveCheck: never = spice;
        logger.warn(`Unhandled spice type: ${(exhaustiveCheck as SpiceDefinition).type}`);
        return null;
      }
    }
  };

  const isBoolean = spice.type === 'boolean';
  const baseFieldSetClass = isBoolean
    ? 'flex flex-row items-center justify-start gap-x-3'
    : 'flex flex-col gap-y-1 gap-x-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start';
  const fieldSetClass = isLast ? `${baseFieldSetClass} pb-3` : baseFieldSetClass;
  const inputWrapperClass = isBoolean ? 'flex h-8 items-center' : 'w-full sm:w-auto sm:min-w-44 sm:flex-grow';

  return (
    <FormLayout
      description={spice.description}
      fieldSetClass={fieldSetClass}
      inputId={inputId}
      inputWrapperClass={inputWrapperClass}
      label={spice.label}
    >
      {(id) => renderInput(id)}
    </FormLayout>
  );
});

interface SpiceLayoutProps {
  readonly containerClassName?: string;
  readonly currentSpices: Readonly<Record<string, unknown>>;
  readonly ingredientDefinition: IngredientDefinition;
  readonly onSpiceChange: (spiceId: string, newValue: boolean | number | string, spice: SpiceDefinition) => void;
}

export const SpiceLayout = memo(function SpiceLayout({
  ingredientDefinition,
  currentSpices,
  onSpiceChange,
  containerClassName,
}: SpiceLayoutProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const finalContainerClass = containerClassName || 'space-y-3';

  if (!ingredientDefinition.spices || ingredientDefinition.spices.length === 0) {
    return <p className={`text-sm italic ${theme.textTertiary}`}>This ingredient has no configurable options.</p>;
  }

  const visibleSpices = getVisibleSpices(ingredientDefinition, currentSpices);

  if (visibleSpices.length === 0) {
    return <p className={`text-sm italic ${theme.textTertiary}`}>No options are available. Adjust other values to see more.</p>;
  }

  return (
    <form
      aria-label={`Options for ${ingredientDefinition.name}`}
      className={finalContainerClass}
      onSubmit={(event) => event.preventDefault()}
      role="form"
    >
      {visibleSpices.map((spice, index) => {
        const rawValue = currentSpices[spice.id];
        return (
          <SpiceRenderer
            key={spice.id}
            ingredientDefinition={ingredientDefinition}
            isLast={index === visibleSpices.length - 1}
            spice={spice}
            value={rawValue}
            onSpiceChange={onSpiceChange}
          />
        );
      })}
    </form>
  );
});
