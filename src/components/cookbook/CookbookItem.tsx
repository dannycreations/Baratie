import { memo, useCallback } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { UploadCloudIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { Tooltip } from '../shared/Tooltip';

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
  return timestampFormatter.format(timestamp);
}

export const CookbookItem = memo<CookbookItemProps>(({ recipe, onLoad, onDelete }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const handleConfirmDelete = useCallback(() => {
    onDelete(recipe.id);
  }, [onDelete, recipe.id]);

  const handleLoad = useCallback(() => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 rounded-md bg-${theme.surfaceTertiary} p-3 transition-colors duration-150 hover:bg-${theme.surfaceHover}`}
        leftContent={
          <>
            <Tooltip content={recipe.name} position="top">
              <p className={`truncate text-sm font-medium text-${theme.contentPrimary} cursor-default`}>{recipe.name}</p>
            </Tooltip>
            <p className={`text-xs text-${theme.contentTertiary}`}>
              Last Updated: {formatTimestamp(recipe.updatedAt)} ({recipe.ingredients.length} steps)
            </p>
          </>
        }
        leftClasses="grow min-w-0 mr-2"
        rightContent={
          <>
            <TooltipButton
              aria-label={`Load the recipe: ${recipe.name}`}
              icon={<UploadCloudIcon size={18} />}
              size="sm"
              tooltipContent="Load Recipe"
              tooltipPosition="left"
              variant="primary"
              onClick={handleLoad}
            >
              Load
            </TooltipButton>
            <ConfirmButton actionName="Delete" itemName={recipe.name} itemType="Recipe" tooltipPosition="left" onConfirm={handleConfirmDelete} />
          </>
        }
        rightClasses="flex shrink-0 items-center space-x-2"
      />
    </li>
  );
});
