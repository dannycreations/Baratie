import { memo, useCallback, useMemo, useState } from 'react';

import { useOverflow } from '../../../hooks/useOverflow';
import { useSettingStore } from '../../../stores/useSettingStore';
import { useThemeStore } from '../../../stores/useThemeStore';
import { HighlightText } from '../HighlightText';
import { ChevronRightIcon } from '../Icon';
import { StringInput } from '../input/StringInput';
import { Tooltip } from '../Tooltip';
import { EmptyView } from '../View';

import type { ChangeEvent, DragEvent, JSX, ReactNode, RefObject } from 'react';

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
};

const GroupItemLayout = memo<GroupItemProps>(({ item, isItemDisabled, renderItemPrefix, renderItemActions, onItemDragStart, query }) => {
  const theme = useThemeStore((state) => state.theme);

  const isDisabled = isItemDisabled?.(item) ?? false;
  const isDraggable = !isDisabled && !!onItemDragStart;

  const nameClass = useMemo(
    () =>
      `block truncate pr-2 text-sm text-${theme.contentSecondary} transition-colors duration-150 cursor-default group-hover:text-${theme.infoFg} ${
        isDisabled ? 'line-through' : ''
      }`.trim(),
    [theme, isDisabled],
  );

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>): void => {
      if (!isDraggable) {
        return;
      }
      onItemDragStart?.(event, item);
    },
    [isDraggable, onItemDragStart, item],
  );

  const leftColumn = useMemo(
    () => (
      <div className="flex min-w-0 items-center gap-2">
        {renderItemPrefix?.(item)}
        <Tooltip
          className="min-w-0 flex-1"
          content={<HighlightText highlight={query} text={item.description} />}
          position="top"
          tooltipClasses="max-w-xs"
        >
          <h3 className={`${nameClass} outline-none`}>
            <HighlightText highlight={query} text={item.name} />
          </h3>
        </Tooltip>
      </div>
    ),
    [item, nameClass, query, renderItemPrefix],
  );

  const rightColumn = useMemo(() => renderItemActions?.(item), [item, renderItemActions]);

  return (
    <li data-item-id={item.id} draggable={isDraggable} onDragStart={handleDragStart}>
      <ItemListLayout
        className={`group h-12 p-2 rounded-md bg-${theme.surfaceTertiary} transition-colors duration-150 hover:bg-${theme.surfaceMuted}`}
        leftContent={leftColumn}
        rightContent={rightColumn}
      />
    </li>
  );
});

const CategorySection = memo<CategorySectionProps>((props) => {
  const { category, items, isExpanded, onToggle, query, isItemDisabled, renderItemActions, renderItemPrefix, onItemDragStart, renderHeader } = props;
  const theme = useThemeStore((state) => state.theme);

  const handleToggle = useCallback(() => {
    onToggle(category);
  }, [onToggle, category]);

  const header = (
    <button
      className={`flex h-12 w-full items-center justify-between p-2 text-${theme.contentSecondary} bg-${theme.surfaceTertiary} outline-none hover:bg-${theme.surfaceHover} focus-visible:ring-2 focus-visible:ring-${theme.ring}`}
      onClick={handleToggle}
    >
      {renderHeader ? renderHeader(category, items) : <p className="truncate font-medium">{category}</p>}
      <ChevronRightIcon className={`transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`} size={20} />
    </button>
  );

  return (
    <section className="overflow-hidden rounded-md">
      {header}
      <div className={`accordion-grid ${isExpanded ? 'expanded' : ''}`}>
        <div className="accordion-content">
          <div className={`p-2 bg-${theme.surfaceMuted}`}>
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
  }): JSX.Element => {
    const multipleOpen = useSettingStore((state) => state.multipleOpen);
    const [expandedCategories, setExpandedCategories] = useState<ReadonlySet<string>>(new Set());
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
      return (
        <EmptyView className="flex grow flex-col items-center justify-center py-3">{hasQuery ? noResultsMessage(query) : emptyMessage}</EmptyView>
      );
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
            />
          );
        })}
      </div>
    );
  },
);

interface ItemListLayoutProps {
  readonly leftContent: ReactNode;
  readonly leftClasses?: string;
  readonly rightContent?: ReactNode;
  readonly rightClasses?: string;
  readonly className?: string;
  readonly onDragEnter?: (event: DragEvent<HTMLDivElement>) => void;
  readonly onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
}

export const ItemListLayout = memo<ItemListLayoutProps>(
  ({ leftContent, rightContent, leftClasses, rightClasses, className, onDragEnter, onDragOver }): JSX.Element => {
    const containerClass = `flex w-full items-center justify-between ${className || ''}`.trim();
    const leftWrapClass = leftClasses || 'min-w-0 grow';
    const rightWrapClass = rightClasses || 'flex shrink-0 items-center gap-1';

    return (
      <div className={containerClass} onDragEnter={onDragEnter} onDragOver={onDragOver}>
        <div className={leftWrapClass}>{leftContent}</div>
        {rightContent && <div className={rightWrapClass}>{rightContent}</div>}
      </div>
    );
  },
);

interface SearchProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly id: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  readonly placeholder?: string;
  readonly wrapperClasses?: string;
}

interface SearchListLayoutProps {
  readonly listContent: ReactNode;
  readonly listId: string;
  readonly containerClasses?: string;
  readonly listWrapperClasses?: string;
  readonly search?: SearchProps;
}

export const SearchListLayout = memo<SearchListLayoutProps>(
  ({
    containerClasses = 'flex h-full flex-col gap-2 min-h-0',
    listWrapperClasses = 'grow overflow-y-auto',
    listContent,
    listId,
    search,
  }): JSX.Element => {
    const { ref: scrollRef, className: scrollClasses } = useOverflow<HTMLDivElement>();

    const onQueryChange = search?.onQueryChange;

    const handleChange = search
      ? useCallback(
          (event: ChangeEvent<HTMLInputElement>): void => {
            onQueryChange?.(event.target.value);
          },
          [onQueryChange],
        )
      : undefined;

    const handleClear = search
      ? useCallback((): void => {
          onQueryChange?.('');
        }, [onQueryChange])
      : undefined;

    return (
      <div className={containerClasses}>
        {search && (
          <div className={search.wrapperClasses}>
            <StringInput
              id={search.id}
              type="search"
              value={search.query}
              inputRef={search.inputRef}
              placeholder={search.placeholder}
              showClearButton
              onChange={handleChange!}
              onClear={handleClear}
            />
          </div>
        )}
        <div id={listId} ref={scrollRef} className={`${listWrapperClasses} ${scrollClasses}`.trim()}>
          {listContent}
        </div>
      </div>
    );
  },
);
