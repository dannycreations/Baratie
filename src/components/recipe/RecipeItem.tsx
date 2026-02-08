import { clsx } from 'clsx';
import { memo, useCallback } from 'react';

import { ICON_SIZES } from '../../app/constants';
import { ingredientRegistry } from '../../app/container';
import { useDragMoveStore } from '../../stores/useDragMoveStore';
import { useKitchenStore } from '../../stores/useKitchenStore';
import { useRecipeStore } from '../../stores/useRecipeStore';
import { TooltipButton } from '../shared/Button';
import { AlertTriangleIcon, GrabIcon, PauseIcon, PlayIcon, PreferencesIcon, XIcon } from '../shared/Icon';
import { SpiceLayout } from '../shared/layout/SpiceLayout';
import { Tooltip } from '../shared/Tooltip';

import type { DragEvent, JSX, ReactNode } from 'react';
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

const STATUS_BORDER_MAP: Readonly<Record<CookingStatusType, string>> = {
  error: 'status-error',
  success: 'status-success',
  warning: 'status-warning',
  idle: '',
} as const;

const RecipeItemActions = memo<RecipeItemActionsProps>(
  ({ isPaused, hasSpices, isEditorVisible, settingsTooltip, onTogglePause, onEditToggle, onRemove }): JSX.Element => {
    return (
      <>
        <TooltipButton
          icon={isPaused ? <PlayIcon size={ICON_SIZES.SM} /> : <PauseIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="stealth"
          className={clsx('list-item-group-actions', isPaused ? 'text-success-fg hover:!bg-success-bg' : 'text-warning-fg hover:!bg-warning-bg')}
          tooltipContent={isPaused ? 'Resume' : 'Pause'}
          tooltipPosition="top"
          onClick={onTogglePause}
        />
        {hasSpices && (
          <TooltipButton
            icon={<PreferencesIcon size={ICON_SIZES.SM} />}
            size="sm"
            variant={isEditorVisible ? 'primary' : 'stealth'}
            className={clsx(!isEditorVisible && 'text-content-tertiary hover:text-info-fg')}
            tooltipContent={settingsTooltip}
            tooltipPosition="top"
            onClick={onEditToggle}
          />
        )}
        <TooltipButton
          icon={<XIcon size={ICON_SIZES.SM} />}
          size="sm"
          variant="danger"
          className="list-item-group-actions"
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
  const handleRemove = useCallback((): void => {
    onRemove(ingredientItem.id);
  }, [onRemove, ingredientItem.id]);

  return (
    <li className="missing-item-container group">
      <div className="missing-item-header">
        <div className="flex min-w-0 grow items-center">
          <div className="flex items-center gap-1">
            <AlertTriangleIcon className="text-danger-fg" size={ICON_SIZES.MD} />
            <h3 className="missing-item-title">{ingredientItem.name} (Missing)</h3>
          </div>
        </div>
        <div className="list-item-actions">
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
      <p className="missing-item-text">This ingredient could not be found. It may be from a disabled or uninstalled extension.</p>
    </li>
  );
});

interface InfoMessageProps {
  type: 'spiceInInput' | 'warning';
  message?: string;
}

const InfoMessage = memo<InfoMessageProps>(({ type, message }): JSX.Element => {
  return <p className="info-message-box">{type === 'spiceInInput' ? 'Options are managed in the Input panel.' : message}</p>;
});

const RecipeSpiceEditor = memo<RecipeSpiceEditorProps>(({ ingredient, definition, onSpiceChange, onLongPressStart, onLongPressEnd }): JSX.Element => {
  const handleSpiceChange = useCallback(
    (spiceId: string, newValue: SpiceValue): void => {
      onSpiceChange(ingredient.id, spiceId, newValue);
    },
    [onSpiceChange, ingredient.id],
  );

  return (
    <div className="recipe-spice-editor-container">
      <div className="recipe-spice-editor-wrapper">
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

  const statusBorderClass = isAutoCook ? STATUS_BORDER_MAP[status] : '';
  const itemClass = clsx(
    'recipe-item group outline-none',
    isDragged ? 'z-10 scale-[0.97] opacity-60 !bg-surface-hover' : 'scale-100 opacity-100',
    statusBorderClass,
  );

  const grabHandleClass = 'recipe-item-grab-handle';

  const leftColumn = (
    <>
      <Tooltip content="Drag to reorder" position="top">
        <span className={grabHandleClass} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <GrabIcon size={ICON_SIZES.MD} />
        </span>
      </Tooltip>
      <div className="flex-1-min-0">
        <Tooltip content={definition.description} position="top" className="inline-block max-w-full">
          <h3 className="list-item-title font-medium text-content-primary">{definition.name}</h3>
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
      <div className="recipe-item-header">
        <div className="flex grow items-center min-w-0">{leftColumn}</div>
        <div className="list-item-actions">{rightColumn}</div>
      </div>

      {infoContent && <div className="recipe-item-info">{infoContent}</div>}

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
