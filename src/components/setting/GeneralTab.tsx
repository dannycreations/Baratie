import { memo, useCallback } from 'react';

import { useSettingStore } from '../../stores/useSettingStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { BooleanInput } from '../shared/input/BooleanInput';
import { FormLayout } from '../shared/layout/FormLayout';

import type { ChangeEvent, JSX } from 'react';

export const GeneralTab = memo((): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const allowMultipleOpen = useSettingStore((state) => state.multipleOpen);
  const setAllowMultipleOpen = useSettingStore((state) => state.setMultipleOpen);
  const persistRecipe = useSettingStore((state) => state.persistRecipe);
  const setPersistRecipe = useSettingStore((state) => state.setPersistRecipe);

  const handleToggleMultipleOpen = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setAllowMultipleOpen(event.target.checked);
    },
    [setAllowMultipleOpen],
  );

  const handleTogglePersistRecipe = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setPersistRecipe(event.target.checked);
    },
    [setPersistRecipe],
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className={`p-3 rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary}`}>
        <FormLayout
          inputId="allow-multiple-open"
          label="Multi-Expand Accordions"
          description="Allows multiple categories or ingredient options to be open at the same time."
          direction="row"
          labelWrapperClasses="flex-1 order-2"
          inputWrapperClasses="order-1 flex items-center"
        >
          {(id) => <BooleanInput id={id} checked={allowMultipleOpen} offBackgroundColor={theme.borderPrimary} onChange={handleToggleMultipleOpen} />}
        </FormLayout>
      </div>
      <div className={`p-3 rounded-md border border-${theme.borderPrimary} bg-${theme.surfaceTertiary}`}>
        <FormLayout
          inputId="persist-recipe"
          label="Persist Current Recipe"
          description="Automatically save the current recipe to your browser's local storage to prevent data loss."
          direction="row"
          labelWrapperClasses="flex-1 order-2"
          inputWrapperClasses="order-1 flex items-center"
        >
          {(id) => <BooleanInput id={id} checked={persistRecipe} offBackgroundColor={theme.borderPrimary} onChange={handleTogglePersistRecipe} />}
        </FormLayout>
      </div>
    </div>
  );
});
