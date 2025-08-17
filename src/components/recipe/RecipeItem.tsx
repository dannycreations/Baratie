import { memo, useCallback, useMemo } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { ingredientRegistry } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, GrabIcon, PauseIcon, PlayIcon, PreferencesIcon, XIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ListLayout';
import { SpiceLayout } from '../shared/layout/SpiceLayout';
import { Tooltip } from '../shared/Tooltip';

import type { DragEvent, JSX, ReactNode } from 'react';
import type { AppTheme } from '../../app/themes';
import type { IngredientDefinition, IngredientItem, SpiceValue } from '../../core/IngredientRegistry';
import type { CookingStatusType } from '../../core/Kitchen';

export interface RecipeItemHandlers {
  readonly onRemove: (id: string) => void;
  readonly onSpiceChange: (ingredientId: string, spiceId: string, newValue: SpiceValue) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, ingredient: IngredientItem) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
  readonly onEditToggle: (id: string) => void;
  readonly onLongPressStart: () => void;
  readonly onLongPressEnd: () => void;
  readonly onTogglePause: (id: string) => void;
}

export interface RecipeItemProps {
  readonly ingredientItem: IngredientItem;
  readonly handlers: RecipeItemHandlers;
  readonly isAutoCook: boolean;
  readonly isDragged: boolean;
  readonly isEditing: boolean;
  readonly isPaused: boolean;
  readonly isSpiceInInput: boolean;
  readonly status: CookingStatusType;
  readonly warning: string | null;
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
  switch (status) {
    case 'error':
      return theme.dangerBorder;
    case 'success':
      return theme.successBorder;
    case 'warning':
      return theme.warningBorder;
    case 'idle':
    default:
      return '';
  }
}

