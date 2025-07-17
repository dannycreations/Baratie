import { memo, useCallback } from 'react';

import { CONFIRM_SHOW_MS } from '../../app/constants';
import { getConfirmClasses } from '../../helpers/styleHelper';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, Trash2Icon, UploadCloudIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { Tooltip } from '../shared/Tooltip';

import type { JSX } from 'react';
import type { RecipeBookItem } from '../../core/IngredientRegistry';

interface CookbookItemProps {
  readonly recipe: RecipeBookItem;
  readonly onLoad: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const CookbookItem = memo<CookbookItemProps>(({ recipe, onLoad, onDelete }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);

  const handleConfirmDelete = useCallback(() => {
    onDelete(recipe.id);
  }, [onDelete, recipe.id]);

  const { isConfirm: isDeleting, trigger: triggerDelete } = useConfirmAction(handleConfirmDelete, CONFIRM_SHOW_MS);

  const handleLoad = useCallback(() => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  const deleteTip = isDeleting ? 'Confirm Deletion' : 'Delete Recipe';
  const deleteLabel = isDeleting ? `Confirm deletion of ${recipe.name}` : `Delete the recipe: ${recipe.name}`;
  const deleteClass = isDeleting ? getConfirmClasses(theme) : undefined;

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
              onClick={handleLoad}
              size="sm"
              tooltipContent="Load Recipe"
              tooltipPosition="left"
              variant="primary"
            >
              Load
            </TooltipButton>
            <TooltipButton
              aria-label={deleteLabel}
              className={deleteClass}
              icon={isDeleting ? <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={18} /> : <Trash2Icon size={18} />}
              onClick={triggerDelete}
              size="sm"
              tooltipContent={deleteTip}
              tooltipPosition="left"
              variant="danger"
            />
          </>
        }
        rightClasses="flex shrink-0 items-center space-x-2"
      />
    </li>
  );
});
