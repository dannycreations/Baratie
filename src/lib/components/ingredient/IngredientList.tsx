import { memo, useCallback, useState } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { ChevronRightIcon } from '../shared/Icon';
import { ItemListLayout } from '../shared/layout/ItemListLayout';
import { Tooltip } from '../shared/Tooltip';
import { EmptyView } from '../shared/View';

import type { DragEvent, JSX, ReactNode } from 'react';
import type { IngredientProps } from '../../core/IngredientRegistry';

export interface IngredientListProps<T extends IngredientProps> {
  readonly emptyMessage?: string;
  readonly itemsByCategory: ReadonlyArray<readonly [string, ReadonlyArray<T>]>;
  readonly noResultsMessage?: (query: string) => string;
  readonly query: string;
  readonly renderHeader?: (category: string) => JSX.Element;
  readonly renderItemActions?: (item: T) => ReactNode;
  readonly renderItemPrefix?: (item: T) => ReactNode;
  readonly onItemDragStart?: (event: DragEvent<HTMLElement>, item: T) => void;
  readonly isItemDisabled?: (item: T) => boolean;
}

export const IngredientList = memo(
  <T extends IngredientProps>({
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
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const theme = useThemeStore((state) => state.theme);

    const handleCategoryToggle = useCallback((category: string) => {
      setExpandedCategory((current) => (current === category ? null : category));
    }, []);

    if (itemsByCategory.length === 0) {
      return (
        <EmptyView className="flex grow flex-col items-center justify-center py-4">{query.trim() ? noResultsMessage(query) : emptyMessage}</EmptyView>
      );
    }

    const renderListItem = useCallback(
      (item: T): JSX.Element => {
        const isDisabled = isItemDisabled?.(item) ?? false;
        const nameClass = `truncate pr-2 text-sm transition-colors duration-150 cursor-default ${
          isDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`
        } group-hover:text-${theme.infoFg}`;

        const leftColumn = (
          <div className="flex min-w-0 items-center gap-3">
            {renderItemPrefix?.(item)}
            <Tooltip content={item.description} position="top" tooltipClasses="max-w-xs">
              <span className={nameClass}>{item.name}</span>
            </Tooltip>
          </div>
        );

        const rightColumn = renderItemActions?.(item);

        const handleDragStart = (event: DragEvent<HTMLElement>) => {
          onItemDragStart?.(event, item);
        };

        return (
          <li key={item.id} data-ingredient-id={item.id} draggable={!!onItemDragStart} onDragStart={handleDragStart}>
            <ItemListLayout
              className={`group h-11 rounded-md bg-${theme.surfaceTertiary} px-2 py-1.5 transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
              leftContent={leftColumn}
              leftClasses="grow min-w-0"
              rightContent={rightColumn}
            />
          </li>
        );
      },
      [theme, isItemDisabled, renderItemPrefix, renderItemActions, onItemDragStart],
    );

    return (
      <>
        {itemsByCategory.map(([category, items], index) => {
          const isExpanded = !!query.trim() || expandedCategory === category;
          const categoryId = `category-panel-${category.replace(/\s+/g, '-').toLowerCase()}`;
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
              {renderHeader ? renderHeader(category) : <span className="font-medium">{category}</span>}
              <ChevronRightIcon
                aria-hidden="true"
                className={`transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                size={20}
              />
            </button>
          );

          const containerClass = `overflow-hidden rounded-md ${!isExpanded && index < itemsByCategory.length - 1 ? 'mb-2' : ''}`.trim();

          return (
            <div key={category} className={containerClass}>
              {header}
              {isExpanded && (
                <div
                  id={panelId}
                  role="region"
                  aria-hidden={!isExpanded}
                  aria-labelledby={buttonId}
                  className={`max-h-64 overflow-y-auto bg-${theme.surfaceMuted} p-3`}
                >
                  <ul aria-labelledby={buttonId} className="space-y-1.5">
                    {items.map(renderListItem)}
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