const MissingRecipeItem = memo<MissingRecipeItemProps>(({ ingredientItem, onRemove }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const handleRemove = useCallback((): void => {
    onRemove(ingredientItem.id);
  }, [onRemove, ingredientItem.id]);

  return (
    <li className={`group flex flex-col rounded-md bg-${theme.dangerBg} text-sm outline-none`}>
      <div className="p-2">
        <ItemListLayout
          leftClasses="flex min-w-0 grow items-center"
          leftContent={
            <div className="flex items-center gap-1">
              <AlertTriangleIcon className={`text-${theme.dangerFg}`} size={ICON_SIZES.MD} />
              <h3 className={`truncate pr-2 font-medium text-${theme.dangerFg}`}>{ingredientItem.name} (Missing)</h3>
            </div>
          }
          rightContent={
            <TooltipButton
              icon={<XIcon size={ICON_SIZES.SM} />}
              size="sm"
              variant="danger"
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
    </li>
  );
});

interface InfoMessageProps {
  type: 'spiceInInput' | 'warning';
  message?: string;
}

const InfoMessage = memo<InfoMessageProps>(({ type, message }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  return (
    <p className={`p-2 text-center text-xs italic rounded-md border border-${theme.borderSecondary} bg-${theme.surfaceHover}`}>
      {type === 'spiceInInput' ? 'Options are managed in the Input panel.' : message}
    </p>
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

export const RecipeItem = memo<RecipeItemProps>(
  ({ ingredientItem, handlers, isAutoCook, isDragged, isEditing, isPaused, isSpiceInInput, status, warning }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);
    const definition = ingredientRegistry.get(ingredientItem.ingredientId);
    const { onRemove, onSpiceChange, onDragStart, onDragEnd, onDragOver, onEditToggle, onLongPressStart, onLongPressEnd, onTogglePause } = handlers;

    if (!definition) {
      return <MissingRecipeItem ingredientItem={ingredientItem} onRemove={onRemove} />;
    }

    const handleEditToggleCallback = useCallback(() => {
      onEditToggle(ingredientItem.id);
    }, [onEditToggle, ingredientItem.id]);

    const handleTogglePauseCallback = useCallback(() => {
      onTogglePause(ingredientItem.id);
    }, [onTogglePause, ingredientItem.id]);

    const handleDragStart = useCallback(
      (event: DragEvent<HTMLElement>): void => {
        onDragStart(event, ingredientItem);
      },
      [onDragStart, ingredientItem],
    );

    const handleDragEnd = useCallback(
      (event: DragEvent<HTMLElement>): void => {
        onDragEnd(event);
      },
      [onDragEnd],
    );

    const handleDragOver = useCallback(
      (event: DragEvent<HTMLElement>): void => {
        onDragOver(event, ingredientItem.id);
      },
      [onDragOver, ingredientItem.id],
    );

    const handleRemoveCallback = useCallback(() => {
      onRemove(ingredientItem.id);
    }, [onRemove, ingredientItem.id]);

    const hasSpices = !!definition.spices && definition.spices.length > 0;
    const isEditorVisible = isEditing && !isSpiceInInput && !isDragged;
    const settingsTooltip = isSpiceInInput ? 'Options are in the Input panel' : isEditing ? 'Hide Options' : 'Edit Options';
    const hasWarning = status === 'warning' && typeof warning === 'string' && warning.length > 0;

    let infoContent: ReactNode = null;
    if (hasWarning) {
      infoContent = <InfoMessage type="warning" message={warning} />;
    } else if (hasSpices && isSpiceInInput) {
      infoContent = <InfoMessage type="spiceInInput" />;
    }

    const itemClass = useMemo(() => {
      const statusBorder = isAutoCook ? getStatusBorder(theme, status) : '';
      const statusBorderClass = statusBorder ? `border-l-4 border-${statusBorder}` : '';

      return `group flex flex-col rounded-md bg-${theme.surfaceTertiary} text-sm outline-none transition-all duration-200 ease-in-out ${
        isDragged ? `z-10 scale-[0.97] opacity-60 !bg-${theme.surfaceHover}` : 'scale-100 opacity-100'
      } ${statusBorderClass}`.trim();
    }, [isAutoCook, isDragged, status, theme]);

    const grabHandleClass = `mr-2 text-${theme.contentTertiary} cursor-grab transition-colors group-hover:text-${theme.contentSecondary}`;

    const leftColumn = useMemo(
      () => (
        <>
          <Tooltip content="Drag to reorder" position="top">
            <span className={grabHandleClass} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <GrabIcon size={ICON_SIZES.MD} />
            </span>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <Tooltip content={definition.description} position="top" className="inline-block max-w-full">
              <h3 className={`block truncate pr-2 font-medium text-${theme.contentPrimary} cursor-default outline-none`}>{definition.name}</h3>
            </Tooltip>
          </div>
        </>
      ),
      [grabHandleClass, handleDragStart, handleDragEnd, definition, theme],
    );

    const rightColumn = useMemo(
      () => (
        <>
          <TooltipButton
            icon={isPaused ? <PlayIcon size={ICON_SIZES.SM} /> : <PauseIcon size={ICON_SIZES.SM} />}
            size="sm"
            variant="stealth"
            className={`opacity-50 group-hover:opacity-100 ${isPaused ? `text-${theme.successFg} hover:!bg-${theme.successBg}` : `text-${theme.warningFg} hover:!bg-${theme.warningBg}`}`}
            tooltipContent={isPaused ? 'Resume' : 'Pause'}
            tooltipPosition="top"
            onClick={handleTogglePauseCallback}
          />
          {hasSpices && (
            <TooltipButton
              icon={<PreferencesIcon size={ICON_SIZES.SM} />}
              size="sm"
              variant={isEditorVisible ? 'primary' : 'stealth'}
              className={isEditorVisible ? '' : `text-${theme.contentTertiary} hover:text-${theme.infoFg}`}
              tooltipContent={settingsTooltip}
              tooltipPosition="top"
              onClick={handleEditToggleCallback}
            />
          )}
          <TooltipButton
            icon={<XIcon size={ICON_SIZES.SM} />}
            size="sm"
            variant="danger"
            className="opacity-50 group-hover:opacity-100"
            tooltipContent="Remove Ingredient"
            tooltipPosition="top"
            onClick={handleRemoveCallback}
          />
        </>
      ),
      [isPaused, theme, handleTogglePauseCallback, hasSpices, isEditorVisible, settingsTooltip, handleEditToggleCallback, handleRemoveCallback],
    );

    return (
      <li className={itemClass} onDragOver={handleDragOver}>
        <ItemListLayout
          className="h-12 p-2 cursor-default"
          leftClasses="flex grow items-center min-w-0"
          leftContent={leftColumn}
          rightContent={rightColumn}
        />

        {infoContent && <div className="p-2 pt-0">{infoContent}</div>}

        {hasSpices && (
          <div className={`accordion-grid ${isEditorVisible ? 'expanded' : ''}`}>
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
        )}
      </li>
    );
  },
);
