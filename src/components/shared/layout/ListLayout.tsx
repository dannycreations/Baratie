import { clsx } from 'clsx';
import { memo, useCallback, useState } from 'react';

import { useSettingStore } from '../../../stores/useSettingStore';
import { HighlightText } from '../HighlightText';
import { ChevronRightIcon } from '../Icon';
import { Tooltip } from '../Tooltip';
import { EmptyView } from '../View';

import type { DragEvent, JSX, ReactNode } from 'react';

export interface GroupListItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
}

interface GroupListPropsBase {
  readonly query: string;
  readonly isItemDisabled?: (item: GroupListItem) => boolean;
  readonly onItemDragStart?: (event: DragEvent<HTMLElement>, item: GroupListItem) => void;
  readonly renderItemActions?: (item: GroupListItem) => ReactNode;
  readonly renderItemPrefix?: (item: GroupListItem) => ReactNode;
}

export interface GroupListProps extends GroupListPropsBase {
  readonly itemsByCategory: ReadonlyArray<readonly [string, ReadonlyArray<GroupListItem>]>;
  readonly emptyMessage?: string;
  readonly noResultsMessage?: (query: string) => string;
  readonly renderHeader?: (category: string, items: ReadonlyArray<GroupListItem>) => JSX.Element;
  readonly disabled?: boolean;
}

type GroupItemProps = GroupListPropsBase & {
  readonly item: GroupListItem;
};

type CategorySectionProps = GroupListPropsBase & {
  readonly category: string;
  readonly items: ReadonlyArray<GroupListItem>;
  readonly isExpanded: boolean;
  readonly onToggle: (category: string) => void;
  readonly renderHeader?: (category: string, items: ReadonlyArray<GroupListItem>) => JSX.Element;
  readonly disabled?: boolean;
};

const GroupItemLayout = memo<GroupItemProps>(({ item, isItemDisabled, renderItemPrefix, renderItemActions, onItemDragStart, query }) => {
  const isDisabled = isItemDisabled?.(item) ?? false;
  const isDraggable = !isDisabled && !!onItemDragStart;

  const nameClass = clsx('list-item-title list-item-interactive text-content-secondary', isDisabled && 'line-through');

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      if (!isDraggable) {
        return;
      }
      onItemDragStart?.(event, item);
    },
    [isDraggable, onItemDragStart, item],
  );

  const rightColumn = renderItemActions?.(item);

  return (
    <li data-item-id={item.id} draggable={isDraggable} onDragStart={handleDragStart}>
      <div className="list-item-container group">
        <div className="flex min-w-0 grow items-center gap-2">
          {renderItemPrefix?.(item)}
          <Tooltip
            className="min-w-0 flex-1"
            content={<HighlightText highlight={query} text={item.description} />}
            position="top"
            tooltipClasses="max-w-xs"
          >
            <h3 className={nameClass}>
              <HighlightText highlight={query} text={item.name} />
            </h3>
          </Tooltip>
        </div>
        {rightColumn && <div className="list-item-actions">{rightColumn}</div>}
      </div>
    </li>
  );
});

const CategorySection = memo<CategorySectionProps>((props) => {
  const {
    category,
    items,
    isExpanded,
    onToggle,
    query,
    isItemDisabled,
    renderItemActions,
    renderItemPrefix,
    onItemDragStart,
    renderHeader,
    disabled,
  } = props;

  const handleToggle = useCallback(() => {
    onToggle(category);
  }, [onToggle, category]);

  const header = (
    <button className="list-item-container outline-none hover:bg-surface-hover text-content-secondary" onClick={handleToggle} disabled={disabled}>
      {renderHeader ? renderHeader(category, items) : <span className="truncate font-medium">{category}</span>}
      <ChevronRightIcon
        className={clsx('transform transition-transform duration-200 ease-in-out', isExpanded ? 'rotate-90' : 'rotate-0')}
        size={20}
      />
    </button>
  );

  return (
    <section className="overflow-hidden rounded-md">
      {header}
      <div className={clsx('accordion-grid', isExpanded && 'expanded')}>
        <div className="accordion-content">
          <div className="bg-surface-muted p-2">
            <ul className="space-y-2">
              {items.map((item) => (
                <GroupItemLayout
                  key={item.id}
                  item={item}
                  query={query}
                  isItemDisabled={isItemDisabled}
                  renderItemActions={renderItemActions}
                  renderItemPrefix={renderItemPrefix}
                  onItemDragStart={onItemDragStart}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
});

const defaultNoResultsMessage = (term: string): string => `No items match search for "${term}".`;

export const GroupListLayout = memo<GroupListProps>(
  ({
    itemsByCategory,
    query,
    renderHeader,
    emptyMessage = 'No items available.',
    noResultsMessage = defaultNoResultsMessage,
    renderItemActions,
    renderItemPrefix,
    onItemDragStart,
    isItemDisabled,
    disabled,
  }): JSX.Element => {
    const multipleOpen = useSettingStore((state) => state.multipleOpen);
    const [expandedCategories, setExpandedCategories] = useState<ReadonlySet<string>>(() => new Set());
    const hasQuery = !!query.trim();

    const handleCategoryToggle = useCallback(
      (category: string): void => {
        setExpandedCategories((current) => {
          const newSet = new Set(current);
          const isExpanded = newSet.has(category);

          if (isExpanded) {
            newSet.delete(category);
          } else {
            if (!multipleOpen) {
              newSet.clear();
            }
            newSet.add(category);
          }
          return newSet;
        });
      },
      [multipleOpen],
    );

    if (itemsByCategory.length === 0) {
      const message = hasQuery ? noResultsMessage(query) : emptyMessage;
      return <EmptyView className="flex grow flex-col items-center justify-center py-3">{message}</EmptyView>;
    }

    return (
      <div className="space-y-2">
        {itemsByCategory.map(([category, items]) => {
          const isExpanded = hasQuery || expandedCategories.has(category);

          return (
            <CategorySection
              key={category}
              category={category}
              items={items}
              isExpanded={isExpanded}
              onToggle={handleCategoryToggle}
              query={query}
              renderHeader={renderHeader}
              isItemDisabled={isItemDisabled}
              onItemDragStart={onItemDragStart}
              renderItemActions={renderItemActions}
              renderItemPrefix={renderItemPrefix}
              disabled={disabled}
            />
          );
        })}
      </div>
    );
  },
);
