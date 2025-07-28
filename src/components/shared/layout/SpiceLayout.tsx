import { memo, useCallback, useMemo } from 'react';

import { logger } from '../../../app/container';
import { getVisibleSpices } from '../../../helpers/spiceHelper';
import { useThemeStore } from '../../../stores/useThemeStore';
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
  const handleBooleanChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onSpiceChange(spice.id, event.target.checked);
    },
    [onSpiceChange, spice],
  );

  const handleValueChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onSpiceChange(spice.id, event.target.value);
    },
    [onSpiceChange, spice],
  );

  const handleTextareaChange = useCallback(
    (newValue: string): void => {
      onSpiceChange(spice.id, newValue);
    },
    [onSpiceChange, spice],
  );

  const handleNumberChange = useCallback(
    (newValue: number): void => {
      onSpiceChange(spice.id, newValue);
    },
    [onSpiceChange, spice],
  );

  const handleSelectChange = useCallback(
    (newValue: SpiceValue): void => {
      onSpiceChange(spice.id, newValue);
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
            value={value}
            min={spice.min}
            max={spice.max}
            step={spice.step || 1}
            placeholder={spice.placeholder}
            onLongPressEnd={onLongPressEnd}
            onLongPressStart={onLongPressStart}
            onChange={handleNumberChange}
          />
        );
      }
      case 'string': {
        const value = typeof rawValue === 'string' ? rawValue : spice.value;
        return <StringInput id={id} value={value} placeholder={spice.placeholder} onChange={handleValueChange} />;
      }
      case 'textarea': {
        const value = typeof rawValue === 'string' ? rawValue : spice.value;
        return <TextareaInput id={id} value={value} placeholder={spice.placeholder} rows={4} onChange={handleTextareaChange} />;
      }
      case 'select': {
        const value = rawValue ?? spice.value;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          logger.warn(`Invalid value type for select spice '${spice.id}': ${typeof value}. Reverting to default.`);
          return <SelectInput id={id} value={spice.value} options={spice.options} onChange={handleSelectChange} />;
        }
        return <SelectInput id={id} value={value} options={spice.options} onChange={handleSelectChange} />;
      }
      default: {
        const unhandled = spice as SpiceDefinition;
        logger.warn(`Unhandled spice type: ${unhandled.type}`);
        return null;
      }
    }
  };

  return (
    <FormLayout
      inputId={`spice-${spice.id}`}
      label={spice.label}
      description={spice.description}
      direction={spice.type === 'boolean' ? 'row' : 'col'}
    >
      {(id) => renderInput(id)}
    </FormLayout>
  );
});

export const SpiceLayout = memo<SpiceLayoutProps>(
  ({ ingredient, currentSpices, onSpiceChange, containerClasses, onLongPressStart, onLongPressEnd }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const finalContainerClass = containerClasses || 'space-y-2';

    const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>): void => {
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
      <form role="form" className={finalContainerClass} aria-label={`Options for ${ingredient.name}`} onSubmit={handleSubmit}>
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
