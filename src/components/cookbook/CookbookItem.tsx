import { memo, useCallback } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { UploadCloudIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ListLayout';

import type { JSX } from 'react';
import type { RecipebookItem } from '../../core/IngredientRegistry';

export interface CookbookItemHandlers {
  readonly onLoad: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

interface CookbookItemProps extends CookbookItemHandlers {
  readonly recipe: RecipebookItem;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTimestamp(timestamp: number): string {
  return timestampFormatter.format(new Date(timestamp));
}

export const CookbookItem = memo<CookbookItemProps>(({ recipe, onLoad, onDelete }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const handleConfirmDelete = useCallback((): void => {
    onDelete(recipe.id);
  }, [onDelete, recipe.id]);

  const handleLoad = useCallback((): void => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 p-2 rounded-md bg-${theme.surfaceTertiary} transition-colors duration-150 hover:bg-${theme.surfaceHover}`}
        leftClasses="grow min-w-0 mr-2"
        leftContent={
          <>
            <span className={`block truncate font-medium text-sm text-${theme.contentPrimary} cursor-default outline-none`}>{recipe.name}</span>
            <p className={`text-xs text-${theme.contentTertiary}`}>
              Last Updated: {formatTimestamp(recipe.updatedAt)} ({recipe.ingredients.length} steps)
            </p>
          </>
        }
        rightContent={
          <>
            <TooltipButton
              icon={<UploadCloudIcon size={18} />}
              size="sm"
              variant="primary"
              tooltipContent="Load Recipe"
              tooltipPosition="left"
              onClick={handleLoad}
            >
              Load
            </TooltipButton>

            <ConfirmButton actionName="Delete" itemType="Recipe" tooltipPosition="left" onConfirm={handleConfirmDelete} />
          </>
        }
      />
    </li>
  );
});
