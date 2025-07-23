import { memo, useCallback } from 'react';

import { errorHandler, ingredientRegistry } from '../../app/container';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { GrabIcon, PreferencesIcon, XIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';
import { Tooltip } from '../shared/Tooltip';

import type { DragEvent, JSX } from 'react';
import type { AppTheme } from '../../app/themes';
import type { IngredientItem, SpiceDefinition, SpiceValue } from '../../core/IngredientRegistry';
import type { CookingStatusType } from '../../core/Kitchen';

interface RecipeItemProps {
  readonly ingredientItem: IngredientItem;
  readonly isAutoCook: boolean;
  readonly isDragged: boolean;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
  readonly onDragEnter: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, ingredient: IngredientItem) => void;
  readonly onRemove: (id: string) => void;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, newValue: SpiceValue, spice: SpiceDefinition) => void;
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

export const RecipeItem = memo<RecipeItemProps>(
  ({ ingredientItem, isDragged, isAutoCook, onSpiceChange, onRemove, onDragStart, onDragEnter, onDragEnd, onDragOver }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const status = useKitchenStore((state) => state.ingredientStatus[ingredientItem.id] || 'idle');
    const inputPanelId = useKitchenStore((state) => state.inputPanelId);
    const editingId = useRecipeStore((state) => state.editingId);
    const setEditingId = useRecipeStore.getState().setEditingId;

    const isSpiceInInput = inputPanelId === ingredientItem.id;
    const isEditing = !isSpiceInInput && editingId === ingredientItem.id;

    const definition = ingredientRegistry.getIngredient(ingredientItem.name);
    errorHandler.assert(definition, `Ingredient definition not found for ID "${ingredientItem.name}".`);

    const handleDragStart = useCallback(
      (event: DragEvent<HTMLElement>) => {
        onDragStart(event, ingredientItem);
      },
      [onDragStart, ingredientItem],
    );

    const handleDragEnter = useCallback(
      (event: DragEvent<HTMLElement>) => {
        onDragEnter(event, ingredientItem.id);
      },
      [onDragEnter, ingredientItem.id],
    );

    const handleRemove = useCallback(() => {
      onRemove(ingredientItem.id);
    }, [onRemove, ingredientItem.id]);

    const handleEditToggle = useCallback(() => {
      if (inputPanelId === ingredientItem.id) {
        setEditingId(null);
        return;
      }

      const currentId = useRecipeStore.getState().editingId;
      setEditingId(currentId === ingredientItem.id ? null : ingredientItem.id);
    }, [inputPanelId, ingredientItem.id, setEditingId]);

    const handleSpiceChange = useCallback(
      (spiceId: string, newValue: SpiceValue, spice: SpiceDefinition) => {
        onSpiceChange(ingredientItem.id, spiceId, newValue, spice);
      },
      [onSpiceChange, ingredientItem.id],
    );

    const hasSpices = !!definition.spices && definition.spices.length > 0;
    const canToggleEditor = hasSpices && !isSpiceInInput;

    const isEditorVisible = isEditing && !isSpiceInInput && !isDragged;
    const settingsTooltip = isSpiceInInput ? 'Options are in the Input panel' : isEditing ? 'Hide Options' : 'Edit Options';

    const ariaLabelParts = [
      `Recipe Item: ${definition.name}`,
      `Status: ${isAutoCook ? status : 'Auto-Cook Disabled'}`,
      isSpiceInInput ? 'Options are managed in the Input panel.' : '',
      isEditorVisible ? 'The options editor is expanded.' : '',
    ];
    const ariaLabel = ariaLabelParts.filter(Boolean).join('. ');

    const statusBorder = isAutoCook ? getStatusBorder(theme, status) : '';
    const statusBorderClass = statusBorder ? `border-l-4 border-${statusBorder}` : '';
    const itemClass = `group flex flex-col rounded-md bg-${theme.surfaceTertiary} text-sm outline-none transition-all duration-200 ease-in-out ${
      isDragged ? `z-10 scale-[0.97] opacity-60 !bg-${theme.surfaceHover}` : 'scale-100 opacity-100'
    } ${statusBorderClass} ${hasSpices && isEditorVisible ? 'pb-1' : ''}`.trim();

    const grabHandleClass = `mr-2 cursor-grab text-${theme.contentTertiary} transition-colors group-hover:text-${theme.contentSecondary}`;

    const leftColumn = (
      <>
        <Tooltip content="Drag to reorder" position="top">
          <span aria-label="Drag handle" className={grabHandleClass} draggable={true} onDragEnd={onDragEnd} onDragStart={handleDragStart}>
            <GrabIcon size={20} />
          </span>
        </Tooltip>
        <Tooltip content={definition.name} position="top">
          <span className={`truncate pr-2 font-medium text-${theme.contentPrimary} cursor-default`}>{definition.name}</span>
        </Tooltip>
      </>
    );

    const rightColumn = (
      <>
        {hasSpices && (
          <TooltipButton
            aria-controls={`options-${ingredientItem.id}`}
            aria-expanded={isEditorVisible}
            aria-label={settingsTooltip}
            className={isEditorVisible ? '' : `text-${theme.contentTertiary} hover:text-${theme.infoFg}`}
            icon={<PreferencesIcon size={18} />}
            size="sm"
            tooltipContent={settingsTooltip}
            tooltipPosition="top"
            variant={isEditorVisible ? 'primary' : 'stealth'}
            onClick={handleEditToggle}
          />
        )}
        <TooltipButton
          aria-label={`Remove ingredient "${definition.name}" from recipe`}
          className="opacity-50 group-hover:opacity-100 hover:!opacity-100"
          icon={<XIcon size={18} />}
          size="sm"
          tooltipContent="Remove Ingredient"
          tooltipPosition="top"
          variant="danger"
          onClick={handleRemove}
        />
      </>
    );

    return (
      <div
        role="listitem"
        aria-label={ariaLabel}
        className={itemClass}
        tabIndex={canToggleEditor ? 0 : -1}
        onDoubleClick={(event) => {
          if (canToggleEditor) {
            event.preventDefault();
            handleEditToggle();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={onDragOver}
        onKeyUp={(event) => {
          event.preventDefault();
          setEditingId(ingredientItem.id);
        }}
        onKeyDown={(event) => {
          event.preventDefault();
          setEditingId(null);
        }}
      >
        <ItemListLayout
          className="h-12 cursor-default p-3"
          leftContent={leftColumn}
          leftClasses="flex grow items-center min-w-0"
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
                id={`options-${ingredientItem.id}`}
                className="recipe-item-spices-enter-active"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <div className="max-h-96 overflow-y-auto px-1">
                  <div className={`rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover} p-3`}>
                    <SpiceLayout currentSpices={ingredientItem.spices} ingredient={definition} onSpiceChange={handleSpiceChange} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);
