import { memo } from 'react';

import { useThemeStore } from '../../../stores/useThemeStore';
import { Tooltip } from '../Tooltip';

import type { JSX, ReactNode } from 'react';

interface FormLayoutProps {
  readonly children: (id: string) => ReactNode;
  readonly inputId: string;
  readonly className?: string;
  readonly description?: string;
  readonly direction?: 'col' | 'row';
  readonly inputWrapperClasses?: string;
  readonly label?: string;
  readonly labelClasses?: string;
  readonly labelWrapperClasses?: string;
}

export const FormLayout = memo<FormLayoutProps>(
  ({ label, inputId, children, description, direction = 'col', className, labelWrapperClasses, labelClasses, inputWrapperClasses }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const isRow = direction === 'row';

    const containerClass = className ?? (isRow ? 'flex items-center justify-start gap-2' : 'flex flex-col gap-2');
    const finalLabelWrapClass = labelWrapperClasses ?? (isRow ? 'min-w-0' : '');
    const finalInputWrapClass = inputWrapperClasses ?? (isRow ? 'flex h-8 shrink-0 items-center' : 'w-full');
    const finalLabelClass = labelClasses ?? `text-sm font-medium text-${theme.contentSecondary} truncate`;

    const labelElement = label ? <label className={finalLabelClass}>{label}:</label> : null;

    const labelContent = description ? (
      <Tooltip className={finalLabelWrapClass.trim()} content={description} disabled={!description} position="top" tooltipClasses="max-w-[250px]">
        {labelElement}
      </Tooltip>
    ) : (
      <span className={finalLabelWrapClass.trim()}>{labelElement}</span>
    );

    return (
      <div className={containerClass}>
        {label && labelContent}
        <div className={finalInputWrapClass}>{children(inputId)}</div>
      </div>
    );
  },
);
