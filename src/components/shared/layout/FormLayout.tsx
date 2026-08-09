import { cn } from 'cnfast';

import { Tooltip } from '../Tooltip';

import type { JSX, ReactNode } from 'react';

interface FormLayoutProps {
  readonly children?: (id: string) => ReactNode;
  readonly inputId: string;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly direction?: 'col' | 'row';
  readonly inputWrapperClasses?: string;
  readonly label?: string;
  readonly labelWrapperClasses?: string;
}

export const FormLayout = ({
  label,
  inputId,
  children,
  description,
  direction = 'col',
  className,
  labelWrapperClasses,
  inputWrapperClasses,
}: FormLayoutProps): JSX.Element => {
  const isRow = direction === 'row';
  const labelText = <span className="block truncate">{label}</span>;

  return (
    <div className={cn(isRow ? 'flex-y-center justify-start gap-2' : 'stack-v-medium', className)}>
      {label ? (
        <div className={cn(isRow ? 'flex-1-min-0' : '', labelWrapperClasses)}>
          <label className="label-base">
            {description ? (
              <Tooltip
                content={description}
                disabled={!description}
                position="top"
                tooltipClasses="max-w-[250px]"
                className="inline-block max-w-full"
              >
                {labelText}
              </Tooltip>
            ) : (
              labelText
            )}
          </label>
        </div>
      ) : null}
      <div className={cn(isRow ? 'flex h-8 shrink-0 items-center' : 'w-full', inputWrapperClasses)}>{children?.(inputId)}</div>
    </div>
  );
};
