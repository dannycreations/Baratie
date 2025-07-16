import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { Tooltip } from '../Tooltip';

import type { JSX, ReactNode } from 'react';

interface FormLayoutProps {
  readonly children: (id: string) => ReactNode;
  readonly description?: string;
  readonly fieldSetClasses?: string;
  readonly inputId: string;
  readonly inputWrapperClasses?: string;
  readonly label: string;
  readonly labelClasses?: string;
  readonly labelWrapperClasses?: string;
}

export const FormLayout = memo<FormLayoutProps>(
  ({ label, inputId, children, description, fieldSetClasses, labelWrapperClasses, labelClasses, inputWrapperClasses }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    const fieldSetClass = fieldSetClasses ?? 'flex flex-col gap-y-1 gap-x-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start';
    const labelClass = labelClasses ?? `font-medium text-sm text-${theme.contentSecondary}`;
    const labelWrapClass = labelWrapperClasses ?? 'sm:shrink-0';
    const inputWrapClass = inputWrapperClasses ?? '';

    const labelElement = (
      <label htmlFor={inputId} className={labelClass}>
        {label}:
      </label>
    );

    const labelContent = description ? (
      <Tooltip className={labelWrapClass.trim()} content={description} disabled={!description} position="top" tooltipClasses="max-w-[250px]">
        {labelElement}
      </Tooltip>
    ) : (
      <span className={labelWrapClass.trim()}>{labelElement}</span>
    );

    return (
      <div className={fieldSetClass}>
        {labelContent}
        <div className={inputWrapClass}>{children(inputId)}</div>
      </div>
    );
  },
);
