import { useThemeStore } from '../../../stores/useThemeStore';
import { cn } from '../../../utilities/styleUtil';
import { Tooltip } from '../Tooltip';

import type { JSX, ReactNode } from 'react';

interface FormLayoutProps {
  readonly children: (id: string) => ReactNode;
  readonly inputId: string;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly direction?: 'col' | 'row';
  readonly inputWrapperClasses?: string;
  readonly label?: string;
  readonly labelClasses?: string;
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
  labelClasses,
  inputWrapperClasses,
}: FormLayoutProps): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const isRow = direction === 'row';

  const containerClass = cn(isRow ? 'flex items-center justify-start gap-2' : 'flex flex-col gap-2', className);
  const finalLabelWrapClass = cn(isRow ? 'min-w-0' : '', labelWrapperClasses);
  const finalInputWrapClass = cn(isRow ? 'flex h-8 shrink-0 items-center' : 'w-full', inputWrapperClasses);
  const finalLabelClass = cn('font-medium text-sm', `text-${theme.contentSecondary}`, labelClasses);

  const labelText = <span className="block truncate">{label}</span>;

  return (
    <div className={containerClass}>
      {label ? (
        <div className={finalLabelWrapClass}>
          <label className={finalLabelClass}>
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
      <div className={finalInputWrapClass}>{children(inputId)}</div>
    </div>
  );
};
