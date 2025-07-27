import { memo, useCallback } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { StringInput } from '../input/StringInput';

import type { ChangeEvent, JSX, ReactNode, RefObject } from 'react';

interface SearchProps {
  readonly onQueryChange: (query: string) => void;
  readonly query: string;
  readonly ariaLabel: string;
  readonly classes?: string;
  readonly id: string;
  readonly placeholder?: string;
  readonly wrapperClasses?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
}

interface SearchListLayoutProps {
  readonly containerClasses?: string;
  readonly listContent: ReactNode;
  readonly listId: string;
  readonly listWrapperClasses?: string;
  readonly search?: SearchProps;
}

export const SearchListLayout = memo<SearchListLayoutProps>(
  ({ containerClasses = 'flex h-full flex-col', listContent, listId, listWrapperClasses = 'grow overflow-y-auto', search }): JSX.Element => {
    const listScrollRef = useOverflowScroll<HTMLDivElement>({ yClasses: 'pr-1' });

    const handleChange = search
      ? useCallback(
          (event: ChangeEvent<HTMLInputElement>) => {
            search.onQueryChange(event.target.value);
          },
          [search],
        )
      : undefined;

    const handleClear = search
      ? useCallback(() => {
          search.onQueryChange('');
        }, [search])
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
              className={search.classes}
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
          className={listWrapperClasses}
        >
          {listContent}
        </div>
      </div>
    );
  },
);
