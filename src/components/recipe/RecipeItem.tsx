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

interface RecipeItemUIState {
  readonly isAutoCook: boolean;
  readonly isDragged: boolean;
  readonly isEditing: boolean;
  readonly isSpiceInInput: boolean;
  readonly status: CookingStatusType;
  readonly warning: string | null;
}

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

interface RecipeItemProps {
  readonly ingredientItem: IngredientItem;
  readonly uiState: RecipeItemUIState;
  readonly handlers: RecipeItemHandlers;
}

interface MissingRecipeItemProps {
  readonly ingredientItem: IngredientItem;
  readonly onRemove: (id: string) => void;
}

interface RecipeSpiceEditorProps {
  readonly ingredient: IngredientItem;
  readonly definition: IngredientDefinition;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, newValue: SpiceValue) => void;
  readonly onLongPressEnd: () => void;
  readonly onLongPressStart: () => void;
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
          leftClasses="flex min-w-0 grow items-center"
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

interface InfoMessageProps {
  type: 'spiceInInput' | 'warning';
  message?: string;
}

const InfoMessage = memo<InfoMessageProps>(({ type, message }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  return (
    <div className={`p-2 mx-2 text-center text-xs italic rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover}`}>
      {type === 'spiceInInput' ? 'Options are managed in the Input panel.' : message}
    </div>
  );
});

const RecipeSpiceEditor = memo<RecipeSpiceEditorProps>(({ ingredient, definition, onSpiceChange, onLongPressStart, onLongPressEnd }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const handleSpiceChange = useCallback(
    (spiceId: string, newValue: SpiceValue): void => {
      onSpiceChange(ingredient.id, spiceId, newValue);
    },
    [onSpiceChange, ingredient.id],
  );

  return (
    <div className="max-h-96 p-1 overflow-y-auto">
      <div className={`p-2 rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover}`}>
        <SpiceLayout
          ingredient={definition}
          currentSpices={ingredient.spices}
          onSpiceChange={handleSpiceChange}
          onLongPressStart={onLongPressStart}
          onLongPressEnd={onLongPressEnd}
        />
      </div>
    </div>
  );
});

export const RecipeItem = memo<RecipeItemProps>(({ ingredientItem, uiState, handlers }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const definition = ingredientRegistry.getIngredient(ingredientItem.ingredientId);
  const { isAutoCook, isDragged, isEditing, isSpiceInInput, status, warning } = uiState;
  const { onRemove, onSpiceChange, onDragStart, onDragEnd, onDragOver, onDragEnter, onEditToggle, onLongPressStart, onLongPressEnd } = handlers;

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
  const hasWarning = status === 'warning' && typeof warning === 'string' && warning.length > 0;

  const ariaLabelParts = [
    `Recipe Item: ${definition.name}`,
    `Status: ${isAutoCook ? status : 'Auto-Cook Disabled'}`,
    isSpiceInInput ? 'Options are managed in the Input panel.' : '',
    isEditorVisible ? 'The options editor is expanded.' : '',
    hasWarning ? `Warning: ${warning}` : '',
  ];
  const ariaLabel = ariaLabelParts.filter(Boolean).join('. ');

  const statusBorder = isAutoCook ? getStatusBorder(theme, status) : '';
  const statusBorderClass = statusBorder ? `border-l-4 border-${statusBorder}` : '';
  const itemClass =
    `group flex flex-col rounded-md bg-${theme.surfaceTertiary} text-sm outline-none transition-all duration-200 ease-in-out ${isDragged ? `z-10 scale-[0.97] opacity-60 !bg-${theme.surfaceHover}` : 'scale-100 opacity-100'} ${statusBorderClass} ${isSpiceInInput || hasWarning ? 'pb-2' : ''}`.trim();
  const grabHandleClass = `mr-2 text-${theme.contentTertiary} cursor-grab transition-colors group-hover:text-${theme.contentSecondary}`;
  const buttonId = `edit-button-${ingredientItem.id}`;
  const optionsId = `options-${ingredientItem.id}`;

  const leftColumn = (
    <>
      <Tooltip content="Drag to reorder" position="top">
        <span
          className={grabHandleClass}
          aria-label="Drag handle"
          aria-roledescription="draggable item"
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
        >
          <GrabIcon size={20} />
        </span>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <Tooltip content={definition.description} position="top" className="inline-block max-w-full">
          <p className={`truncate pr-2 font-medium text-${theme.contentPrimary} cursor-default`}>{definition.name}</p>
        </Tooltip>
      </div>
    </>
  );

  const rightColumn = (
    <>
      {hasSpices && (
        <TooltipButton
          id={buttonId}
          icon={<PreferencesIcon size={18} />}
          size="sm"
          variant={isEditorVisible ? 'primary' : 'stealth'}
          className={isEditorVisible ? '' : `text-${theme.contentTertiary} hover:text-${theme.infoFg}`}
          aria-controls={optionsId}
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
        className="opacity-50 group-hover:opacity-100"
        aria-label={`Remove ingredient "${definition.name}" from recipe`}
        tooltipContent="Remove Ingredient"
        tooltipPosition="top"
        onClick={() => onRemove(ingredientItem.id)}
      />
    </>
  );

  return (
    <div
      className={itemClass}
      role="listitem"
      tabIndex={canToggleEditor ? 0 : -1}
      aria-label={ariaLabel}
      onDragEnter={handleDragEnter}
      onDragOver={onDragOver}
    >
      <ItemListLayout
        className="h-12 p-2 cursor-default"
        leftClasses="flex grow items-center min-w-0"
        leftContent={leftColumn}
        rightContent={rightColumn}
      />
      {hasWarning && <InfoMessage type="warning" message={warning} />}
      {hasSpices && (
        <>
          {!hasWarning && isSpiceInInput && <InfoMessage type="spiceInInput" />}
          <div
            id={optionsId}
            role="region"
            aria-labelledby={buttonId}
            aria-hidden={!isEditorVisible}
            className={`accordion-grid ${isEditorVisible ? 'expanded' : ''}`}
          >
            <div className="accordion-content">
              <RecipeSpiceEditor
                ingredient={ingredientItem}
                definition={definition}
                onSpiceChange={onSpiceChange}
                onLongPressStart={onLongPressStart}
                onLongPressEnd={onLongPressEnd}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
});
