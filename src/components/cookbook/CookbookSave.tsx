import { memo, useCallback } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { cn } from '../../utilities/styleUtil';
import { StringInput } from '../shared/input/StringInput';
import { FormLayout } from '../shared/layout/FormLayout';

import type { ChangeEvent, JSX, KeyboardEvent, RefObject } from 'react';

interface CookbookSaveProps {
  readonly isRecipeEmpty: boolean;
  readonly nameRef: RefObject<HTMLInputElement | null>;
  readonly nameInput: string;
  readonly onNameChange: (name: string) => void;
  readonly onSave: () => void;
}

export const CookbookSave = memo<CookbookSaveProps>(({ nameInput, onNameChange, onSave, isRecipeEmpty, nameRef }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && nameInput.trim() && !isRecipeEmpty) {
        onSave();
      }
    },
    [nameInput, isRecipeEmpty, onSave],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onNameChange(event.target.value);
    },
    [onNameChange],
  );

  return (
    <>
      <FormLayout label="Recipe Name:" inputId="recipeName" inputWrapperClasses="w-full">
        {(id) => (
          <StringInput
            id={id}
            inputRef={nameRef}
            type="text"
            value={nameInput}
            placeholder="Enter Recipe Name..."
            showClearButton
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClear={() => onNameChange('')}
          />
        )}
      </FormLayout>
      {isRecipeEmpty && (
        <p className={cn('mt-3 text-center text-sm', `text-${theme.warningFg}`)}>
          Your recipe is empty. Add ingredients from the panel on the left before saving.
        </p>
      )}
    </>
  );
});
