import { memo, useCallback } from 'react';

import { ingredientRegistry } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, GrabIcon, PreferencesIcon, XIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ListLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';
import { Tooltip } from '../shared/Tooltip';

import type { DragEvent, JSX } from 'react';
import type { AppTheme } from '../../app/themes';
import type { IngredientDefinition, IngredientItem, SpiceValue } from '../../core/IngredientRegistry';
import type { CookingStatusType } from '../../core/Kitchen';

export interface RecipeItemHandlers {
  readonly onRemove: (id: string) => void;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, newValue: SpiceValue) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, ingredient: IngredientItem) => void;
  readonly onDragEnter: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onEditToggle: (id: string) => void;
  readonly onLongPressStart: () => void;
  readonly onLongPressEnd: () => void;
}

interface RecipeItemProps extends RecipeItemHandlers {
  readonly ingredientItem: IngredientItem;
  readonly isAutoCook: boolean;
  readonly isDragged: boolean;
  readonly isEditing: boolean;
  readonly isSpiceInInput: boolean;
  readonly status: CookingStatusType;
}

interface MissingRecipeItemProps {
  readonly ingredientItem: IngredientItem;
  readonly onRemove: (id: string) => void;
}

const MissingRecipeItem = memo<MissingRecipeItemProps>(({ ingredientItem, onRemove }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const handleRemove = useCallback((): void => {
    onRemove(ingredientItem.id);
  }, [onRemove, ingredientItem.id]);

  return (
    <div
      className={`group flex flex-col rounded-md bg-${theme.dangerBg} text-sm outline-none`}
      role="listitem"
      aria-label={`Error: Ingredient ${ingredientItem.name} not found.`}
    >
      <div className="p-2">
        <ItemListLayout
          leftClasses="flex grow items-center min-w-0"
          leftContent={
            <div className="flex items-center gap-1">
              <AlertTriangleIcon aria-hidden="true" className={`text-${theme.dangerFg}`} size={20} />
              <span className={`truncate pr-2 font-medium text-${theme.dangerFg}`}>{ingredientItem.name} (Missing)</span>
            </div>
          }
          rightContent={
            <TooltipButton
              icon={<XIcon size={18} />}
              size="sm"
              variant="danger"
              aria-label={`Remove missing ingredient "${ingredientItem.name}" from recipe`}
              tooltipContent="Remove Missing Ingredient"
              tooltipPosition="top"
              onClick={handleRemove}
            />
          }
        />
        <p className={`mt-1 text-xs text-${theme.dangerFg}`}>
          This ingredient could not be found. It may be from a disabled or uninstalled extension.
        </p>
      </div>
    </div>
  );
});

const SpiceInInputMessage = memo((): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  return (
    <div className={`mx-2 rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover} p-2 text-center text-xs italic`}>
      Options are managed in the Input panel.
    </div>
  );
});

interface RecipeItemSpiceEditorProps {
  readonly ingredient: IngredientItem;
  readonly definition: IngredientDefinition;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, newValue: SpiceValue) => void;
  readonly onLongPressEnd: () => void;
  readonly onLongPressStart: () => void;
}

const RecipeItemSpiceEditor = memo<RecipeItemSpiceEditorProps>(
  ({ ingredient, definition, onSpiceChange, onLongPressStart, onLongPressEnd }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const handleSpiceChange = useCallback(
      (spiceId: string, newValue: SpiceValue): void => {
        onSpiceChange(ingredient.id, spiceId, newValue);
      },
      [onSpiceChange, ingredient.id],
    );

    return (
      <div
        id={`options-${ingredient.id}`}
        className="section-expand-enter-active"
        onDoubleClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="max-h-96 overflow-y-auto p-1">
          <div className={`rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover} p-2`}>
            <SpiceLayout
              ingredient={definition}
              currentSpices={ingredient.spices}
              onSpiceChange={handleSpiceChange}
              onLongPressStart={onLongPressStart}
              onLongPressEnd={onLongPressEnd}
            />
          </div>
        </div>
      </div>
    );
  },
);

function getStatusBorder(theme: AppTheme, status: CookingStatusType): string {
  const statusBorders: Readonly<Record<CookingStatusType, string>> = {
    idle: '',
    error: theme.dangerBorder,
    success: theme.successBorder,
    warning: theme.warningBorder,
  };
  return statusBorders[status];
}

