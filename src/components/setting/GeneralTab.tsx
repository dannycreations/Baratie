import { memo, useCallback } from 'react';

import { useSettingStore } from '../../stores/useSettingStore';
import { ConfirmButton } from '../shared/Button';
import { BooleanInput } from '../shared/input/BooleanInput';
import { FormLayout } from '../shared/layout/FormLayout';

import type { JSX } from 'react';

export const GeneralTab = memo((): JSX.Element => {
  const allowMultipleOpen = useSettingStore((state) => state.multipleOpen);
  const setAllowMultipleOpen = useSettingStore((state) => state.setMultipleOpen);
  const persistRecipe = useSettingStore((state) => state.persistRecipe);
  const setPersistRecipe = useSettingStore((state) => state.setPersistRecipe);

  const handleResetApp = useCallback((): void => {
    localStorage.clear();
    window.location.reload();
  }, []);

  return (
    <div className="stack-v-medium">
      <div className="grid-standard">
        <div className="list-item-container-bordered">
          <FormLayout
            inputId="allow-multiple-open"
            label="Multi-Expand Accordions"
            description="Allows multiple categories or ingredient options to be open at the same time."
            direction="row"
            labelWrapperClasses="flex-1-min-0 order-2"
            inputWrapperClasses="order-1 flex-y-center"
          >
            {(id) => (
              <BooleanInput
                id={id}
                checked={allowMultipleOpen}
                offBackgroundColor="bg-border-primary"
                onChange={(e) => setAllowMultipleOpen(e.target.checked)}
              />
            )}
          </FormLayout>
        </div>
        <div className="list-item-container-bordered">
          <FormLayout
            inputId="persist-recipe"
            label="Persist Current Recipe"
            description="Automatically save the current recipe to your browser's local storage to prevent data loss."
            direction="row"
            labelWrapperClasses="flex-1-min-0 order-2"
            inputWrapperClasses="order-1 flex-y-center"
          >
            {(id) => (
              <BooleanInput
                id={id}
                checked={persistRecipe}
                offBackgroundColor="bg-border-primary"
                onChange={(e) => setPersistRecipe(e.target.checked)}
              />
            )}
          </FormLayout>
        </div>
      </div>
      <div className="danger-zone-container">
        <div className="danger-zone-content">
          <div className="stack-v-small">
            <h3 className="text-sm font-medium text-danger-fg">Danger Zone</h3>
            <p className="text-description-small">
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
