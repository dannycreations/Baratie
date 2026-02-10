import { memo, useCallback } from 'react';

import { StringInput } from '../shared/input/StringInput';
import { FormLayout } from '../shared/layout/FormLayout';

import type { ChangeEvent, JSX, KeyboardEvent, RefObject } from 'react';

interface CookbookSaveProps {
  readonly isRecipeEmpty: boolean;
  readonly nameRef: RefObject<HTMLInputElement | null>;
  readonly nameInput: string;
  readonly onNameChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  readonly onClear: () => void;
  readonly onSave: () => void;
}

export const CookbookSave = memo<CookbookSaveProps>(({ nameInput, onNameChange, onClear, onSave, isRecipeEmpty, nameRef }): JSX.Element => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && nameInput.trim() && !isRecipeEmpty) {
        onSave();
      }
    },
    [nameInput, isRecipeEmpty, onSave],
  );

  return (
    <div className="flex-col-gap-2">
      <FormLayout label="Recipe Name:" inputId="recipeName" inputWrapperClasses="w-full">
        {(id) => (
          <StringInput
            id={id}
            inputRef={nameRef}
            type="text"
            value={nameInput}
            placeholder="Enter Recipe Name..."
            showClearButton
            onChange={onNameChange}
            onKeyDown={handleKeyDown}
            onClear={onClear}
          />
        )}
      </FormLayout>
      {isRecipeEmpty && (
        <p className="info-message-box mt-3 text-warning-fg">Your recipe is empty. Add ingredients from the panel on the left before saving.</p>
      )}
    </div>
  );
});
