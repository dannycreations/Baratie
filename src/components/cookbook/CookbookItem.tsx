import { memo, useCallback, useMemo } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { HighlightText } from '../shared/HighlightText';
import { UploadCloudIcon } from '../shared/Icon';

import type { JSX } from 'react';
import type { RecipebookItem } from '../../core/IngredientRegistry';

export interface CookbookItemHandlers {
  readonly onLoad: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

interface CookbookItemProps extends CookbookItemHandlers {
  readonly recipe: RecipebookItem;
  readonly query: string;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const CookbookItem = memo<CookbookItemProps>(({ recipe, onLoad, onDelete, query }): JSX.Element => {
  const handleConfirmDelete = useCallback((): void => {
    onDelete(recipe.id);
  }, [onDelete, recipe.id]);

  const handleLoad = useCallback((): void => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  const formattedTimestamp = useMemo(() => timestampFormatter.format(recipe.updatedAt), [recipe.updatedAt]);

  return (
    <li className="flex h-16 w-full list-none items-center justify-between rounded-md bg-surface-tertiary p-2 transition-colors duration-150 hover:bg-surface-hover">
      <div className="mr-2 grow min-w-0">
        <h3 className="block cursor-default truncate text-sm font-medium text-content-primary outline-none">
          <HighlightText text={recipe.name} highlight={query} />
        </h3>
        <p className="text-xs text-content-tertiary">
          Last Updated: {formattedTimestamp} ({recipe.ingredients.length} steps)
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <TooltipButton
          icon={<UploadCloudIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="primary"
          tooltipContent="Load Recipe"
          tooltipPosition="left"
          onClick={handleLoad}
        >
          Load
        </TooltipButton>

        <ConfirmButton actionName="Delete" itemType="Recipe" tooltipPosition="left" onConfirm={handleConfirmDelete} />
      </div>
    </li>
  );
});
