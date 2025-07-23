import { memo, useCallback } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { StringInput } from '../input/StringInput';

import type { ChangeEvent, JSX, ReactNode } from 'react';

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

  const handleChange =
    props.showSearch !== false
      ? useCallback(
          (event: ChangeEvent<HTMLInputElement>) => {
            props.onQueryChange(event.target.value);
          },
          [props.onQueryChange],
        )
      : undefined;

  return (
    <div className={containerClasses}>
      {props.showSearch !== false && (
        <div className={props.searchWrapperClasses}>
          <StringInput
            id={props.searchId}
            type="search"
            aria-controls={listId}
            aria-label={props.searchAriaLabel}
            className={props.searchClasses}
            placeholder={props.searchPlaceholder}
            value={props.query}
            onChange={handleChange!}
          />
        </div>
      )}
      <div
        ref={listScrollRef}
        id={listId}
        role="region"
        aria-live={props.showSearch !== false ? 'polite' : undefined}
        aria-relevant={props.showSearch !== false ? 'all' : undefined}
        className={listWrapperClasses}
      >
        {listContent}
      </div>
    </div>
  );
});
