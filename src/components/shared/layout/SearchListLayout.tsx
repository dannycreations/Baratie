import { memo, useCallback } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { StringInput } from '../input/StringInput';

import type { ChangeEvent, JSX, ReactNode, RefObject } from 'react';

interface SearchProps {
  readonly onQueryChange: (query: string) => void;
  readonly query: string;
  readonly ariaLabel: string;
  readonly id: string;
  readonly placeholder?: string;
  readonly wrapperClasses?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
}

interface SearchListLayoutProps {
  readonly containerClasses?: string;
  readonly listWrapperClasses?: string;
  readonly listContent: ReactNode;
  readonly listId: string;
  readonly search?: SearchProps;
}

export const SearchListLayout = memo<SearchListLayoutProps>(
  ({ containerClasses = 'flex h-full flex-col gap-2', listWrapperClasses = 'grow overflow-y-auto', listContent, listId, search }): JSX.Element => {
    const { ref: listScrollRef, className: overflowClasses } = useOverflowScroll<HTMLDivElement>({ yClasses: 'pr-1' });
    const finalClasses = `${listWrapperClasses} ${overflowClasses}`.trim();

    const handleChange = search
      ? useCallback(
          (event: ChangeEvent<HTMLInputElement>) => {
            search.onQueryChange(event.target.value);
          },
          [search?.onQueryChange],
        )
      : undefined;

    const handleClear = search
      ? useCallback(() => {
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
              aria-controls={listId}
              aria-label={search.ariaLabel}
              placeholder={search.placeholder}
              value={search.query}
              inputRef={search.inputRef}
              onChange={handleChange!}
              showClearButton
              onClear={handleClear}
            />
          </div>
        )}
        <div
          ref={listScrollRef}
          id={listId}
          role="region"
          aria-live={search ? 'polite' : undefined}
          aria-relevant={search ? 'all' : undefined}
          className={finalClasses}
        >
          {listContent}
        </div>
      </div>
    );
  },
);
