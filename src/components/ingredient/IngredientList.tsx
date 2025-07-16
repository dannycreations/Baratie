import { memo, useCallback, useState } from 'react';

import { errorHandler, ingredientRegistry } from '../../app/container';
import { useThemeStore } from '../../stores/useThemeStore';
import { ChevronRightIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { Tooltip } from '../shared/Tooltip';
import { EmptyView } from '../shared/View';

import type { DragEvent, JSX, ReactNode } from 'react';
import type { IngredientDefinition } from '../../core/IngredientRegistry';

export interface IngredientListProps<T extends IngredientDefinition> {
  readonly emptyMessage?: string;
  readonly itemsByCategory: ReadonlyMap<symbol, readonly T[]>;
  readonly noResultsMessage?: (query: string) => string;
  readonly query: string;
  readonly renderHeader?: (category: symbol) => JSX.Element;
  readonly renderItemActions?: (item: T) => ReactNode;
  readonly renderItemPrefix?: (item: T) => ReactNode;
  readonly onItemDragStart?: (event: DragEvent<HTMLElement>, item: T) => void;
  readonly isItemDisabled?: (item: T) => boolean;
}

export const IngredientList = memo(
  <T extends IngredientDefinition>({
    itemsByCategory,
    query,
    renderHeader,
    emptyMessage = 'No ingredients available.',
    noResultsMessage = (term) => `No ingredients match search for "${term}".`,
    renderItemActions,
    renderItemPrefix,
    onItemDragStart,
    isItemDisabled,
  }: IngredientListProps<T>): JSX.Element => {
    const [expandedCategory, setExpandedCategory] = useState<symbol | null>(null);
    const theme = useThemeStore((state) => state.theme);

    const handleCategoryToggle = useCallback((category: symbol) => {
      setExpandedCategory((current) => (current === category ? null : category));
    }, []);

    if (itemsByCategory.size === 0) {
      return (
        <EmptyView className="flex grow flex-col items-center justify-center py-4">{query.trim() ? noResultsMessage(query) : emptyMessage}</EmptyView>
      );
    }

    const categoryEntries = Array.from(itemsByCategory.entries());

    const renderListItem = (item: T): JSX.Element => {
      const ingredientName = item.name.description ?? 'Unnamed Ingredient';
      const ingredientIdString = ingredientRegistry.getStringFromSymbol(item.name);
      errorHandler.assert(ingredientIdString, `Could not get string from symbol for ingredient: ${ingredientName}`, 'Render Ingredient');

      const isDisabled = isItemDisabled?.(item) ?? false;
      const nameClasses = `cursor-default truncate pr-2 text-sm transition-colors duration-150 ${
        isDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`
      } group-hover:text-${theme.infoFg}`;

      const leftColumn = (
        <div className="flex min-w-0 items-center gap-3">
          {renderItemPrefix?.(item)}
          <Tooltip content={item.description} position="top" tooltipClassName="max-w-xs">
            <span className={nameClasses}>{ingredientName}</span>
          </Tooltip>
        </div>
      );

      const rightColumn = renderItemActions?.(item);

      const handleDragStart = (event: DragEvent<HTMLElement>) => {
        onItemDragStart?.(event, item);
      };

      return (
        <li key={item.name.toString()} data-ingredient-id={ingredientIdString} draggable={!!onItemDragStart} onDragStart={handleDragStart}>
          <ItemListLayout
            className={`group h-11 rounded-md bg-${theme.surfaceTertiary} px-2 py-1.5 transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
            leftContent={leftColumn}
            leftClass="grow min-w-0"
            rightContent={rightColumn}
          />
        </li>
      );
    };

    return (
      <>
        {categoryEntries.map(([category, items], index) => {
          const isExpanded = !!query.trim() || expandedCategory === category;
          const categoryId = `category-panel-${(category.description || '').replace(/\s+/g, '-').toLowerCase()}`;
          const buttonId = `${categoryId}-button`;
          const panelId = `${categoryId}-content`;

          const header = (
            <button
              id={buttonId}
              aria-controls={panelId}
              aria-expanded={isExpanded}
              className={`flex h-12 w-full items-center justify-between bg-${theme.surfaceTertiary} p-3 text-left text-${theme.contentSecondary} outline-none hover:bg-${theme.surfaceHover}`}
              onClick={() => handleCategoryToggle(category)}
            >
              {renderHeader ? renderHeader(category) : <span className="font-medium">{category.description}</span>}
              <ChevronRightIcon
                aria-hidden="true"
                className={`transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                size={20}
              />
            </button>
          );

          const containerClasses = `overflow-hidden rounded-md ${!isExpanded && index < categoryEntries.length - 1 ? 'mb-2' : ''}`.trim();

          return (
            <div key={category.toString()} className={containerClasses}>
              {header}
              {isExpanded && (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`max-h-64 overflow-y-auto bg-${theme.surfaceMuted} p-3`}
                  aria-hidden={!isExpanded}
                >
                  <ul className="space-y-1.5" aria-labelledby={buttonId}>
                    {items.map((item) => renderListItem(item))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  },
);
