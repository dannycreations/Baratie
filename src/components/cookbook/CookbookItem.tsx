import { memo, useCallback, useState } from 'react';

import { CONFIRM_TIMEOUT_MS } from '../../app/constants';
import { getConfirmClasses } from '../../helpers/styleHelper';
import { useConditionalTimer } from '../../hooks/useConditionalTimer';
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

export const CookbookItem = memo(function CookbookItem({ recipe, onLoad, onDelete }: CookbookItemProps): JSX.Element {
  const [isDeleting, setDeleting] = useState(false);
  const theme = useThemeStore((state) => state.theme);

  const resetDeleting = useCallback(() => {
    setDeleting(false);
  }, []);

  useConditionalTimer({
    state: isDeleting ? 'running' : 'stopped',
    callback: resetDeleting,
    duration: CONFIRM_TIMEOUT_MS,
  });

  const handleDelete = useCallback(() => {
    if (isDeleting) {
      onDelete(recipe.id);
    } else {
      setDeleting(true);
    }
  }, [isDeleting, onDelete, recipe.id]);

  const handleLoad = useCallback(() => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  const deleteTip = isDeleting ? 'Confirm Deletion' : 'Delete Recipe';
  const deleteLabel = isDeleting ? `Confirm deletion of ${recipe.name}` : `Delete the recipe: ${recipe.name}`;
  const deleteClasses = isDeleting ? getConfirmClasses(theme) : undefined;

  const leftColumn = (
    <>
      <Tooltip content={recipe.name} position="top">
        <p className={`cursor-default truncate text-base font-medium text-${theme.contentPrimary}`}>{recipe.name}</p>
      </Tooltip>
      <p className={`text-xs text-${theme.contentTertiary}`}>
        Last Updated: {formatTimestamp(recipe.updatedAt)} ({recipe.ingredients.length} steps)
      </p>
    </>
  );

  const rightColumn = (
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
        className={deleteClasses}
        icon={isDeleting ? <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={18} /> : <Trash2Icon size={18} />}
        onClick={handleDelete}
        size="sm"
        tooltipContent={deleteTip}
        tooltipPosition="left"
        variant="danger"
      />
    </>
  );

  return (
    <li className="list-none">
      <ItemListLayout
        className={`h-11 rounded-md bg-${theme.surfaceTertiary} p-3 transition-colors duration-150 hover:bg-${theme.surfaceHover}`}
        leftContent={leftColumn}
        leftClass="grow min-w-0 mr-2"
        rightContent={rightColumn}
        rightClass="flex shrink-0 items-center space-x-2"
      />
    </li>
  );
});
