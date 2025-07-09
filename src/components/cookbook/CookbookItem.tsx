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

  const onDeleteClick = useCallback(() => {
    if (isDeleting) {
      onDelete(recipe.id);
    } else {
      setDeleting(true);
    }
  }, [isDeleting, onDelete, recipe.id]);

  const onLoadClick = useCallback(() => {
    onLoad(recipe.id);
  }, [onLoad, recipe.id]);

  const deleteButtonTip = isDeleting ? 'Confirm Deletion' : 'Delete Recipe';
  const deleteButtonLabel = isDeleting ? `Confirm deletion of ${recipe.name}` : `Delete the recipe: ${recipe.name}`;
  const deleteButtonClasses = isDeleting ? getConfirmClasses(theme) : undefined;

  const leftColumn = (
    <>
      <Tooltip content={recipe.name} position="top">
        <p className={`cursor-default truncate font-medium text-md ${theme.textPrimary}`}>{recipe.name}</p>
      </Tooltip>
      <p className={`text-xs ${theme.textTertiary}`}>
        Last Updated: {formatTimestamp(recipe.updatedAt)} ({recipe.ingredients.length} steps)
      </p>
    </>
  );

  const rightColumn = (
    <>
      <TooltipButton
        aria-label={`Load the recipe: ${recipe.name}`}
        icon={<UploadCloudIcon size={18} />}
        onClick={onLoadClick}
        size="sm"
        tooltipContent="Load Recipe"
        tooltipPosition="left"
        variant="primary"
      >
        Load
      </TooltipButton>
      <TooltipButton
        aria-label={deleteButtonLabel}
        className={deleteButtonClasses}
        icon={isDeleting ? <AlertTriangleIcon className={theme.errorText} size={18} /> : <Trash2Icon size={18} />}
        onClick={onDeleteClick}
        size="sm"
        tooltipContent={deleteButtonTip}
        tooltipPosition="left"
        variant="danger"
      />
    </>
  );

  return (
    <li className="list-none">
      <ItemListLayout
        className={`flex h-11 items-center justify-between rounded-md p-3 transition-colors duration-150 ${theme.itemBg} ${theme.itemBgHover}`}
        leftContent={leftColumn}
        leftWrapperClassName="min-w-0 flex-grow mr-2"
        rightContent={rightColumn}
        rightWrapperClassName="flex flex-shrink-0 items-center space-x-2"
      />
    </li>
  );
});
