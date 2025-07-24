import { memo, useCallback, useMemo } from 'react';

import { logger } from '../../../app/container';
import { getVisibleSpices } from '../../../helpers/spiceHelper';
import { useThemeStore } from '../../../stores/useThemeStore';
import { BooleanInput } from '../input/BooleanInput';
import { SelectInput } from '../input/SelectInput';
import { StringInput } from '../input/StringInput';
import { FormLayout } from './FormLayout';

import type { ChangeEvent, FormEvent, JSX, ReactNode } from 'react';
import type { IngredientDefinition, SpiceDefinition, SpiceValue } from '../../../core/IngredientRegistry';

interface SpiceRendererProps {
  readonly onSpiceChange: (spiceId: string, newValue: SpiceValue, spice: SpiceDefinition) => void;
  readonly spice: SpiceDefinition;
  readonly value: SpiceValue | undefined | null;
}

interface SpiceLayoutProps {
  readonly containerClasses?: string;
  readonly currentSpices: Readonly<Record<string, SpiceValue>>;
  readonly ingredient: IngredientDefinition;
  readonly onSpiceChange: (spiceId: string, newValue: SpiceValue, spice: SpiceDefinition) => void;
}

const SpiceRenderer = memo<SpiceRendererProps>(({ spice, value: rawValue, onSpiceChange }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const handleBooleanChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onSpiceChange(spice.id, event.target.checked, spice);
    },
    [onSpiceChange, spice],
  );

  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onSpiceChange(spice.id, event.target.value, spice);
    },
    [onSpiceChange, spice],
  );

  const handleSelectChange = useCallback(
    (newValue: SpiceValue) => {
      onSpiceChange(spice.id, newValue, spice);
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
          <StringInput
            id={id}
            type="number"
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
        const textareaClass = `
          w-full rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary} p-2
          text-${theme.contentPrimary} placeholder:text-${theme.contentTertiary} outline-none
          focus:ring-2 focus:ring-${theme.ring} disabled:opacity-50
        `;
        return <textarea id={id} className={textareaClass} placeholder={spice.placeholder} rows={4} value={value} onChange={handleValueChange} />;
      }
      case 'select': {
        const value = rawValue ?? spice.value;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          logger.warn(`Invalid value type for select spice '${spice.id}': ${typeof value}. Reverting to default.`);
          return <SelectInput id={id} options={spice.options} value={spice.value} onChange={handleSelectChange} />;
        }
        return <SelectInput id={id} options={spice.options} value={value} onChange={handleSelectChange} />;
      }
      default: {
        const unhandled = spice as SpiceDefinition;
        logger.warn(`Unhandled spice type: ${unhandled.type}`);
        return null;
      }
    }
  };

  const isBoolean = spice.type === 'boolean';
  const fieldSetClass = isBoolean
    ? 'flex items-center justify-start gap-x-3'
    : 'flex flex-col gap-y-1 gap-x-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start';
  const inputWrapperClass = isBoolean ? 'flex h-8 items-center' : 'w-full sm:w-auto sm:min-w-44 sm:grow';

  return (
    <FormLayout
      description={spice.description}
      fieldSetClasses={fieldSetClass}
      inputId={`spice-${spice.id}`}
      inputWrapperClasses={inputWrapperClass}
      label={spice.label}
    >
      {(id) => renderInput(id)}
    </FormLayout>
  );
});

export const SpiceLayout = memo<SpiceLayoutProps>(({ ingredient, currentSpices, onSpiceChange, containerClasses }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const finalContainerClass = containerClasses || 'space-y-3';

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  const visibleSpices = useMemo(() => {
    return getVisibleSpices(ingredient, currentSpices);
  }, [ingredient, currentSpices]);

  if (!ingredient.spices || ingredient.spices.length === 0) {
    return <p className={`text-sm italic text-${theme.contentTertiary}`}>This ingredient has no configurable options.</p>;
  }

  if (visibleSpices.length === 0) {
    return <p className={`text-sm italic text-${theme.contentTertiary}`}>No options are available. Adjust other values to see more.</p>;
  }

  return (
    <form role="form" aria-label={`Options for ${ingredient.name}`} className={finalContainerClass} onSubmit={handleSubmit}>
      {visibleSpices.map((spice) => {
        const rawValue = currentSpices[spice.id];
        return <SpiceRenderer key={spice.id} spice={spice} value={rawValue} onSpiceChange={onSpiceChange} />;
      })}
    </form>
  );
});
