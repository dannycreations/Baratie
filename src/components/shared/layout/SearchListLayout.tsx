import { memo, useCallback } from 'react';

import { useOverflowScroll } from '../../../hooks/useOverflowScroll';
import { StringInput } from '../input/StringInput';

import type { ChangeEvent, JSX, ReactNode } from 'react';

interface SearchProps {
  readonly onQueryChange: (query: string) => void;
  readonly query: string;
  readonly ariaLabel: string;
  readonly classes?: string;
  readonly id: string;
  readonly placeholder?: string;
  readonly wrapperClasses?: string;
}

interface BaseSearchListProps {
  readonly containerClasses?: string;
  readonly listContent: ReactNode;
  readonly listId: string;
  readonly listWrapperClasses?: string;
}

type SearchEnabledProps = {
  readonly search: SearchProps;
  readonly showSearch?: true;
};

type SearchDisabledProps = {
  readonly search?: never;
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
            props.search.onQueryChange(event.target.value);
          },
          [props.search],
        )
      : undefined;

  const handleClear =
    props.showSearch !== false
      ? useCallback(() => {
          props.search.onQueryChange('');
        }, [props.search])
      : undefined;

  return (
    <div className={containerClasses}>
      {props.showSearch !== false && (
        <div className={props.search.wrapperClasses}>
          <StringInput
            id={props.search.id}
            type="search"
            aria-controls={listId}
            aria-label={props.search.ariaLabel}
            className={props.search.classes}
            placeholder={props.search.placeholder}
            value={props.search.query}
            onChange={handleChange!}
            showClearButton={true}
            onClear={handleClear}
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
