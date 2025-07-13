import { memo, useCallback } from 'react';

import { errorHandler, ingredientRegistry } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { GrabIcon, PreferencesIcon, XIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';
import { Tooltip } from '../shared/Tooltip';

import type { DragEvent, JSX, KeyboardEvent, MouseEvent } from 'react';
import type { AppTheme } from '../../app/themes';
import type { Ingredient, SpiceDefinition } from '../../core/IngredientRegistry';
import type { CookingStatusType } from '../../core/Kitchen';

interface RecipeItemProps {
  readonly status: CookingStatusType;
  readonly ingredient: Ingredient;
  readonly isAutoCook: boolean;
  readonly isDragged: boolean;
  readonly isEditing: boolean;
  readonly isSpiceInInput: boolean;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
  readonly onDragEnter: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, ingredient: Ingredient) => void;
  readonly onRemove: (id: string) => void;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, newValue: string | boolean | number, spice: SpiceDefinition) => void;
  readonly onEditToggle: (ingredient: Ingredient) => void;
}

function getStatusBorder(theme: AppTheme, status: CookingStatusType): string {
  const statusBorders: Readonly<Record<CookingStatusType, string>> = {
    idle: '',
    error: theme.dangerBorder,
    success: theme.successBorder,
    warning: theme.warningBorder,
  };
  return statusBorders[status];
}

export const RecipeItem = memo(function RecipeItem({
  ingredient,
  isEditing,
  isDragged,
  status,
  isAutoCook,
  isSpiceInInput,
  onEditToggle,
  onSpiceChange,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
}: RecipeItemProps): JSX.Element {
  const theme = useThemeStore((state) => state.theme);

  const definition = ingredientRegistry.getIngredient(ingredient.name);
  errorHandler.assert(
    definition,
    `Ingredient definition not found for name "${String(ingredient.name)}" (name: "${ingredient.name.description}").`,
    'Recipe Item Panel',
    { genericMessage: `The definition for ingredient "${ingredient.name.description}" is missing.` },
  );

  const handleDragStart = useCallback((event: DragEvent<HTMLElement>) => onDragStart(event, ingredient), [onDragStart, ingredient]);
  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => onDragEnter(event, ingredient.id), [onDragEnter, ingredient.id]);
  const handleRemove = useCallback(() => onRemove(ingredient.id), [onRemove, ingredient.id]);
  const handleEditToggle = useCallback(() => onEditToggle(ingredient), [onEditToggle, ingredient]);

  const handleSpiceChange = useCallback(
    (spiceId: string, newValue: string | boolean | number, spice: SpiceDefinition) => {
      onSpiceChange(ingredient.id, spiceId, newValue, spice);
    },
    [onSpiceChange, ingredient.id],
  );

  const hasSpices = !!definition.spices && definition.spices.length > 0;
  const isEditorVisible = isEditing && !isSpiceInInput && !isDragged;

  const handleDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (hasSpices && !isSpiceInInput) {
        event.preventDefault();
        handleEditToggle();
      }
    },
    [hasSpices, isSpiceInInput, handleEditToggle],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === 'Enter' || event.key === ' ') && hasSpices && !isSpiceInInput) {
        event.preventDefault();
        handleEditToggle();
      }
    },
    [hasSpices, isSpiceInInput, handleEditToggle],
  );

  const settingsTooltip = isSpiceInInput ? 'Options are in the Input panel' : isEditing ? 'Hide Options' : 'Edit Options';
  const ariaLabel = `Recipe Item: ${ingredient.name.description}. Status: ${isAutoCook ? status : 'Auto-Cook Disabled'}${
    isSpiceInInput ? '. Options are managed in the Input panel.' : ''
  }${isEditorVisible ? '. The options editor is expanded.' : ''}`;

  const statusBorder = isAutoCook ? getStatusBorder(theme, status) : '';
  const statusBorderClass = statusBorder ? `border-l-4 border-${statusBorder}` : '';
  const classes = [
    'group',
    'flex',
    'flex-col',
    'rounded-md',
    `bg-${theme.surfaceTertiary}`,
    'text-sm',
    'transition-all',
    'duration-200',
    'ease-in-out',
    'outline-none',
    isDragged ? `z-10 scale-[0.97] opacity-60 !bg-${theme.surfaceHover}` : 'scale-100 opacity-100',
    statusBorderClass,
    hasSpices && isEditorVisible && 'pb-1',
  ]
    .filter(Boolean)
    .join(' ');

  const grabHandleClasses = `mr-2 cursor-grab text-${theme.contentTertiary} transition-colors group-hover:text-${theme.contentSecondary}`;

  const leftColumn = (
    <>
      <Tooltip content="Drag to reorder" position="top">
        <span aria-label="Drag handle" className={grabHandleClasses} draggable={true} onDragEnd={onDragEnd} onDragStart={handleDragStart}>
          <GrabIcon size={20} />
        </span>
      </Tooltip>
      <Tooltip content={definition.name.description} position="top">
        <span className={`cursor-default truncate pr-2 font-medium text-${theme.contentPrimary}`}>{ingredient.name.description}</span>
      </Tooltip>
    </>
  );

  const rightColumn = (
    <>
      {hasSpices && (
        <TooltipButton
          aria-controls={`options-${ingredient.id}`}
          aria-expanded={isEditorVisible}
          aria-label={settingsTooltip}
          className={isEditorVisible ? '' : `text-${theme.contentTertiary} hover:text-${theme.infoFg}`}
          icon={<PreferencesIcon size={18} />}
          onClick={handleEditToggle}
          size="sm"
          tooltipContent={settingsTooltip}
          tooltipPosition="top"
          variant={isEditorVisible ? 'primary' : 'stealth'}
        />
      )}
      <TooltipButton
        aria-label={`Remove ingredient "${ingredient.name.description}" from recipe`}
        className="opacity-50 hover:!opacity-100 group-hover:opacity-100"
        icon={<XIcon size={18} />}
        onClick={handleRemove}
        size="sm"
        tooltipContent="Remove Ingredient"
        tooltipPosition="top"
        variant="danger"
      />
    </>
  );

  return (
    <div
      role="listitem"
      aria-label={ariaLabel}
      className={classes}
      onDoubleClick={handleDoubleClick}
      onDragEnter={handleDragEnter}
      onDragOver={onDragOver}
      onKeyDown={handleKeyDown}
      tabIndex={hasSpices && !isSpiceInInput ? 0 : -1}
    >
      <ItemListLayout
        className="h-12 cursor-default p-3"
        leftContent={leftColumn}
        leftClass="flex grow items-center min-w-0"
        rightContent={rightColumn}
      />
      {hasSpices && (
        <>
          {isSpiceInInput && (
            <div className={`mx-1 mb-1 rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover} py-2 text-center text-xs italic`}>
              Options are managed in the Input panel.
            </div>
          )}
          {isEditorVisible && (
            <div
              id={`options-${ingredient.id}`}
              className="recipe-item-spices-enter-active"
              onDoubleClick={(event: MouseEvent<HTMLDivElement>): void => event.stopPropagation()}
            >
              <div className="max-h-96 overflow-y-auto px-1">
                <div className={`rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover} p-3`}>
                  <SpiceLayout currentSpices={ingredient.spices} ingredientDefinition={definition} onSpiceChange={handleSpiceChange} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
