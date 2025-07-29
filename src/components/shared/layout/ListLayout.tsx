import { memo, useCallback, useState } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { useThemeStore } from '../../../stores/useThemeStore';
import { HighlightText } from '../HighlightText';
import { ChevronRightIcon } from '../Icon';
import { StringInput } from '../input/StringInput';
import { Tooltip } from '../Tooltip';
import { EmptyView } from '../View';

import type { ChangeEvent, DragEvent, HTMLAttributes, JSX, ReactNode, RefObject } from 'react';

export interface GroupListItem {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
}

export interface GroupListProps {
  readonly itemsByCategory: ReadonlyArray<readonly [string, ReadonlyArray<GroupListItem>]>;
  readonly query: string;
  readonly emptyMessage?: string;
  readonly isItemDisabled?: (item: GroupListItem) => boolean;
  readonly noResultsMessage?: (query: string) => string;
  readonly onItemDragStart?: (event: DragEvent<HTMLElement>, item: GroupListItem) => void;
  readonly renderHeader?: (category: string, items: ReadonlyArray<GroupListItem>) => JSX.Element;
  readonly renderItemActions?: (item: GroupListItem) => ReactNode;
  readonly renderItemPrefix?: (item: GroupListItem) => ReactNode;
}

type GroupItemProps = Pick<GroupListProps, 'isItemDisabled' | 'onItemDragStart' | 'renderItemActions' | 'renderItemPrefix'> & {
  readonly item: GroupListItem;
  readonly query: string;
};

const GroupItemLayout = memo<GroupItemProps>(({ item, isItemDisabled, renderItemPrefix, renderItemActions, onItemDragStart, query }) => {
  const theme = useThemeStore((state) => state.theme);

  const isDisabled = isItemDisabled?.(item) ?? false;
  const nameClass = `
      truncate pr-2 text-sm transition-colors duration-150
      cursor-default group-hover:text-${theme.infoFg}
      ${isDisabled ? `text-${theme.contentDisabled} line-through` : `text-${theme.contentSecondary}`}
    `;

  const handleDragStart = (event: DragEvent<HTMLElement>): void => {
    if (isDisabled) {
      return;
    }
    onItemDragStart?.(event, item);
  };

  const leftColumn = (
    <div className="flex min-w-0 items-center gap-2">
      {renderItemPrefix?.(item)}
      <Tooltip
        className="min-w-0 flex-1"
        content={<HighlightText highlight={query} text={item.description} />}
        position="top"
        tooltipClasses="max-w-xs"
      >
        <p className={nameClass}>
          <HighlightText highlight={query} text={item.name} />
        </p>
      </Tooltip>
    </div>
  );

  const rightColumn = renderItemActions?.(item);

  return (
    <li data-item-id={item.id} draggable={!isDisabled && !!onItemDragStart} onDragStart={handleDragStart}>
      <ItemListLayout
        className={`
            group h-12 rounded-md bg-${theme.surfaceTertiary} p-2
            transition-colors duration-150 hover:bg-${theme.surfaceMuted}
          `}
        leftContent={leftColumn}
        leftClasses="grow min-w-0"
        rightContent={rightColumn}
      />
    </li>
  );
});

export const GroupListLayout = memo<GroupListProps>(
  ({
    itemsByCategory,
    query,
    renderHeader,
    emptyMessage = 'No items available.',
    noResultsMessage = (term) => `No items match search for "${term}".`,
    renderItemActions,
    renderItemPrefix,
    onItemDragStart,
    isItemDisabled,
  }): JSX.Element => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const theme = useThemeStore((state) => state.theme);

    const handleCategoryToggle = useCallback((category: string): void => {
      setExpandedCategory((current) => (current === category ? null : category));
    }, []);

    if (itemsByCategory.length === 0) {
      return (
        <EmptyView className="flex grow flex-col items-center justify-center py-3">{query.trim() ? noResultsMessage(query) : emptyMessage}</EmptyView>
      );
    }

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
              className={`
                flex h-12 w-full items-center justify-between bg-${theme.surfaceTertiary} p-2
                text-left text-${theme.contentSecondary} outline-none hover:bg-${theme.surfaceHover}
              `}
              aria-controls={panelId}
              aria-expanded={isExpanded}
              onClick={() => handleCategoryToggle(category)}
            >
              {renderHeader ? renderHeader(category, items) : <p className="truncate font-medium">{category}</p>}
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
                <div className="section-expand-enter-active">
                  <div
                    id={panelId}
                    className={`max-h-64 overflow-y-auto bg-${theme.surfaceMuted} p-2 md:max-h-96`}
                    role="region"
                    aria-hidden={!isExpanded}
                    aria-labelledby={buttonId}
                  >
                    <ul aria-labelledby={buttonId} className="space-y-2">
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
              )}
            </div>
          );
        })}
      </>
    );
  },
);

interface ItemListLayoutProps extends HTMLAttributes<HTMLDivElement> {
  readonly leftContent: ReactNode;
  readonly leftClasses?: string;
  readonly rightContent?: ReactNode;
  readonly rightClasses?: string;
}

export const ItemListLayout = memo<ItemListLayoutProps>(
  ({ leftContent, rightContent, leftClasses, rightClasses, className, ...rest }): JSX.Element => {
    const containerClass = `flex w-full items-center justify-between ${className || ''}`.trim();
    const leftWrapClass = leftClasses || 'grow min-w-0';
    const rightWrapClass = rightClasses || 'flex shrink-0 items-center gap-1';

    return (
      <div className={containerClass} {...rest}>
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
  readonly ariaLabel: string;
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
  ({ containerClasses = 'flex h-full flex-col gap-2', listWrapperClasses = 'grow overflow-y-auto', listContent, listId, search }): JSX.Element => {
    const { ref: listScrollRef, className: overflowClasses } = useOverflowScroll<HTMLDivElement>({ yClasses: 'pr-1' });
    const finalClasses = `${listWrapperClasses} ${overflowClasses}`.trim();

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
              aria-controls={listId}
              aria-label={search.ariaLabel}
              placeholder={search.placeholder}
              showClearButton
              onChange={handleChange!}
              onClear={handleClear}
            />
          </div>
        )}
        <div
          ref={listScrollRef}
          id={listId}
          className={finalClasses}
          role="region"
          aria-live={search ? 'polite' : undefined}
          aria-relevant={search ? 'all' : undefined}
        >
          {listContent}
        </div>
      </div>
    );
  },
);
