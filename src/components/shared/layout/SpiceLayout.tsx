import { memo, useCallback, useMemo } from 'react';

import { getVisibleSpices } from '../../../helpers/spiceHelper';
import { BooleanInput } from '../input/BooleanInput';
import { NumberInput } from '../input/NumberInput';
import { SelectInput } from '../input/SelectInput';
import { StringInput } from '../input/StringInput';
import { TextareaInput } from '../input/TextareaInput';
import { FormLayout } from './FormLayout';

import type { ChangeEvent, FormEvent, JSX, ReactNode } from 'react';
import type { IngredientDefinition, SpiceDefinition, SpiceValue } from '../../../core/IngredientRegistry';

interface SpiceRendererProps {
  readonly spice: SpiceDefinition;
  readonly value: SpiceValue | undefined | null;
  readonly onSpiceChange: (spiceId: string, newValue: SpiceValue) => void;
  readonly onLongPressEnd?: () => void;
  readonly onLongPressStart?: () => void;
}

interface SpiceLayoutProps {
  readonly ingredient: IngredientDefinition;
  readonly currentSpices: Readonly<Record<string, SpiceValue>>;
  readonly onSpiceChange: (spiceId: string, newValue: SpiceValue) => void;
  readonly onLongPressEnd?: () => void;
  readonly onLongPressStart?: () => void;
  readonly containerClasses?: string;
}

const SpiceRenderer = memo<SpiceRendererProps>(({ spice, value: rawValue, onSpiceChange, onLongPressStart, onLongPressEnd }): JSX.Element => {
  const { id: spiceId } = spice;

  const handleChange = useCallback(
    (value: SpiceValue | ChangeEvent<HTMLInputElement>): void => {
      if (typeof value === 'object' && 'target' in value) {
        const target = value.target as HTMLInputElement;
        onSpiceChange(spiceId, spice.type === 'boolean' ? target.checked : target.value);
      } else {
        onSpiceChange(spiceId, value);
      }
    },
    [onSpiceChange, spiceId, spice.type],
  );

  const renderInput = (id: string): ReactNode => {
    switch (spice.type) {
      case 'boolean': {
        const value = typeof rawValue === 'boolean' ? rawValue : spice.value;
        return <BooleanInput id={id} checked={value} onChange={handleChange} />;
      }
      case 'number': {
        const value = typeof rawValue === 'number' ? rawValue : spice.value;
        return (
          <NumberInput
            id={id}
            value={value}
            min={spice.min}
            max={spice.max}
            step={spice.step || 1}
            placeholder={spice.placeholder}
            onLongPressEnd={onLongPressEnd}
            onLongPressStart={onLongPressStart}
            onChange={handleChange}
          />
        );
      }
      case 'string': {
        const value = typeof rawValue === 'string' ? rawValue : spice.value;
        return <StringInput id={id} value={value} placeholder={spice.placeholder} onChange={handleChange} />;
      }
      case 'textarea': {
        const value = typeof rawValue === 'string' ? rawValue : spice.value;
        return <TextareaInput id={id} value={value} placeholder={spice.placeholder} rows={4} onChange={handleChange} />;
      }
      case 'select': {
        const isValid = ['string', 'number', 'boolean'].includes(typeof rawValue);
        const value = isValid ? (rawValue as SpiceValue) : spice.value;
        return <SelectInput id={id} value={value} options={spice.options} onChange={handleChange} />;
      }
      default: {
        return null;
      }
    }
  };

  return (
    <FormLayout
      inputId={`spice-${spice.id}`}
      label={`${spice.label}:`}
      description={spice.description}
      direction={spice.type === 'boolean' ? 'row' : 'col'}
    >
      {(id) => renderInput(id)}
    </FormLayout>
  );
});

export const SpiceLayout = memo<SpiceLayoutProps>(
  ({ ingredient, currentSpices, onSpiceChange, containerClasses, onLongPressStart, onLongPressEnd }): JSX.Element => {
    const finalContainerClass = containerClasses || 'list-container';

    const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
    }, []);

    const visibleSpices = useMemo(() => {
      return getVisibleSpices(ingredient, currentSpices);
    }, [ingredient, currentSpices]);

    if (!ingredient.spices || ingredient.spices.length === 0) {
      return <p className="text-sm italic text-content-tertiary">This ingredient has no configurable options.</p>;
    }

    if (visibleSpices.length === 0) {
      return <p className="text-sm italic text-content-tertiary">No options are available. Adjust other values to see more.</p>;
    }

    return (
      <form className={finalContainerClass} onSubmit={handleSubmit}>
        {visibleSpices.map((spice) => {
          const rawValue = currentSpices[spice.id];
          return (
            <SpiceRenderer
              key={spice.id}
              spice={spice}
              value={rawValue}
              onSpiceChange={onSpiceChange}
              onLongPressStart={onLongPressStart}
              onLongPressEnd={onLongPressEnd}
            />
          );
        })}
      </form>
    );
  },
);
