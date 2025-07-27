import { memo, useCallback } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
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
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && nameInput.trim() && !isRecipeEmpty) {
        onSave();
      }
    },
    [nameInput, isRecipeEmpty, onSave],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value);
    },
    [onNameChange],
  );

  return (
    <>
      <FormLayout label="Recipe Name" inputId="recipeName" inputWrapperClasses="w-full">
        {(id) => (
          <StringInput
            id={id}
            inputRef={nameRef}
            placeholder="Enter Recipe Name..."
            type="text"
            value={nameInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        )}
      </FormLayout>
      {isRecipeEmpty && <p className={`mt-2 text-sm text-${theme.warningFg}`}>The current recipe is empty. Add ingredients to save or export.</p>}
    </>
  );
});
