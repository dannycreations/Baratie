import { clsx } from 'clsx';
import { memo, useCallback } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { ingredientRegistry } from '../../app/container';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, GrabIcon, PauseIcon, PlayIcon, PreferencesIcon, XIcon } from '../shared/Icon';
import { SpiceLayout } from '../shared/layout/SpiceLayout';
import { Tooltip } from '../shared/Tooltip';

import type { DragEvent, JSX, ReactNode } from 'react';
import type { AppTheme } from '../../app/themes';
import type { IngredientDefinition, IngredientItem, SpiceValue } from '../../core/IngredientRegistry';
import type { CookingStatusType } from '../../core/Kitchen';

export interface RecipeItemHandlers {
  readonly onDragStart: (event: DragEvent<HTMLElement>, ingredient: IngredientItem) => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>, targetItemId: string) => void;
  readonly onDragEnd: (event: DragEvent<HTMLElement>) => void;
}

export interface RecipeItemProps {
  readonly ingredientItem: IngredientItem;
  readonly handlers: RecipeItemHandlers;
}

interface RecipeItemActionsProps {
  readonly isPaused: boolean;
  readonly hasSpices: boolean;
  readonly isEditorVisible: boolean;
  readonly settingsTooltip: string;
  readonly onTogglePause: () => void;
  readonly onEditToggle: () => void;
  readonly onRemove: () => void;
}

const STATUS_BORDER_MAP: Readonly<Record<CookingStatusType, (theme: AppTheme) => string>> = {
  error: (theme) => theme.dangerBorder,
  success: (theme) => theme.successBorder,
  warning: (theme) => theme.warningBorder,
  idle: () => '',
} as const;

