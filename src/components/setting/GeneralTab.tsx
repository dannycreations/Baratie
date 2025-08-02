import { memo, useCallback } from 'react';

import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { FormLayout } from '../shared/layout/FormLayout';

import type { ChangeEvent, JSX } from 'react';

export const GeneralTab = memo((): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const allowMultipleOpen = useSettingStore((state) => state.allowMultipleOpen);
  const setAllowMultipleOpen = useSettingStore((state) => state.setAllowMultipleOpen);

  const handleToggleMultipleOpen = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setAllowMultipleOpen(event.target.checked);
    },
    [setAllowMultipleOpen],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <p className={`text-sm text-${theme.contentTertiary}`}>Manage general application behavior and user interface preferences.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`p-3 rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary}`}>
          <FormLayout
            inputId="allow-multiple-open"
            label="Multi-Expand Accordions"
            description="Allows multiple categories or ingredient options to be open at the same time."
            direction="row"
            labelWrapperClasses="flex-1 order-2"
            inputWrapperClasses="order-1 flex items-center"
          >
            {(id) => (
              <BooleanInput id={id} checked={allowMultipleOpen} offBackgroundColor={theme.borderPrimary} onChange={handleToggleMultipleOpen} />
            )}
          </FormLayout>
        </div>
      </div>
    </div>
  );
});
