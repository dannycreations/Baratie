import { memo, useCallback, useMemo } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { useThemeStore } from '../../stores/useThemeStore';
import { ConfirmButton, TooltipButton } from '../shared/Button';
import { HighlightText } from '../shared/HighlightText';
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
  const theme = useThemeStore((state) => state.theme);

  const handleConfirmDelete = useCallback((): void => {
    onDelete(recipe.id);
  }, [onDelete, recipe.id]);

  const handleLoad = useCallback((): void => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  const formattedTimestamp = useMemo(() => timestampFormatter.format(recipe.updatedAt), [recipe.updatedAt]);

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-16 p-2 rounded-md bg-${theme.surfaceTertiary} transition-colors duration-150 hover:bg-${theme.surfaceHover}`}
        leftClasses="grow min-w-0 mr-2"
        leftContent={
          <>
            <h3 className={`block truncate font-medium text-sm text-${theme.contentPrimary} cursor-default outline-none`}>
              <HighlightText text={recipe.name} highlight={query} />
            </h3>
            <p className={`text-xs text-${theme.contentTertiary}`}>
              Last Updated: {formattedTimestamp} ({recipe.ingredients.length} steps)
            </p>
          </>
        }
        rightContent={
          <>
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
          </>
        }
      />
    </li>
  );
});
