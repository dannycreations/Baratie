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

export const FormLayout = memo<FormLayoutProps>(
  ({ label, inputId, children, description, fieldSetClass, labelWrapperClass, labelClass, inputWrapperClass }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const fieldSetClasses = fieldSetClass ?? 'flex flex-col gap-y-1 gap-x-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start';
    const labelClasses = labelClass ?? `font-medium text-sm text-${theme.contentSecondary}`;
    const labelWrapClasses = labelWrapperClass ?? 'sm:shrink-0';
    const inputWrapClasses = inputWrapperClass ?? '';

    const labelElement = (
      <label htmlFor={inputId} className={labelClasses}>
        {label}:
      </label>
    );

    const labelContent = description ? (
      <Tooltip className={labelWrapClasses.trim()} content={description} disabled={!description} position="top" tooltipClassName="max-w-[250px]">
        {labelElement}
      </Tooltip>
    ) : (
      <span className={labelWrapClasses.trim()}>{labelElement}</span>
    );

    return (
      <div className={fieldSetClasses}>
        {labelContent}
        <div className={inputWrapClasses}>{children(inputId)}</div>
      </div>
    );
  },
);