const RecipeItemActions = memo<RecipeItemActionsProps>(
  ({ isPaused, hasSpices, isEditorVisible, settingsTooltip, onTogglePause, onEditToggle, onRemove }): JSX.Element => {
    const theme = useThemeStore((state) => state.theme);

    return (
      <>
        <TooltipButton
          icon={isPaused ? <PlayIcon size={ICON_SIZES.SM} /> : <PauseIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          className={clsx(
            'opacity-50 group-hover:opacity-100',
            isPaused ? `text-${theme.successFg} hover:!bg-${theme.successBg}` : `text-${theme.warningFg} hover:!bg-${theme.warningBg}`,
          )}
          tooltipContent={isPaused ? 'Resume' : 'Pause'}
          tooltipPosition="top"
          onClick={onTogglePause}
        />
        {hasSpices && (
          <TooltipButton
            icon={<PreferencesIcon size={ICON_SIZES.SM} />}
            size="sm"
            variant={isEditorVisible ? 'primary' : 'stealth'}
            className={!isEditorVisible ? clsx(`text-${theme.contentTertiary}`, `hover:text-${theme.infoFg}`) : undefined}
            tooltipContent={settingsTooltip}
            tooltipPosition="top"
            onClick={onEditToggle}
          />
        )}
        <TooltipButton
          icon={<XIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="danger"
          className="opacity-50 group-hover:opacity-100"
          tooltipContent="Remove Ingredient"
          tooltipPosition="top"
          onClick={onRemove}
        />
      </>
    );
  },
);

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

const MissingRecipeItem = memo<MissingRecipeItemProps>(({ ingredientItem, onRemove }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const handleRemove = useCallback((): void => {
    onRemove(ingredientItem.id);
  }, [onRemove, ingredientItem.id]);

  return (
    <li className={clsx('group flex flex-col rounded-md text-sm outline-none', `bg-${theme.dangerBg}`)}>
      <div className="p-2">
        <div className="flex w-full items-center justify-between">
          <div className="flex min-w-0 grow items-center">
            <div className="flex items-center gap-1">
              <AlertTriangleIcon className={clsx(`text-${theme.dangerFg}`)} size={ICON_SIZES.MD} />
              <h3 className={clsx('truncate pr-2 font-medium', `text-${theme.dangerFg}`)}>{ingredientItem.name} (Missing)</h3>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <TooltipButton
              icon={<XIcon size={ICON_SIZES.SM} />}
              size="sm"
              variant="danger"
              tooltipContent="Remove Missing Ingredient"
              tooltipPosition="top"
              onClick={handleRemove}
            />
          </div>
        </div>
        <p className={clsx('mt-1 text-xs', `text-${theme.dangerFg}`)}>
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
    <p className={clsx('p-2 text-center text-xs italic rounded-md border', `border-${theme.borderSecondary}`, `bg-${theme.surfaceHover}`)}>
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
      <div className={clsx('p-2 rounded-md border', `border-${theme.borderSecondary}`, `bg-${theme.surfaceHover}`)}>
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

export const RecipeItem = memo<RecipeItemProps>(({ ingredientItem, handlers }): JSX.Element => {
  const theme = useThemeStore((state) => state.theme);
  const { onDragStart, onDragEnd, onDragOver } = handlers;

  const isAutoCook = useKitchenStore((state) => state.isAutoCookEnabled);
  const status = useKitchenStore((state) => state.ingredientStatuses[ingredientItem.id] || 'idle');
  const warning = useKitchenStore((state) => state.ingredientWarnings[ingredientItem.id] || null);
  const isSpiceInInput = useKitchenStore((state) => state.inputPanelId === ingredientItem.id);
  const startUpdateBatch = useKitchenStore((state) => state.startUpdateBatch);
  const endUpdateBatch = useKitchenStore((state) => state.endUpdateBatch);

  const isDragged = useDragMoveStore((state) => state.draggedItemId === ingredientItem.id);

  const isEditing = useRecipeStore((state) => state.editingIds.has(ingredientItem.id));
  const isPaused = useRecipeStore((state) => state.pausedIngredientIds.has(ingredientItem.id));
  const removeIngredient = useRecipeStore((state) => state.removeIngredient);
  const updateSpice = useRecipeStore((state) => state.updateSpice);
  const toggleEditingId = useRecipeStore((state) => state.toggleEditingId);
  const toggleIngredientPause = useRecipeStore((state) => state.toggleIngredientPause);

  const definition = ingredientRegistry.get(ingredientItem.ingredientId);
  const handleRemove = useCallback(() => removeIngredient(ingredientItem.id), [ingredientItem.id, removeIngredient]);

  if (!definition) {
    return <MissingRecipeItem ingredientItem={ingredientItem} onRemove={handleRemove} />;
  }

  const handleEditToggleCallback = useCallback(() => {
    if (!isSpiceInInput) {
      toggleEditingId(ingredientItem.id);
    }
  }, [isSpiceInInput, toggleEditingId, ingredientItem.id]);

  const handleTogglePauseCallback = useCallback(() => toggleIngredientPause(ingredientItem.id), [ingredientItem.id, toggleIngredientPause]);
  const handleDragStart = useCallback((event: DragEvent<HTMLElement>) => onDragStart(event, ingredientItem), [onDragStart, ingredientItem]);
  const handleDragEnd = useCallback((event: DragEvent<HTMLElement>) => onDragEnd(event), [onDragEnd]);
  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => onDragOver(event, ingredientItem.id), [onDragOver, ingredientItem.id]);

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

  const statusBorder = isAutoCook ? (STATUS_BORDER_MAP[status] ?? STATUS_BORDER_MAP.idle)(theme) : '';
  const statusBorderClass = statusBorder ? `border-l-4 border-${statusBorder}` : '';
  const itemClass = clsx(
    'group flex flex-col rounded-md text-sm outline-none transition-all duration-200 ease-in-out',
    `bg-${theme.surfaceTertiary}`,
    isDragged ? `z-10 scale-[0.97] opacity-60 !bg-${theme.surfaceHover}` : 'scale-100 opacity-100',
    statusBorderClass,
  );

  const grabHandleClass = clsx(`mr-2 cursor-grab transition-colors group-hover:text-${theme.contentSecondary}`, `text-${theme.contentTertiary}`);

  const leftColumn = (
    <>
      <Tooltip content="Drag to reorder" position="top">
        <span className={grabHandleClass} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <GrabIcon size={ICON_SIZES.MD} />
        </span>
      </Tooltip>
      <div className="min-w-0 flex-1">
        <Tooltip content={definition.description} position="top" className="inline-block max-w-full">
          <h3 className={clsx('block truncate pr-2 font-medium cursor-default outline-none', `text-${theme.contentPrimary}`)}>{definition.name}</h3>
        </Tooltip>
      </div>
    </>
  );

  const rightColumn = (
    <RecipeItemActions
      isPaused={isPaused}
      hasSpices={hasSpices}
      isEditorVisible={isEditorVisible}
      settingsTooltip={settingsTooltip}
      onTogglePause={handleTogglePauseCallback}
      onEditToggle={handleEditToggleCallback}
      onRemove={handleRemove}
    />
  );

  return (
    <li className={itemClass} onDragOver={handleDragOver}>
      <div className="flex w-full items-center justify-between h-12 p-2 cursor-default">
        <div className="flex grow items-center min-w-0">{leftColumn}</div>
        <div className="flex shrink-0 items-center gap-1">{rightColumn}</div>
      </div>

      {infoContent && <div className="p-2 pt-0">{infoContent}</div>}

      {hasSpices && (
        <div className={clsx('accordion-grid', isEditorVisible && 'expanded')}>
          <div className="accordion-content">
            <RecipeSpiceEditor
              ingredient={ingredientItem}
              definition={definition}
              onSpiceChange={updateSpice}
              onLongPressStart={startUpdateBatch}
              onLongPressEnd={endUpdateBatch}
            />
          </div>
        </div>
      )}
    </li>
  );
});
