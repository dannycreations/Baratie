import { memo } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { SearchInput } from '../input/SearchInput';

import type { JSX, ReactNode } from 'react';

interface BaseSearchListProps {
  readonly containerClasses?: string;
  readonly listContent: ReactNode;
  readonly listId: string;
  readonly listWrapperClasses?: string;
}

type SearchEnabledProps = {
  readonly onQueryChange: (query: string) => void;
  readonly query: string;
  readonly searchAriaLabel: string;
  readonly searchClasses?: string;
  readonly searchId: string;
  readonly searchPlaceholder?: string;
  readonly searchWrapperClasses?: string;
  readonly showSearch?: true;
};

type SearchDisabledProps = {
  readonly onQueryChange?: never;
  readonly query?: never;
  readonly searchAriaLabel?: never;
  readonly searchClasses?: never;
  readonly searchId?: never;
  readonly searchPlaceholder?: never;
  readonly searchWrapperClasses?: never;
  readonly showSearch: false;
};

type SearchListLayoutProps = BaseSearchListProps & (SearchEnabledProps | SearchDisabledProps);

export const SearchListLayout = memo<SearchListLayoutProps>((props): JSX.Element => {
  const { containerClasses = 'flex h-full flex-col', listContent, listId, listWrapperClasses = 'grow overflow-y-auto' } = props;
  const listScrollRef = useOverflowScroll<HTMLDivElement>({ yClasses: 'pr-1' });

  return (
    <div className={containerClasses}>
      {props.showSearch !== false && (
        <div className={props.searchWrapperClasses}>
          <SearchInput
            id={props.searchId}
            ariaControls={listId}
            ariaLabel={props.searchAriaLabel}
            className={props.searchClasses}
            placeholder={props.searchPlaceholder}
            query={props.query}
            onQueryChange={props.onQueryChange}
          />
        </div>
      )}
      <div
        ref={listScrollRef}
        id={listId}
        className={listWrapperClasses}
        role="region"
        aria-live={props.showSearch !== false ? 'polite' : undefined}
        aria-relevant={props.showSearch !== false ? 'all' : undefined}
      >
        {listContent}
      </div>
    </div>
  );
});
