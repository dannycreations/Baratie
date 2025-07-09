import { memo } from 'react';

import { StringInput } from './StringInput';

import type { ChangeEventHandler, InputHTMLAttributes, JSX } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  readonly ariaLabel: string;
  readonly className?: string;
  readonly id: string;
  readonly max?: number;
  readonly min?: number;
  readonly placeholder?: string;
  readonly step?: number;
  readonly value: string;
  readonly onChange: ChangeEventHandler<HTMLInputElement>;
}

export const NumberInput = memo(function NumberInput(props: NumberInputProps): JSX.Element {
  return <StringInput type="number" {...props} />;
});
