import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { Tooltip } from '../Tooltip';

import type { JSX, ReactNode } from 'react';

interface FormLayoutProps {
  readonly children: (id: string) => ReactNode;
  readonly description?: string;
  readonly fieldSetClass?: string;
  readonly inputId: string;
  readonly inputWrapperClass?: string;
  readonly label: string;
  readonly labelClass?: string;
  readonly labelWrapperClass?: string;
}

export const FormLayout = memo(function FormLayout({
  label,
  inputId,
  children,
  description,
  fieldSetClass,
  labelWrapperClass,
  labelClass,
  inputWrapperClass,
}: FormLayoutProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  const finalFieldSetClass = fieldSetClass ?? 'flex flex-col gap-y-1 gap-x-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start';
  const finalLabelClass = labelClass ?? `font-medium text-sm ${theme.textSecondary}`;
  const finalLabelWrapClass = labelWrapperClass ?? 'sm:flex-shrink-0';
  const finalInputWrapperClass = inputWrapperClass ?? '';

  const labelElement = (
    <label htmlFor={inputId} className={finalLabelClass}>
      {label}:
    </label>
  );

  const labelContent = description ? (
    <Tooltip className={finalLabelWrapClass.trim()} content={description} disabled={!description} position="top" tooltipClassName="max-w-[250px]">
      {labelElement}
    </Tooltip>
  ) : (
    <span className={finalLabelWrapClass.trim()}>{labelElement}</span>
  );

  return (
    <div className={finalFieldSetClass}>
      {labelContent}
      <div className={finalInputWrapperClass}>{children(inputId)}</div>
    </div>
  );
});
