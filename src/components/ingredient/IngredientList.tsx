import { memo, useCallback, useState } from 'react';

import { useThemeStore } from '../../stores/useThemeStore';
import { ChevronRightIcon } from '../shared/Icon';
import { EmptyView } from '../shared/View';

import type { JSX } from 'react';
import type { IngredientDefinition } from '../../core/IngredientRegistry';

export interface IngredientListProps<T extends IngredientDefinition> {
  readonly emptyMessage?: string;
  readonly itemsByCategory: ReadonlyMap<symbol, readonly T[]>;
  readonly noResultsMessage?: (query: string) => string;
  readonly renderCategoryHeader?: (category: symbol, isExpanded: boolean, onToggle: (category: symbol) => void) => JSX.Element;
  readonly renderItem: (item: T, category: symbol) => JSX.Element;
  readonly query: string;
}

export const IngredientList = memo(function IngredientList<T extends IngredientDefinition>({
  itemsByCategory,
  query,
  renderItem,
  renderCategoryHeader,
  emptyMessage = 'No ingredients available.',
  noResultsMessage = (term) => `No ingredients match search for "${term}".`,
}: IngredientListProps<T>): JSX.Element {
  const [expandedCategories, setExpandedCategories] = useState<Set<symbol>>(new Set());
  const theme = useThemeStore((state) => state.theme);

  const onCategoryToggle = useCallback((category: symbol) => {
    setExpandedCategories((current) => {
      if (current.has(category)) {
        return new Set<symbol>();
      }
      return new Set<symbol>([category]);
    });
  }, []);

  if (itemsByCategory.size === 0) {
    return (
      <EmptyView className="flex flex-grow flex-col items-center justify-center py-4">
        {query.trim() !== '' ? noResultsMessage(query) : emptyMessage}
      </EmptyView>
    );
  }

  const categoryEntries = Array.from(itemsByCategory.entries());

  return (
    <>
      {categoryEntries.map(([category, items], index) => {
        const isExpanded = query.trim() !== '' || expandedCategories.has(category);
        const categoryIdBase = `category-panel-${(category.description || '').replace(/\s+/g, '-').toLowerCase()}`;
        const buttonId = `${categoryIdBase}-button`;
        const panelId = `${categoryIdBase}-content`;

        const header = renderCategoryHeader ? (
          renderCategoryHeader(category, isExpanded, onCategoryToggle)
        ) : (
          <h3 className="contents">
            <button
              id={buttonId}
              aria-controls={panelId}
              aria-expanded={isExpanded}
              className={`flex h-12 w-full items-center justify-between p-3 text-left ${theme.itemBg} ${theme.textSecondary} ${theme.itemBgHover} focus:outline-none focus:ring-2 focus:ring-inset ${theme.accentRing}`}
              onClick={() => onCategoryToggle(category)}
            >
              <span className="font-medium">{category.description}</span>
              <ChevronRightIcon
                aria-hidden="true"
                className={`transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
                size={20}
              />
            </button>
          </h3>
        );

        const containerClasses = ['overflow-hidden rounded-md', theme.itemBorder, !isExpanded && index < categoryEntries.length - 1 ? 'mb-2' : '']
          .filter(Boolean)
          .join(' ');

        return (
          <div key={category.toString()} className={containerClasses}>
            {header}
            {isExpanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`max-h-64 overflow-y-auto p-3 ${theme.itemBgMuted}`}
                aria-hidden={!isExpanded}
              >
                <ul className="space-y-1.5" aria-labelledby={buttonId}>
                  {items.map((item) => renderItem(item, category))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});
