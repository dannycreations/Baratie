import { memo, useCallback } from 'react';

import { useSettingStore } from '../../stores/useSettingStore';
import { ConfirmButton } from '../shared/Button';
import { BooleanInput } from '../shared/input/BooleanInput';
import { FormLayout } from '../shared/layout/FormLayout';

import type { ChangeEvent, JSX } from 'react';

export const GeneralTab = memo((): JSX.Element => {
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

  const handleResetApp = useCallback((): void => {
    localStorage.clear();
    window.location.reload();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="list-item-container h-auto border border-border-primary p-3">
          <FormLayout
            inputId="allow-multiple-open"
            label="Multi-Expand Accordions"
            description="Allows multiple categories or ingredient options to be open at the same time."
            direction="row"
            labelWrapperClasses="flex-1 order-2"
            inputWrapperClasses="order-1 flex items-center"
          >
            {(id) => <BooleanInput id={id} checked={allowMultipleOpen} offBackgroundColor="bg-border-primary" onChange={handleToggleMultipleOpen} />}
          </FormLayout>
        </div>
        <div className="list-item-container h-auto border border-border-primary p-3">
          <FormLayout
            inputId="persist-recipe"
            label="Persist Current Recipe"
            description="Automatically save the current recipe to your browser's local storage to prevent data loss."
            direction="row"
            labelWrapperClasses="flex-1 order-2"
            inputWrapperClasses="order-1 flex items-center"
          >
            {(id) => <BooleanInput id={id} checked={persistRecipe} offBackgroundColor="bg-border-primary" onChange={handleTogglePersistRecipe} />}
          </FormLayout>
        </div>
      </div>
      <div className="rounded-md border border-danger-border bg-surface-tertiary p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-danger-fg">Danger Zone</h3>
            <p className="text-xs text-content-secondary">
              Resetting the application will permanently delete all your recipes, extensions, settings, and local data. This action cannot be undone.
            </p>
          </div>
          <ConfirmButton
            actionName="Reset"
            itemType="Application"
            confirmTooltip="Confirm Reset Data"
            tooltipPosition="left"
            onConfirm={handleResetApp}
          />
        </div>
      </div>
    </div>
  );
});
