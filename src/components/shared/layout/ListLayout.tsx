import { memo, useCallback } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { StringInput } from '../input/StringInput';

import type { ChangeEvent, HTMLAttributes, JSX, ReactNode, RefObject } from 'react';

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

    const handleChange = search
      ? useCallback(
          (event: ChangeEvent<HTMLInputElement>): void => {
            search.onQueryChange(event.target.value);
          },
          [search?.onQueryChange],
        )
      : undefined;

    const handleClear = search
      ? useCallback((): void => {
          search.onQueryChange('');
        }, [search?.onQueryChange])
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
