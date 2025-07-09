import { memo } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { SearchInput } from '../input/SearchInput';

import type { JSX, ReactNode } from 'react';

interface BaseSearchListProps {
  readonly containerClassName?: string;
  readonly listContent: ReactNode;
  readonly listId: string;
  readonly listWrapperClassName?: string;
}

type SearchEnabledProps = {
  readonly onSearchChange: (term: string) => void;
  readonly searchAriaLabel: string;
  readonly searchClassName?: string;
  readonly searchId: string;
  readonly searchPlaceholder?: string;
  readonly searchTerm: string;
  readonly searchWrapperClassName?: string;
  readonly showSearch?: true;
};

type SearchDisabledProps = {
  readonly onSearchChange?: never;
  readonly searchAriaLabel?: never;
  readonly searchClassName?: never;
  readonly searchId?: never;
  readonly searchPlaceholder?: never;
  readonly searchTerm?: never;
  readonly searchWrapperClassName?: never;
  readonly showSearch: false;
};

type SearchListProps = BaseSearchListProps & (SearchEnabledProps | SearchDisabledProps);

export const SearchListLayout = memo(function SearchListLayout(props: SearchListProps): JSX.Element {
  const {
    containerClassName = 'flex h-full flex-col',
    listContent,
    listId,
    listWrapperClassName = 'flex-grow overflow-y-auto',
    showSearch = true,
  } = props;

  const listScrollRef = useOverflowScroll<HTMLDivElement>({ yClassName: 'pr-1' });

  return (
    <div className={containerClassName}>
      {showSearch ? (
        <div className={props.searchWrapperClassName}>
          <SearchInput
            id={props.searchId!}
            ariaControl={listId}
            ariaLabel={props.searchAriaLabel!}
            className={props.searchClassName}
            placeholder={props.searchPlaceholder}
            searchTerm={props.searchTerm!}
            onSearchChange={props.onSearchChange!}
          />
        </div>
      ) : null}
      <div
        ref={listScrollRef}
        id={listId}
        className={listWrapperClassName}
        role="region"
        aria-live={showSearch ? 'polite' : undefined}
        aria-relevant={showSearch ? 'all' : undefined}
      >
        {listContent}
      </div>
    </div>
  );
});