export const RecipeItem = memo<RecipeItemProps>(
  ({
    ingredientItem,
    isDragged,
    isAutoCook,
    onRemove,
    onSpiceChange,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragEnter,
    isEditing,
    isSpiceInInput,
    onEditToggle,
    status,
    onLongPressStart,
    onLongPressEnd,
  }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const definition = ingredientRegistry.getIngredient(ingredientItem.ingredientId);

    if (!definition) {
      return <MissingRecipeItem ingredientItem={ingredientItem} onRemove={onRemove} />;
    }

    const handleEditToggleCallback = useCallback(() => {
      onEditToggle(ingredientItem.id);
    }, [onEditToggle, ingredientItem.id]);

    const handleDragStart = useCallback(
      (event: DragEvent<HTMLElement>): void => {
        onDragStart(event, ingredientItem);
      },
      [onDragStart, ingredientItem],
    );

    const handleDragEnter = useCallback(
      (event: DragEvent<HTMLElement>): void => {
        onDragEnter(event, ingredientItem.id);
      },
      [onDragEnter, ingredientItem.id],
    );

    const hasSpices = !!definition.spices && definition.spices.length > 0;
    const canToggleEditor = hasSpices && !isSpiceInInput;
    const isEditorVisible = isEditing && !isSpiceInInput && !isDragged;
    const settingsTooltip = isSpiceInInput ? 'Options are in the Input panel' : isEditing ? 'Hide Options' : 'Edit Options';

    const ariaLabelParts = [
      `Recipe Item: ${ingredientItem.name}`,
      `Status: ${isAutoCook ? status : 'Auto-Cook Disabled'}`,
      isSpiceInInput ? 'Options are managed in the Input panel.' : '',
      isEditorVisible ? 'The options editor is expanded.' : '',
    ];
    const ariaLabel = ariaLabelParts.filter(Boolean).join('. ');

    const statusBorder = isAutoCook ? getStatusBorder(theme, status) : '';
    const statusBorderClass = statusBorder ? `border-l-4 border-${statusBorder}` : '';
    const itemClass = `
      group flex flex-col rounded-md bg-${theme.surfaceTertiary} text-sm
      outline-none transition-all duration-200 ease-in-out
      ${isDragged ? `z-10 scale-[0.97] opacity-60 !bg-${theme.surfaceHover}` : 'scale-100 opacity-100'}
      ${statusBorderClass}
      ${isSpiceInInput ? 'pb-2' : ''}
    `.trim();

    const grabHandleClass = `mr-2 cursor-grab text-${theme.contentTertiary} transition-colors group-hover:text-${theme.contentSecondary}`;

    const leftColumn = (
      <>
        <Tooltip content="Drag to reorder" position="top">
          <span
            className={grabHandleClass}
            aria-label="Drag handle"
            aria-roledescription="draggable item"
            draggable={true}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
          >
            <GrabIcon size={20} />
          </span>
        </Tooltip>
        <Tooltip content={ingredientItem.name} position="top" className="min-w-0 flex-1">
          <p className={`truncate pr-2 font-medium text-${theme.contentPrimary} cursor-default`}>{ingredientItem.name}</p>
        </Tooltip>
      </>
    );

    const rightColumn = (
      <>
        {hasSpices && (
          <TooltipButton
            icon={<PreferencesIcon size={18} />}
            size="sm"
            variant={isEditorVisible ? 'primary' : 'stealth'}
            className={isEditorVisible ? '' : `text-${theme.contentTertiary} hover:text-${theme.infoFg}`}
            aria-controls={`options-${ingredientItem.id}`}
            aria-expanded={isEditorVisible}
            aria-label={settingsTooltip}
            tooltipContent={settingsTooltip}
            tooltipPosition="top"
            onClick={handleEditToggleCallback}
          />
        )}
        <TooltipButton
          icon={<XIcon size={18} />}
          size="sm"
          variant="danger"
          className="opacity-50 group-hover:opacity-100 hover:!opacity-100"
          aria-label={`Remove ingredient "${ingredientItem.name}" from recipe`}
          tooltipContent="Remove Ingredient"
          tooltipPosition="top"
          onClick={() => onRemove(ingredientItem.id)}
        />
      </>
    );

    const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>): void => {
      if (canToggleEditor) {
        event.preventDefault();
        handleEditToggleCallback();
      }
    };

    return (
      <div
        className={itemClass}
        role="listitem"
        tabIndex={canToggleEditor ? 0 : -1}
        aria-label={ariaLabel}
        onDragEnter={handleDragEnter}
        onDragOver={onDragOver}
        onDoubleClick={handleDoubleClick}
      >
        <ItemListLayout
          className="h-12 cursor-default p-2"
          leftClasses="flex grow items-center min-w-0"
          leftContent={leftColumn}
          rightContent={rightColumn}
        />
        {hasSpices && (
          <>
            {isSpiceInInput && <SpiceInInputMessage />}
            {isEditorVisible && (
              <RecipeItemSpiceEditor
                ingredient={ingredientItem}
                definition={definition}
                onSpiceChange={onSpiceChange}
                onLongPressStart={onLongPressStart}
                onLongPressEnd={onLongPressEnd}
              />
            )}
          </>
        )}
      </div>
    );
  },
);
